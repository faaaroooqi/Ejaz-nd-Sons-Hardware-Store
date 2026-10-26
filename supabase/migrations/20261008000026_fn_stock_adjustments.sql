-- =============================================================================
-- 26 · Atomic Stock Adjustment RPC: post_stock_adjustment()
-- =============================================================================

create or replace function public.post_stock_adjustment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_adjustment_date   date;
  v_reason            public.adjustment_reason;
  v_notes             text;

  v_items             jsonb;
  v_item              jsonb;
  v_variant_id        uuid;
  v_variant           public.product_variants%rowtype;
  v_current_stock     numeric(14,3);
  v_avg_cost          numeric(14,4);
  v_qty_change        numeric(14,3);
  v_counted_qty       numeric(14,3);

  v_adjustment_id     uuid;
  v_adj_item_id       uuid;
  v_adjustment_no     text;
begin
  -- 1. Assert Permission & Date Guard
  perform private.assert_permission('inventory.adjust');

  v_adjustment_date := coalesce((p_payload ->> 'adjustment_date')::date, private.business_today());
  perform private.assert_posting_date(v_adjustment_date, 'inventory.adjust');

  -- 2. Extract Reason & Notes
  v_reason := (p_payload ->> 'reason')::public.adjustment_reason;
  if v_reason is null then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Valid adjustment reason is required"}'::jsonb);
  end if;
  v_notes := p_payload ->> 'notes';

  v_items := p_payload -> 'items';
  if v_items is null or jsonb_array_length(v_items) = 0 then
    perform private.raise_error('INVALID_PAYLOAD', '{"message": "Adjustment must contain at least one item"}'::jsonb);
  end if;

  -- 3. Generate Adjustment Number
  v_adjustment_no := private.next_document_no('stock_adjustment', v_adjustment_date);

  -- 4. Insert Adjustment Header
  insert into public.stock_adjustments (
    adjustment_no, adjustment_date, reason, notes, status, created_by
  ) values (
    v_adjustment_no, v_adjustment_date, v_reason, v_notes, 'posted', auth.uid()
  ) returning id into v_adjustment_id;

  -- 5. Insert Items & Stock Movements
  for i in 0 .. jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> i;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty_change := (v_item ->> 'qty_change')::numeric;

    if v_qty_change is null or v_qty_change = 0 then
      perform private.raise_error('INVALID_LINE_ITEM', '{"message": "Quantity change cannot be zero"}'::jsonb);
    end if;

    select * into v_variant from public.product_variants where id = v_variant_id;
    if not found then
      perform private.raise_error('VARIANT_NOT_FOUND', jsonb_build_object('variant_id', v_variant_id));
    end if;

    -- Get current system stock
    select quantity_on_hand into v_current_stock from public.stock_levels where variant_id = v_variant_id;
    v_current_stock := coalesce(v_current_stock, 0);

    -- Get average cost
    select average_cost into v_avg_cost from public.variant_costs where variant_id = v_variant_id;
    v_avg_cost := coalesce(v_avg_cost, 0);

    v_counted_qty := coalesce((v_item ->> 'counted_qty')::numeric, v_current_stock + v_qty_change);

    -- Insert Adjustment Item
    insert into public.stock_adjustment_items (
      adjustment_id, variant_id, system_qty, counted_qty, qty_change, unit_cost
    ) values (
      v_adjustment_id, v_variant_id, v_current_stock, v_counted_qty, v_qty_change, v_avg_cost
    ) returning id into v_adj_item_id;

    -- Insert Stock Movement (Triggers maintain_stock_levels() to update stock_levels)
    insert into public.stock_movements (
      variant_id, movement_date, movement_type, quantity, unit_cost, balance_after,
      source_type, source_id, source_line_id, created_by
    ) values (
      v_variant_id, v_adjustment_date, 'adjustment', v_qty_change, v_avg_cost, (v_current_stock + v_qty_change),
      'adjustment', v_adjustment_id, v_adj_item_id, auth.uid()
    );
  end loop;

  -- 6. Audit Log
  perform private.log_activity('inventory.adjusted', 'stock_adjustment', v_adjustment_id,
    'Stock adjustment ' || v_adjustment_no || ' posted (' || v_reason::text || ')',
    null, jsonb_build_object('adjustment_no', v_adjustment_no, 'reason', v_reason::text));

  return jsonb_build_object(
    'id', v_adjustment_id,
    'adjustment_no', v_adjustment_no,
    'adjustment_date', v_adjustment_date,
    'reason', v_reason::text
  );
end;
$$;

grant execute on function public.post_stock_adjustment(jsonb) to authenticated;
