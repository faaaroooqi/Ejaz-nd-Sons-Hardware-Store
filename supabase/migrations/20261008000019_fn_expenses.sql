-- =============================================================================
-- 19 · Expenses RPC: post_expense()
-- =============================================================================

create or replace function public.post_expense(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_date    date;
  v_category_id     uuid;
  v_category_name   text;
  v_amount          numeric(14,2);
  v_payment_method  public.payment_method;
  v_payment_account uuid;
  v_paid_to         text;
  v_description     text;
  v_expense_no      text;
  v_expense_id      uuid;
begin
  perform private.assert_permission('expenses.create');

  v_expense_date := coalesce((p_payload ->> 'expense_date')::date, private.business_today());
  perform private.assert_posting_date(v_expense_date, 'expenses.backdate');

  v_category_id := (p_payload ->> 'category_id')::uuid;
  select name into v_category_name from public.expense_categories where id = v_category_id and is_active;
  if not found then perform private.raise_error('CATEGORY_NOT_FOUND'); end if;

  v_amount          := (p_payload ->> 'amount')::numeric;
  if v_amount <= 0 then perform private.raise_error('INVALID_AMOUNT'); end if;

  v_payment_method  := coalesce((p_payload ->> 'payment_method')::public.payment_method, 'cash');
  v_payment_account := (p_payload ->> 'payment_account_id')::uuid;
  v_paid_to         := p_payload ->> 'paid_to';
  v_description     := coalesce(p_payload ->> 'description', v_category_name);

  v_expense_no := private.next_document_no('expense', v_expense_date);

  insert into public.expenses (
    expense_no, expense_date, category_id, amount, payment_method, payment_account_id,
    paid_to, description, created_by
  ) values (
    v_expense_no, v_expense_date, v_category_id, v_amount, v_payment_method, v_payment_account,
    v_paid_to, v_description, auth.uid()
  ) returning id into v_expense_id;

  -- Audit log
  perform private.log_activity('expense.created', 'expense', v_expense_id,
    'Expense ' || v_expense_no || ' (Rs. ' || v_amount || ') logged under ' || v_category_name,
    null, jsonb_build_object('expense_no', v_expense_no, 'amount', v_amount));

  return jsonb_build_object('id', v_expense_id, 'expense_no', v_expense_no, 'amount', v_amount);
end;
$$;

grant execute on function public.post_expense(jsonb) to authenticated;
