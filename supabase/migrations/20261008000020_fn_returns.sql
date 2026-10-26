-- =============================================================================
-- 20 · Sales & Purchase Return RPCs: post_sales_return(), post_purchase_return()
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sales Return RPC
-- -----------------------------------------------------------------------------
create or replace function public.post_sales_return(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_return_date      date;
  v_sale_id          uuid;
  v_sale             public.sales%rowtype;
  v_customer_id      uuid;
  v_customer_name    text;

  v_items            jsonb;
  v_item             jsonb;
  v_sale_item_id     uuid;
  v_sale_item        public.sale_items%rowtype;
  v_variant_id       uuid;
  v_qty              numeric(14,3);
  v_rate             numeric(14,2);
  v_line_total       numeric(14,2);
  v_subtotal         numeric(14,2) := 0;
  v_refund_amount    numeric(14,2) := 0;
  v_payment_account  uuid;
  v_notes            text;

  v_return_no        text;
  v_return_id        uuid;
  v_avg_cost         numeric(14,4);
begin
  perform private.assert_permission('sales_returns.create');

  v_return_date := coalesce((p_payload ->> 'return_date')::date, private.business_today());
  perform private.assert_posting_date(v_return_date, 'sales_returns.backdate');

  v_sale_id := (p_payload ->> 'sale_id')::uuid;
  select * into v_sale from public.sales where id = v_sale_id;
  if not found then perform private.raise_error('SALE_NOT_FOUND'); end if;

  v_customer_id   := v_sale.customer_id;
  v_customer_name := v_sale.customer_name_snapshot;
  v_refund_amount := coalesce((p_payload ->> 'refund_amount')::numeric, 0);
  v_payment_account := (p_payload ->> 'payment_account_id')::uuid;
  v_notes         := p_payload ->> 'notes';

  v_items := p_payload -> 'items';
  if v_items is null or jsonb_array_length(v_items) = 0 then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Return must contain items"}'::jsonb);
  end if;

  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_qty  := (v_item ->> 'quantity')::numeric;
    v_rate := (v_item ->> 'rate')::numeric;

    if v_qty <= 0 then perform private.raise_error('INVALID_LINE_ITEM'); end if;

    v_line_total := private.round_money(v_qty * v_rate);
    v_subtotal   := v_subtotal + v_line_total;
  end loop;

  v_return_no := private.next_document_no('sales_return', v_return_date);

  insert into public.sales_returns (
    return_no, return_date, sale_id, customer_id, customer_name_snapshot,
    subtotal, refund_amount, payment_account_id, notes, created_by
  ) values (
    v_return_no, v_return_date, v_sale_id, v_customer_id, v_customer_name,
    v_subtotal, v_refund_amount, v_payment_account, v_notes, auth.uid()
  ) returning id into v_return_id;

  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_sale_item_id := (v_item ->> 'sale_item_id')::uuid;
    v_variant_id   := (v_item ->> 'variant_id')::uuid;
    v_qty          := (v_item ->> 'quantity')::numeric;
    v_rate         := (v_item ->> 'rate')::numeric;
    v_line_total   := private.round_money(v_qty * v_rate);

    insert into public.sale_return_items (
      return_id, sale_item_id, variant_id, quantity, rate, line_total
    ) values (
      v_return_id, v_sale_item_id, v_variant_id, v_qty, v_rate, v_line_total
    );

    if v_sale_item_id is not null then
      update public.sale_items set returned_quantity = returned_quantity + v_qty where id = v_sale_item_id;
    end if;

    -- Inbound Stock Restock Movement (adds stock back)
    select average_cost into v_avg_cost from public.variant_costs where variant_id = v_variant_id;
    v_avg_cost := coalesce(v_avg_cost, 0);

    insert into public.stock_movements (
      variant_id, movement_date, movement_type, quantity, unit_cost, balance_after,
      source_type, source_id, created_by
    ) values (
      v_variant_id, v_return_date, 'sales_return', v_qty, v_avg_cost, 0,
      'sales_return', v_return_id, auth.uid()
    );
  end loop;

  update public.sales set amount_returned = amount_returned + v_subtotal where id = v_sale_id;

  -- Customer Khata Credit Entry (reduces customer balance / Lena)
  if v_customer_id <> '00000000-0000-0000-0000-000000000001'::uuid then
    insert into public.customer_ledger_entries (
      customer_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
    ) values (
      v_customer_id, v_return_date, 'sales_return', 'Sales Return Note #' || v_return_no, v_return_no, 0, v_subtotal, 'sales_return', v_return_id, auth.uid()
    );
  end if;

  perform private.log_activity('sales_return.created', 'sales_return', v_return_id,
    'Sales Return ' || v_return_no || ' (Rs. ' || v_subtotal || ') posted for ' || v_customer_name,
    null, jsonb_build_object('return_no', v_return_no, 'subtotal', v_subtotal));

  return jsonb_build_object('id', v_return_id, 'return_no', v_return_no, 'subtotal', v_subtotal);
end;
$$;

-- -----------------------------------------------------------------------------
-- Purchase Return RPC
-- -----------------------------------------------------------------------------
create or replace function public.post_purchase_return(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_return_date      date;
  v_purchase_id      uuid;
  v_purchase         public.purchases%rowtype;
  v_supplier_id      uuid;
  v_supplier_name    text;

  v_items            jsonb;
  v_item             jsonb;
  v_pur_item_id      uuid;
  v_variant_id       uuid;
  v_qty              numeric(14,3);
  v_cost             numeric(14,4);
  v_line_total       numeric(14,2);
  v_subtotal         numeric(14,2) := 0;
  v_refund_amount    numeric(14,2) := 0;
  v_payment_account  uuid;
  v_notes            text;

  v_return_no        text;
  v_return_id        uuid;
begin
  perform private.assert_permission('purchase_returns.create');

  v_return_date := coalesce((p_payload ->> 'return_date')::date, private.business_today());
  perform private.assert_posting_date(v_return_date, 'purchase_returns.backdate');

  v_purchase_id := (p_payload ->> 'purchase_id')::uuid;
  select * into v_purchase from public.purchases where id = v_purchase_id;
  if not found then perform private.raise_error('PURCHASE_NOT_FOUND'); end if;

  v_supplier_id   := v_purchase.supplier_id;
  v_supplier_name := v_purchase.supplier_name_snapshot;
  v_refund_amount := coalesce((p_payload ->> 'refund_amount')::numeric, 0);
  v_payment_account := (p_payload ->> 'payment_account_id')::uuid;
  v_notes         := p_payload ->> 'notes';

  v_items := p_payload -> 'items';
  if v_items is null or jsonb_array_length(v_items) = 0 then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Return must contain items"}'::jsonb);
  end if;

  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_qty  := (v_item ->> 'quantity')::numeric;
    v_cost := (v_item ->> 'unit_cost')::numeric;

    if v_qty <= 0 then perform private.raise_error('INVALID_LINE_ITEM'); end if;

    v_line_total := private.round_money(v_qty * v_cost);
    v_subtotal   := v_subtotal + v_line_total;
  end loop;

  v_return_no := private.next_document_no('purchase_return', v_return_date);

  insert into public.purchase_returns (
    return_no, return_date, purchase_id, supplier_id, supplier_name_snapshot,
    subtotal, refund_amount, payment_account_id, notes, created_by
  ) values (
    v_return_no, v_return_date, v_purchase_id, v_supplier_id, v_supplier_name,
    v_subtotal, v_refund_amount, v_payment_account, v_notes, auth.uid()
  ) returning id into v_return_id;

  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_pur_item_id := (v_item ->> 'purchase_item_id')::uuid;
    v_variant_id  := (v_item ->> 'variant_id')::uuid;
    v_qty         := (v_item ->> 'quantity')::numeric;
    v_cost        := (v_item ->> 'unit_cost')::numeric;
    v_line_total  := private.round_money(v_qty * v_cost);

    insert into public.purchase_return_items (
      return_id, purchase_item_id, variant_id, quantity, unit_cost, line_total
    ) values (
      v_return_id, v_pur_item_id, v_variant_id, v_qty, v_cost, v_line_total
    );

    if v_pur_item_id is not null then
      update public.purchase_items set returned_quantity = returned_quantity + v_qty where id = v_pur_item_id;
    end if;

    -- Outbound Stock Movement (reduces stock)
    insert into public.stock_movements (
      variant_id, movement_date, movement_type, quantity, unit_cost, balance_after,
      source_type, source_id, created_by
    ) values (
      v_variant_id, v_return_date, 'purchase_return', -v_qty, v_cost, 0,
      'purchase_return', v_return_id, auth.uid()
    );
  end loop;

  update public.purchases set amount_returned = amount_returned + v_subtotal where id = v_purchase_id;

  -- Supplier Khata Debit Entry (reduces supplier balance / Dena)
  insert into public.supplier_ledger_entries (
    supplier_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
  ) values (
    v_supplier_id, v_return_date, 'purchase_return', 'Debit Note #' || v_return_no, v_return_no, v_subtotal, 0, 'purchase_return', v_return_id, auth.uid()
  );

  perform private.log_activity('purchase_return.created', 'purchase_return', v_return_id,
    'Purchase Return ' || v_return_no || ' (Rs. ' || v_subtotal || ') posted to ' || v_supplier_name,
    null, jsonb_build_object('return_no', v_return_no, 'subtotal', v_subtotal));

  return jsonb_build_object('id', v_return_id, 'return_no', v_return_no, 'subtotal', v_subtotal);
end;
$$;

grant execute on function public.post_sales_return(jsonb) to authenticated;
grant execute on function public.post_purchase_return(jsonb) to authenticated;
