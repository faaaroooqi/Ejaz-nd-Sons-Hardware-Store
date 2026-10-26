-- =============================================================================
-- 23 · Flush unwanted test / garbage values & reset sequences
-- =============================================================================

do $$
begin
  -- Truncate all transaction, inventory, customer, supplier & audit data cleanly
  truncate table
    public.activity_logs,
    public.customer_payment_allocations,
    public.customer_payments,
    public.customer_ledger_entries,
    public.customer_balances,
    public.supplier_payment_allocations,
    public.supplier_payments,
    public.supplier_ledger_entries,
    public.supplier_balances,
    public.sale_return_items,
    public.sales_returns,
    public.purchase_return_items,
    public.purchase_returns,
    public.sale_items,
    public.sales,
    public.purchase_items,
    public.purchases,
    public.stock_movements,
    public.stock_levels,
    public.expenses,
    public.product_price_history,
    public.variant_costs,
    public.product_variants,
    public.products,
    public.categories,
    public.brands,
    public.customers,
    public.suppliers,
    public.document_sequences
  cascade;

  -- Re-insert clean Walk-in Customer default record
  insert into public.customers (id, code, name, phone, is_walk_in, is_active)
  values ('00000000-0000-0000-0000-000000000001'::uuid, 'C-00001', 'Walk-in Customer', '00000000000', true, true)
  on conflict (id) do nothing;
end $$;
