-- =============================================================================
-- 21 · Financial & Inventory Reporting RPCs: get_financial_summary(), get_daily_cashbook(), get_stock_valuation()
-- =============================================================================

create or replace function public.get_financial_summary(
  p_start_date date default null,
  p_end_date   date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start date;
  v_end   date;

  v_total_sales           numeric(14,2) := 0;
  v_total_purchases       numeric(14,2) := 0;
  v_total_expenses        numeric(14,2) := 0;
  v_total_customer_rec    numeric(14,2) := 0;
  v_total_supplier_pay    numeric(14,2) := 0;

  v_stock_valuation_cost  numeric(14,2) := 0;
  v_stock_valuation_retail numeric(14,2) := 0;

  v_cogs                  numeric(14,2) := 0;
  v_gross_profit          numeric(14,2) := 0;
  v_net_profit            numeric(14,2) := 0;
begin
  perform private.assert_permission('reports.sales');

  v_end   := coalesce(p_end_date, private.business_today());
  v_start := coalesce(p_start_date, date_trunc('month', v_end)::date);

  -- Sales total in period
  select coalesce(sum(grand_total), 0) into v_total_sales
  from public.sales where status = 'posted' and sale_date between v_start and v_end;

  -- Purchases total in period
  select coalesce(sum(grand_total), 0) into v_total_purchases
  from public.purchases where status = 'posted' and purchase_date between v_start and v_end;

  -- Expenses total in period
  select coalesce(sum(amount), 0) into v_total_expenses
  from public.expenses where status = 'posted' and expense_date between v_start and v_end;

  -- Customer Payments received in period
  select coalesce(sum(amount), 0) into v_total_customer_rec
  from public.customer_payments where status = 'posted' and payment_date between v_start and v_end;

  -- Supplier Payments paid in period
  select coalesce(sum(amount), 0) into v_total_supplier_pay
  from public.supplier_payments where status = 'posted' and payment_date between v_start and v_end;

  -- Stock valuation snapshot
  select
    coalesce(sum(sl.quantity_on_hand * vc.average_cost), 0),
    coalesce(sum(sl.quantity_on_hand * pv.default_rate), 0)
  into v_stock_valuation_cost, v_stock_valuation_retail
  from public.stock_levels sl
  join public.product_variants pv on pv.id = sl.variant_id
  join public.variant_costs vc on vc.variant_id = pv.id
  where pv.is_active;

  -- Calculate COGS (Cost of Goods Sold) for sold items in period
  select coalesce(sum(si.quantity * vc.average_cost), 0) into v_cogs
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  join public.variant_costs vc on vc.variant_id = si.variant_id
  where s.status = 'posted' and s.sale_date between v_start and v_end;

  v_gross_profit := v_total_sales - v_cogs;
  v_net_profit   := v_gross_profit - v_total_expenses;

  return jsonb_build_object(
    'start_date', v_start,
    'end_date', v_end,
    'total_sales', v_total_sales,
    'total_purchases', v_total_purchases,
    'total_expenses', v_total_expenses,
    'total_customer_received', v_total_customer_rec,
    'total_supplier_paid', v_total_supplier_pay,
    'stock_valuation_at_cost', v_stock_valuation_cost,
    'stock_valuation_at_retail', v_stock_valuation_retail,
    'cogs', v_cogs,
    'gross_profit', v_gross_profit,
    'net_profit', v_net_profit
  );
end;
$$;

grant execute on function public.get_financial_summary(date, date) to authenticated;
