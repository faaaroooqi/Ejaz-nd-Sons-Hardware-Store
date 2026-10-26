-- =============================================================================
-- 24 · Fix brand record assignment in post_sale() and post_purchase()
--      (Fixes "invalid input syntax for type uuid" error when product has a brand)
-- =============================================================================

create or replace function public.post_sale(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_req_id  uuid;
  v_existing_sale  public.sales%rowtype;

  v_sale_date      date;
  v_customer_id    uuid;
  v_customer       public.customers%rowtype;
  v_customer_name  text;
  v_customer_phone text;

  v_inv_discount   numeric(14,2) := 0;
  v_add_charges    numeric(14,2) := 0;
  v_amount_paid    numeric(14,2) := 0;
  v_payment_method public.payment_method := 'cash';
  v_payment_account uuid;
  v_notes          text;

  v_items          jsonb;
  v_item           jsonb;
  v_variant_id     uuid;
  v_variant        public.product_variants%rowtype;
  v_product        public.products%rowtype;
  v_unit           public.units%rowtype;
  v_brand          public.brands%rowtype;
  v_cost           public.variant_costs%rowtype;

  v_qty            numeric(14,3);
  v_rate           numeric(14,2);
  v_default_rate   numeric(14,2);
  v_disc           numeric(14,2);
  v_line_total     numeric(14,2);
  v_net_unit_price numeric(14,4);

  v_subtotal       numeric(14,2) := 0;
  v_grand_total    numeric(14,2) := 0;
  v_balance_due    numeric(14,2) := 0;
  v_payment_status public.payment_status;

  v_sale_id        uuid;
  v_invoice_no     text;
  v_payment_id     uuid;
  v_receipt_no     text;
  v_line_no        integer := 0;
  v_avg_cost       numeric(14,4) := 0;
begin
  -- 1. Assert Permission & Date Guard
  perform private.assert_permission('sales.create');

  v_sale_date := coalesce((p_payload ->> 'sale_date')::date, private.business_today());
  perform private.assert_posting_date(v_sale_date, 'sales.backdate');

  -- 2. Idempotency Check
  if p_payload ? 'client_request_id' and (p_payload ->> 'client_request_id') is not null then
    v_client_req_id := (p_payload ->> 'client_request_id')::uuid;
    select * into v_existing_sale from public.sales where client_request_id = v_client_req_id;
    if found then
      return jsonb_build_object(
        'id', v_existing_sale.id,
        'invoice_no', v_existing_sale.invoice_no,
        'grand_total', v_existing_sale.grand_total,
        'balance_due', v_existing_sale.balance_due,
        'idempotent', true
      );
    end if;
  end if;

  -- 3. Customer Validation
  if p_payload ? 'customer_id' and (p_payload ->> 'customer_id') is not null then
    v_customer_id := (p_payload ->> 'customer_id')::uuid;
    select * into v_customer from public.customers where id = v_customer_id and is_active;
    if not found then
      perform private.raise_error('CUSTOMER_NOT_FOUND');
    end if;
    v_customer_name := v_customer.name;
    v_customer_phone := v_customer.phone;
  else
    -- Default to system Walk-in customer
    v_customer_id := '00000000-0000-0000-0000-000000000001'::uuid;
    v_customer_name := 'Walk-in Cash Customer';
  end if;

  -- Extract amounts
  v_inv_discount := coalesce((p_payload ->> 'discount_amount')::numeric, 0);
  v_add_charges  := coalesce((p_payload ->> 'additional_charges')::numeric, 0);
  v_amount_paid  := coalesce((p_payload ->> 'amount_paid')::numeric, 0);
  v_notes        := p_payload ->> 'notes';

  v_items := p_payload -> 'items';
  if v_items is null or jsonb_array_length(v_items) = 0 then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Invoice must contain at least one line item"}'::jsonb);
  end if;

  -- 4. Line Calculations & Subtotal
  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty  := (v_item ->> 'quantity')::numeric;
    v_rate := (v_item ->> 'rate')::numeric;
    v_disc := coalesce((v_item ->> 'discount_amount')::numeric, 0);

    if v_qty <= 0 or v_rate < 0 then
      perform private.raise_error('INVALID_LINE_ITEM');
    end if;

    v_line_total := private.round_money((v_qty * v_rate) - v_disc);
    if v_line_total < 0 then v_line_total := 0; end if;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  -- Calculate totals
  v_grand_total := private.round_money(v_subtotal - v_inv_discount + v_add_charges);
  if v_grand_total < 0 then v_grand_total := 0; end if;

  -- Walk-in validation
  if v_customer_id = '00000000-0000-0000-0000-000000000001'::uuid and v_amount_paid < v_grand_total then
    perform private.raise_error('WALKIN_MUST_BE_FULLY_PAID');
  end if;

  v_balance_due := v_grand_total - v_amount_paid;
  if v_balance_due < 0 then v_balance_due := 0; end if;

  if v_amount_paid >= v_grand_total then
    v_payment_status := 'paid';
  elsif v_amount_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'unpaid';
  end if;

  -- 5. Generate Invoice Number
  v_invoice_no := private.next_document_no('sale', v_sale_date);

  -- 6. Insert Sales Header
  insert into public.sales (
    invoice_no, sale_date, customer_id, customer_name_snapshot, customer_phone_snapshot,
    subtotal, discount_amount, additional_charges, grand_total, amount_paid, balance_due,
    payment_status, notes, client_request_id, created_by
  ) values (
    v_invoice_no, v_sale_date, v_customer_id, v_customer_name, v_customer_phone,
    v_subtotal, v_inv_discount, v_add_charges, v_grand_total, v_amount_paid, v_balance_due,
    v_payment_status, v_notes, v_client_req_id, auth.uid()
  ) returning id into v_sale_id;

  -- 7. Insert Line Items and Stock Movements
  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_line_no := i + 1;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty  := (v_item ->> 'quantity')::numeric;
    v_rate := (v_item ->> 'rate')::numeric;
    v_disc := coalesce((v_item ->> 'discount_amount')::numeric, 0);

    -- Load variant, product, unit, and cost
    select * into v_variant from public.product_variants where id = v_variant_id;
    select * into v_product from public.products where id = v_variant.product_id;
    select * into v_unit from public.units where id = v_product.unit_id;
    select * into v_brand from public.brands where id = v_product.brand_id;
    select average_cost into v_avg_cost from public.variant_costs where variant_id = v_variant_id;
    v_avg_cost := coalesce(v_avg_cost, 0);

    v_line_total := private.round_money((v_qty * v_rate) - v_disc);
    v_net_unit_price := case when v_qty > 0 then round(v_line_total / v_qty, 4) else v_rate end;

    insert into public.sale_items (
      sale_id, line_no, variant_id, sku_snapshot, product_name_snapshot, unit_code_snapshot, brand_name_snapshot,
      quantity, default_rate, rate, discount_amount, line_total, net_unit_price
    ) values (
      v_sale_id, v_line_no, v_variant_id, v_variant.sku, v_product.name, v_unit.code, v_brand.name,
      v_qty, v_variant.default_rate, v_rate, v_disc, v_line_total, v_net_unit_price
    );

    -- Create Outbound Stock Movement (reduces stock via trigger)
    insert into public.stock_movements (
      variant_id, movement_date, movement_type, quantity, unit_cost, balance_after,
      source_type, source_id, created_by
    ) values (
      v_variant_id, v_sale_date, 'sale', -v_qty, v_avg_cost, 0,
      'sale', v_sale_id, auth.uid()
    );
  end loop;

  -- 8. Customer Khata Posting (Debit for Grand Total)
  if v_customer_id <> '00000000-0000-0000-0000-000000000001'::uuid then
    insert into public.customer_ledger_entries (
      customer_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
    ) values (
      v_customer_id, v_sale_date, 'sale', 'Sales Invoice #' || v_invoice_no, v_invoice_no, v_grand_total, 0, 'sale', v_sale_id, auth.uid()
    );
  end if;

  -- 9. Record Payment if paid > 0
  if v_amount_paid > 0 then
    select id into v_payment_account from public.payment_accounts where account_type = 'cash' and is_active limit 1;
    v_receipt_no := private.next_document_no('customer_payment', v_sale_date);

    insert into public.customer_payments (
      receipt_no, payment_date, customer_id, direction, amount, payment_method, payment_account_id, sale_id, created_by
    ) values (
      v_receipt_no, v_sale_date, v_customer_id, 'in', v_amount_paid, 'cash', v_payment_account, v_sale_id, auth.uid()
    ) returning id into v_payment_id;

    insert into public.customer_payment_allocations (payment_id, sale_id, amount)
    values (v_payment_id, v_sale_id, v_amount_paid);

    -- Customer Khata Payment Credit
    if v_customer_id <> '00000000-0000-0000-0000-000000000001'::uuid then
      insert into public.customer_ledger_entries (
        customer_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
      ) values (
        v_customer_id, v_sale_date, 'payment', 'Payment received for Invoice #' || v_invoice_no, v_receipt_no, 0, v_amount_paid, 'payment', v_payment_id, auth.uid()
      );
    end if;
  end if;

  -- 10. Audit Log
  perform private.log_activity('sale.created', 'sale', v_sale_id,
    'Sales Invoice ' || v_invoice_no || ' posted (Rs. ' || v_grand_total || ') to ' || v_customer_name,
    null, jsonb_build_object('invoice_no', v_invoice_no, 'grand_total', v_grand_total));

  return jsonb_build_object(
    'id', v_sale_id,
    'invoice_no', v_invoice_no,
    'grand_total', v_grand_total,
    'balance_due', v_balance_due,
    'payment_status', v_payment_status
  );
end;
$$;

create or replace function public.post_purchase(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_req_id     uuid;
  v_existing_pur      public.purchases%rowtype;

  v_purchase_date     date;
  v_supplier_id       uuid;
  v_supplier          public.suppliers%rowtype;
  v_supplier_name     text;
  v_supplier_inv_no   text;

  v_inv_discount      numeric(14,2) := 0;
  v_freight_charges   numeric(14,2) := 0;
  v_other_charges     numeric(14,2) := 0;
  v_amount_paid       numeric(14,2) := 0;
  v_payment_method    public.payment_method := 'cash';
  v_payment_account   uuid;
  v_notes             text;

  v_items             jsonb;
  v_item              jsonb;
  v_variant_id        uuid;
  v_variant           public.product_variants%rowtype;
  v_product           public.products%rowtype;
  v_unit              public.units%rowtype;
  v_brand             public.brands%rowtype;

  v_qty               numeric(14,3);
  v_unit_cost         numeric(14,4);
  v_disc              numeric(14,2);
  v_line_total        numeric(14,2);
  v_landed_cost       numeric(14,4);

  v_subtotal          numeric(14,2) := 0;
  v_grand_total       numeric(14,2) := 0;
  v_balance_due       numeric(14,2) := 0;
  v_payment_status    public.payment_status;

  v_purchase_id       uuid;
  v_bill_no           text;
  v_payment_id        uuid;
  v_voucher_no        text;
  v_line_no           integer := 0;
  v_extra_per_unit    numeric(14,4) := 0;
  v_total_qty         numeric(14,3) := 0;
begin
  -- 1. Assert Permission & Date Guard
  perform private.assert_permission('purchases.create');

  v_purchase_date := coalesce((p_payload ->> 'purchase_date')::date, private.business_today());
  perform private.assert_posting_date(v_purchase_date, 'purchases.backdate');

  -- 2. Idempotency Check
  if p_payload ? 'client_request_id' and (p_payload ->> 'client_request_id') is not null then
    v_client_req_id := (p_payload ->> 'client_request_id')::uuid;
    select * into v_existing_pur from public.purchases where client_request_id = v_client_req_id;
    if found then
      return jsonb_build_object(
        'id', v_existing_pur.id,
        'bill_no', v_existing_pur.bill_no,
        'purchase_no', v_existing_pur.bill_no,
        'grand_total', v_existing_pur.grand_total,
        'balance_due', v_existing_pur.balance_due,
        'idempotent', true
      );
    end if;
  end if;

  -- 3. Supplier Validation
  v_supplier_id := (p_payload ->> 'supplier_id')::uuid;
  if v_supplier_id is null then
    perform private.raise_error('SUPPLIER_REQUIRED');
  end if;

  select * into v_supplier from public.suppliers where id = v_supplier_id and is_active;
  if not found then
    perform private.raise_error('SUPPLIER_NOT_FOUND');
  end if;
  v_supplier_name := coalesce(v_supplier.company_name, v_supplier.name);
  v_supplier_inv_no := p_payload ->> 'supplier_invoice_no';

  -- Extract amounts
  v_inv_discount    := coalesce((p_payload ->> 'discount_amount')::numeric, 0);
  v_freight_charges := coalesce((p_payload ->> 'freight_charges')::numeric, (p_payload ->> 'additional_charges')::numeric, 0);
  v_other_charges   := coalesce((p_payload ->> 'other_charges')::numeric, 0);
  v_amount_paid     := coalesce((p_payload ->> 'amount_paid')::numeric, 0);
  v_notes           := p_payload ->> 'notes';

  v_items := p_payload -> 'items';
  if v_items is null or jsonb_array_length(v_items) = 0 then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Purchase bill must contain at least one item"}'::jsonb);
  end if;

  -- Calculate subtotal and total quantity for landed cost distribution
  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_qty       := (v_item ->> 'quantity')::numeric;
    v_unit_cost := coalesce((v_item ->> 'unit_cost')::numeric, (v_item ->> 'purchase_rate')::numeric, 0);
    v_disc      := coalesce((v_item ->> 'discount_amount')::numeric, 0);

    if v_qty <= 0 or v_unit_cost < 0 then
      perform private.raise_error('INVALID_LINE_ITEM');
    end if;

    v_line_total := private.round_money((v_qty * v_unit_cost) - v_disc);
    if v_line_total < 0 then v_line_total := 0; end if;
    v_subtotal  := v_subtotal + v_line_total;
    v_total_qty := v_total_qty + v_qty;
  end loop;

  v_grand_total := private.round_money(v_subtotal - v_inv_discount + v_freight_charges + v_other_charges);
  if v_grand_total < 0 then v_grand_total := 0; end if;

  v_balance_due := v_grand_total - v_amount_paid;
  if v_balance_due < 0 then v_balance_due := 0; end if;

  if v_amount_paid >= v_grand_total then
    v_payment_status := 'paid';
  elsif v_amount_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'unpaid';
  end if;

  -- Freight landed cost per unit addition
  if v_total_qty > 0 then
    v_extra_per_unit := round((v_freight_charges + v_other_charges - v_inv_discount) / v_total_qty, 4);
  end if;

  -- 5. Generate Bill Number
  v_bill_no := private.next_document_no('purchase', v_purchase_date);

  -- 6. Insert Purchase Header
  insert into public.purchases (
    bill_no, purchase_date, supplier_id, supplier_name_snapshot, supplier_invoice_no,
    subtotal, discount_amount, freight_charges, other_charges, grand_total, amount_paid, balance_due,
    payment_status, notes, client_request_id, created_by
  ) values (
    v_bill_no, v_purchase_date, v_supplier_id, v_supplier_name, v_supplier_inv_no,
    v_subtotal, v_inv_discount, v_freight_charges, v_other_charges, v_grand_total, v_amount_paid, v_balance_due,
    v_payment_status, v_notes, v_client_req_id, auth.uid()
  ) returning id into v_purchase_id;

  -- 7. Insert Purchase Items and Stock Movements
  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_line_no := i + 1;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty       := (v_item ->> 'quantity')::numeric;
    v_unit_cost := coalesce((v_item ->> 'unit_cost')::numeric, (v_item ->> 'purchase_rate')::numeric, 0);
    v_disc      := coalesce((v_item ->> 'discount_amount')::numeric, 0);

    select * into v_variant from public.product_variants where id = v_variant_id;
    select * into v_product from public.products where id = v_variant.product_id;
    select * into v_unit from public.units where id = v_product.unit_id;
    select * into v_brand from public.brands where id = v_product.brand_id;

    v_line_total := private.round_money((v_qty * v_unit_cost) - v_disc);
    v_landed_cost := round(v_unit_cost + v_extra_per_unit, 4);
    if v_landed_cost < 0 then v_landed_cost := 0; end if;

    insert into public.purchase_items (
      purchase_id, line_no, variant_id, sku_snapshot, product_name_snapshot, unit_code_snapshot, brand_name_snapshot,
      quantity, unit_cost, discount_amount, landed_cost_per_unit, line_total
    ) values (
      v_purchase_id, v_line_no, v_variant_id, v_variant.sku, v_product.name, v_unit.code, v_brand.name,
      v_qty, v_unit_cost, v_disc, v_landed_cost, v_line_total
    );

    -- Inbound Stock Movement (increases stock & updates weighted average cost)
    insert into public.stock_movements (
      variant_id, movement_date, movement_type, quantity, unit_cost, balance_after,
      source_type, source_id, created_by
    ) values (
      v_variant_id, v_purchase_date, 'purchase', v_qty, v_landed_cost, 0,
      'purchase', v_purchase_id, auth.uid()
    );
  end loop;

  -- 8. Supplier Khata Posting (Credit for Grand Total - Dena increases)
  insert into public.supplier_ledger_entries (
    supplier_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
  ) values (
    v_supplier_id, v_purchase_date, 'purchase', 'Purchase Bill #' || v_bill_no, v_bill_no, 0, v_grand_total, 'purchase', v_purchase_id, auth.uid()
  );

  -- 9. Record Payment if amount_paid > 0
  if v_amount_paid > 0 then
    select id into v_payment_account from public.payment_accounts where account_type = 'cash' and is_active limit 1;
    v_voucher_no := private.next_document_no('supplier_payment', v_purchase_date);

    insert into public.supplier_payments (
      voucher_no, payment_date, supplier_id, direction, amount, payment_method, payment_account_id, purchase_id, created_by
    ) values (
      v_voucher_no, v_purchase_date, v_supplier_id, 'out', v_amount_paid, 'cash', v_payment_account, v_purchase_id, auth.uid()
    ) returning id into v_payment_id;

    insert into public.supplier_payment_allocations (payment_id, purchase_id, amount)
    values (v_payment_id, v_purchase_id, v_amount_paid);

    -- Supplier Khata Payment Debit (Dena decreases)
    insert into public.supplier_ledger_entries (
      supplier_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
    ) values (
      v_supplier_id, v_purchase_date, 'payment', 'Payment made for Bill #' || v_bill_no, v_voucher_no, v_amount_paid, 0, 'supplier_payment', v_payment_id, auth.uid()
    );
  end if;

  -- 10. Audit Log
  perform private.log_activity('purchase.created', 'purchase', v_purchase_id,
    'Purchase Bill ' || v_bill_no || ' posted (Rs. ' || v_grand_total || ') from ' || v_supplier_name,
    null, jsonb_build_object('bill_no', v_bill_no, 'grand_total', v_grand_total));

  return jsonb_build_object(
    'id', v_purchase_id,
    'bill_no', v_bill_no,
    'purchase_no', v_bill_no,
    'grand_total', v_grand_total,
    'balance_due', v_balance_due,
    'payment_status', v_payment_status
  );
end;
$$;

grant execute on function public.post_sale(jsonb) to authenticated;
grant execute on function public.post_purchase(jsonb) to authenticated;
