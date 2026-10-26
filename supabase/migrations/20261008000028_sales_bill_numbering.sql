-- =============================================================================
-- 28 · Sales bill numbering (1, 2, 3 …), bilty number, laborer name
-- =============================================================================
-- * bill_number  : system-generated integer, never typed by a user, never reused.
-- * bilty_number : transport / delivery bilty reference typed by the user.
-- * laborer_name : worker associated with the delivery, typed by the user.
-- * invoice_no   : UNCHANGED. Remains the internal document reference
--                  (INV-<FY>-<seq>); existing values are preserved.
--
-- Existing rows are backfilled deterministically (created_at, id) and the
-- counter is seeded so the next new bill continues after the highest number.
-- Nothing is deleted or reset.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Counter: a non-yearly document type that never resets
-- -----------------------------------------------------------------------------
insert into public.document_types (code, prefix, description, yearly, pad_length)
values ('bill_number', 'BILL', 'Sales bill number (plain integer, never resets)', false, 3)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Additive columns (nullable first so existing rows can be backfilled)
-- -----------------------------------------------------------------------------
alter table public.sales
  add column if not exists bill_number  bigint,
  add column if not exists bilty_number text,
  add column if not exists laborer_name text;

alter table public.sales
  add constraint sales_bilty_number_len check (bilty_number is null or length(btrim(bilty_number)) between 1 and 50),
  add constraint sales_laborer_name_len check (laborer_name is null or length(btrim(laborer_name)) between 1 and 100);

-- -----------------------------------------------------------------------------
-- 3. Backfill existing bills (cancelled ones included – a number is permanent)
-- -----------------------------------------------------------------------------
do $$
declare
  v_base bigint;
  v_next bigint;
begin
  select coalesce(max(bill_number), 0) into v_base from public.sales;

  with ordered as (
    select id, v_base + row_number() over (order by created_at, id) as rn
    from public.sales
    where bill_number is null
  )
  update public.sales s
     set bill_number = o.rn
    from ordered o
   where s.id = o.id;

  select coalesce(max(bill_number), 0) + 1 into v_next from public.sales;

  insert into public.document_sequences (doc_type, fiscal_year, next_value)
  values ('bill_number', 0, v_next)
  on conflict (doc_type, fiscal_year) do update
    set next_value = greatest(public.document_sequences.next_value, excluded.next_value),
        updated_at = now();
end $$;

alter table public.sales alter column bill_number set not null;
alter table public.sales add constraint sales_bill_number_key unique (bill_number);
alter table public.sales add constraint sales_bill_number_positive check (bill_number > 0);

-- -----------------------------------------------------------------------------
-- 4. Generator. Same row-lock pattern as private.next_document_no():
--    the UPDATE holds the counter row until the caller's transaction ends, so
--    concurrent postings are serialised, numbers are unique, and a rolled-back
--    posting consumes nothing (no gaps from failures).
--    The GREATEST() makes it self-healing: even if the counter row is ever
--    truncated/reset, it can never hand out a number <= an existing bill
--    (cancelled bills stay in `sales`, so their numbers are never reused).
-- -----------------------------------------------------------------------------
create or replace function private.next_bill_number()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value bigint;
begin
  insert into public.document_sequences (doc_type, fiscal_year)
  values ('bill_number', 0)
  on conflict (doc_type, fiscal_year) do nothing;

  update public.document_sequences
     set next_value = greatest(next_value, (select coalesce(max(bill_number), 0) + 1 from public.sales)) + 1,
         updated_at = now()
   where doc_type = 'bill_number' and fiscal_year = 0
  returning next_value - 1 into v_value;

  return v_value;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Guards
-- -----------------------------------------------------------------------------
-- bill_number can never change once assigned, whatever role/path is used.
create or replace function private.guard_sale_bill_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.bill_number is distinct from old.bill_number then
    perform private.raise_error('BILL_NUMBER_IMMUTABLE', jsonb_build_object('sale_id', old.id, 'bill_number', old.bill_number));
  end if;
  return new;
end;
$$;

create trigger sales_bill_number_immutable
  before update on public.sales
  for each row execute function private.guard_sale_bill_number();

-- Sales headers are permanent records (cancel instead of delete).
create trigger sales_no_delete
  before delete on public.sales
  for each row execute function private.prevent_modification();

-- Migration 27 granted table-wide UPDATE/DELETE on sales to `authenticated`.
-- Narrow it: clients may only edit the descriptive fields. Money/status/number
-- columns change exclusively through SECURITY DEFINER RPCs.
revoke update, delete on public.sales from authenticated;
grant update (notes, bilty_number, laborer_name) on public.sales to authenticated;

-- Edits to the descriptive fields are audited.
create trigger sales_detail_audit
  after update of notes, bilty_number, laborer_name on public.sales
  for each row execute function private.audit_row_change('sale', 'invoice_no');

create index if not exists sales_bilty_number_idx on public.sales (bilty_number) where bilty_number is not null;

-- -----------------------------------------------------------------------------
-- 6. post_sale(): same atomic workflow as migration 24, plus the new fields.
--    Only additions are marked  -- [28]
-- -----------------------------------------------------------------------------
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
  v_payment_account uuid;
  v_notes          text;
  v_bilty_number   text;                 -- [28]
  v_laborer_name   text;                 -- [28]
  v_bill_number    bigint;               -- [28]

  v_items          jsonb;
  v_item           jsonb;
  v_variant_id     uuid;
  v_variant        public.product_variants%rowtype;
  v_product        public.products%rowtype;
  v_unit           public.units%rowtype;
  v_brand          public.brands%rowtype;

  v_qty            numeric(14,3);
  v_rate           numeric(14,2);
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
        'bill_number', v_existing_sale.bill_number,           -- [28]
        'bilty_number', v_existing_sale.bilty_number,         -- [28]
        'laborer_name', v_existing_sale.laborer_name,         -- [28]
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

  -- [28] Delivery references (user-entered, optional). bill_number is NEVER read from the payload.
  v_bilty_number := nullif(btrim(p_payload ->> 'bilty_number'), '');
  v_laborer_name := nullif(btrim(p_payload ->> 'laborer_name'), '');
  if length(v_bilty_number) > 50 or length(v_laborer_name) > 100 then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Bilty number (max 50) or laborer name (max 100) is too long"}'::jsonb);
  end if;

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

  -- 5. Generate Invoice Number (unchanged) and Bill Number [28]
  v_invoice_no  := private.next_document_no('sale', v_sale_date);
  v_bill_number := private.next_bill_number();

  -- 6. Insert Sales Header
  insert into public.sales (
    invoice_no, bill_number, bilty_number, laborer_name,
    sale_date, customer_id, customer_name_snapshot, customer_phone_snapshot,
    subtotal, discount_amount, additional_charges, grand_total, amount_paid, balance_due,
    payment_status, notes, client_request_id, created_by
  ) values (
    v_invoice_no, v_bill_number, v_bilty_number, v_laborer_name,
    v_sale_date, v_customer_id, v_customer_name, v_customer_phone,
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
      v_customer_id, v_sale_date, 'sale',
      'Sales Bill #' || v_bill_number || ' (' || v_invoice_no || ')',     -- [28]
      v_invoice_no, v_grand_total, 0, 'sale', v_sale_id, auth.uid()
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
        v_customer_id, v_sale_date, 'payment',
        'Payment received for Bill #' || v_bill_number || ' (' || v_invoice_no || ')',   -- [28]
        v_receipt_no, 0, v_amount_paid, 'payment', v_payment_id, auth.uid()
      );
    end if;
  end if;

  -- 10. Audit Log
  perform private.log_activity('sale.created', 'sale', v_sale_id,
    'Sales Bill #' || v_bill_number || ' (' || v_invoice_no || ') posted (Rs. ' || v_grand_total || ') to ' || v_customer_name,
    null,
    jsonb_build_object('invoice_no', v_invoice_no, 'bill_number', v_bill_number, 'bilty_number', v_bilty_number,
                       'laborer_name', v_laborer_name, 'grand_total', v_grand_total));

  return jsonb_build_object(
    'id', v_sale_id,
    'invoice_no', v_invoice_no,
    'bill_number', v_bill_number,
    'bilty_number', v_bilty_number,
    'laborer_name', v_laborer_name,
    'grand_total', v_grand_total,
    'balance_due', v_balance_due,
    'payment_status', v_payment_status
  );
end;
$$;

grant execute on function public.post_sale(jsonb) to authenticated;
