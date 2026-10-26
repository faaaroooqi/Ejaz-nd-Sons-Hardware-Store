-- =============================================================================
-- 27 · Admin Full CRUD: Policies and Functions for Edit and Delete
-- =============================================================================

-- 1. Grant direct table permissions
grant delete on public.customers, public.suppliers to authenticated;
grant delete on public.products, public.product_variants to authenticated;
grant insert, update, delete on public.expenses to authenticated;
grant update, delete on public.expense_categories to authenticated;
grant update, delete on public.sales, public.purchases to authenticated;

-- 2. Row Level Security Policies
-- Customers Delete
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated
  using ((select private.has_permission('customers.manage')));

-- Suppliers Delete
drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete on public.suppliers for delete to authenticated
  using ((select private.has_permission('suppliers.manage')));

-- Products & Variants Delete
drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete to authenticated
  using ((select private.has_permission('catalog.manage')));

drop policy if exists variants_delete on public.product_variants;
create policy variants_delete on public.product_variants for delete to authenticated
  using ((select private.has_permission('catalog.manage')));

-- Expenses CRUD
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated
  with check ((select private.has_permission('expenses.create')));

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated
  using ((select private.has_permission('expenses.create')));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated
  using ((select private.has_permission('expenses.void')));

-- Expense Categories Update & Delete
drop policy if exists expense_categories_update on public.expense_categories;
create policy expense_categories_update on public.expense_categories for update to authenticated
  using ((select private.has_permission('expenses.create')));

drop policy if exists expense_categories_delete on public.expense_categories;
create policy expense_categories_delete on public.expense_categories for delete to authenticated
  using ((select private.has_permission('expenses.create')));

-- Sales & Purchases Admin Update / Cancel
drop policy if exists sales_update on public.sales;
create policy sales_update on public.sales for update to authenticated
  using ((select private.has_permission('sales.create')));

drop policy if exists purchases_update on public.purchases;
create policy purchases_update on public.purchases for update to authenticated
  using ((select private.has_permission('purchases.create')));

-- -----------------------------------------------------------------------------
-- 3. Robust RPC Deletion Functions with Foreign-Key Safety & Archiving
-- -----------------------------------------------------------------------------

-- Delete Customer
create or replace function public.delete_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('customers.manage');
  
  if exists (select 1 from public.sales where customer_id = p_customer_id) or
     exists (select 1 from public.customer_ledger_entries where customer_id = p_customer_id) then
    update public.customers set is_active = false, updated_at = now() where id = p_customer_id;
    return jsonb_build_object('success', true, 'action', 'archived', 'message', 'Customer has transaction history. Account has been deactivated/archived.');
  end if;

  delete from public.customer_balances where customer_id = p_customer_id;
  delete from public.customers where id = p_customer_id;
  return jsonb_build_object('success', true, 'action', 'deleted', 'message', 'Customer deleted successfully.');
end;
$$;

grant execute on function public.delete_customer(uuid) to authenticated;

-- Delete Supplier
create or replace function public.delete_supplier(p_supplier_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('suppliers.manage');

  if exists (select 1 from public.purchases where supplier_id = p_supplier_id) or
     exists (select 1 from public.supplier_ledger_entries where supplier_id = p_supplier_id) then
    update public.suppliers set is_active = false, updated_at = now() where id = p_supplier_id;
    return jsonb_build_object('success', true, 'action', 'archived', 'message', 'Supplier has purchase/ledger history. Account has been deactivated/archived.');
  end if;

  delete from public.supplier_balances where supplier_id = p_supplier_id;
  delete from public.suppliers where id = p_supplier_id;
  return jsonb_build_object('success', true, 'action', 'deleted', 'message', 'Supplier deleted successfully.');
end;
$$;

grant execute on function public.delete_supplier(uuid) to authenticated;

-- Delete Product
create or replace function public.delete_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('catalog.manage');

  if exists (
    select 1 from public.product_variants pv
    where pv.product_id = p_product_id
      and (
        exists (select 1 from public.sale_items si where si.variant_id = pv.id) or
        exists (select 1 from public.purchase_items pi where pi.variant_id = pv.id) or
        exists (select 1 from public.stock_movements sm where sm.variant_id = pv.id)
      )
  ) then
    update public.products set is_active = false, updated_at = now() where id = p_product_id;
    update public.product_variants set is_active = false, updated_at = now() where product_id = p_product_id;
    return jsonb_build_object('success', true, 'action', 'archived', 'message', 'Product has past transaction history. Item has been deactivated/archived.');
  end if;

  delete from public.products where id = p_product_id;
  return jsonb_build_object('success', true, 'action', 'deleted', 'message', 'Product and variants deleted successfully.');
end;
$$;

grant execute on function public.delete_product(uuid) to authenticated;

-- Delete Expense
create or replace function public.delete_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('expenses.void');
  delete from public.expenses where id = p_expense_id;
  return jsonb_build_object('success', true, 'action', 'deleted', 'message', 'Expense record deleted successfully.');
end;
$$;

grant execute on function public.delete_expense(uuid) to authenticated;

-- Update Expense
create or replace function public.update_expense(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.assert_permission('expenses.create');
  v_id := (p_payload ->> 'id')::uuid;
  
  update public.expenses set
    expense_date       = coalesce((p_payload ->> 'expense_date')::date, expense_date),
    category_id        = coalesce((p_payload ->> 'category_id')::uuid, category_id),
    amount             = coalesce((p_payload ->> 'amount')::numeric, amount),
    payment_method     = coalesce((p_payload ->> 'payment_method')::public.payment_method, payment_method),
    payment_account_id = coalesce((p_payload ->> 'payment_account_id')::uuid, payment_account_id),
    paid_to            = p_payload ->> 'paid_to',
    description        = coalesce(p_payload ->> 'description', description)
  where id = v_id;

  return jsonb_build_object('success', true, 'message', 'Expense updated successfully.');
end;
$$;

grant execute on function public.update_expense(jsonb) to authenticated;

-- Cancel Sale
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default 'Cancelled by admin')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('sales.cancel');
  update public.sales set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancel_reason = p_reason
  where id = p_sale_id;
  return jsonb_build_object('success', true, 'message', 'Sale invoice cancelled successfully.');
end;
$$;

grant execute on function public.cancel_sale(uuid, text) to authenticated;

-- Cancel Purchase
create or replace function public.cancel_purchase(p_purchase_id uuid, p_reason text default 'Cancelled by admin')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('purchases.cancel');
  update public.purchases set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancel_reason = p_reason
  where id = p_purchase_id;
  return jsonb_build_object('success', true, 'message', 'Purchase bill cancelled successfully.');
end;
$$;

grant execute on function public.cancel_purchase(uuid, text) to authenticated;
