-- =============================================================================
-- 18 · Customer & Supplier Payment Voucher RPCs: post_customer_payment(), post_supplier_payment()
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Customer Payment Receipt Voucher RPC
-- -----------------------------------------------------------------------------
create or replace function public.post_customer_payment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_date     date;
  v_customer_id      uuid;
  v_customer         public.customers%rowtype;
  v_amount           numeric(14,2);
  v_payment_method   public.payment_method;
  v_payment_account  uuid;
  v_cheque_no        text;
  v_cheque_date      date;
  v_bank_name        text;
  v_sale_id          uuid;
  v_notes            text;
  v_receipt_no       text;
  v_payment_id       uuid;

  v_rem_alloc        numeric(14,2);
  v_alloc_amt        numeric(14,2);
  v_sale             record;
begin
  perform private.assert_permission('customer_payments.create');

  v_payment_date := coalesce((p_payload ->> 'payment_date')::date, private.business_today());
  perform private.assert_posting_date(v_payment_date, 'customer_payments.backdate');

  v_customer_id := (p_payload ->> 'customer_id')::uuid;
  select * into v_customer from public.customers where id = v_customer_id and is_active;
  if not found then perform private.raise_error('CUSTOMER_NOT_FOUND'); end if;

  v_amount          := (p_payload ->> 'amount')::numeric;
  if v_amount <= 0 then perform private.raise_error('INVALID_AMOUNT'); end if;

  v_payment_method  := coalesce((p_payload ->> 'payment_method')::public.payment_method, 'cash');
  v_payment_account := (p_payload ->> 'payment_account_id')::uuid;
  v_cheque_no       := p_payload ->> 'cheque_no';
  v_cheque_date     := (p_payload ->> 'cheque_date')::date;
  v_bank_name       := p_payload ->> 'bank_name';
  v_sale_id         := (p_payload ->> 'sale_id')::uuid;
  v_notes           := p_payload ->> 'notes';

  v_receipt_no := private.next_document_no('customer_payment', v_payment_date);

  insert into public.customer_payments (
    receipt_no, payment_date, customer_id, direction, amount, payment_method, payment_account_id,
    cheque_no, cheque_date, bank_name, sale_id, notes, created_by
  ) values (
    v_receipt_no, v_payment_date, v_customer_id, 'in', v_amount, v_payment_method, v_payment_account,
    v_cheque_no, v_cheque_date, v_bank_name, v_sale_id, v_notes, auth.uid()
  ) returning id into v_payment_id;

  -- Allocation logic
  v_rem_alloc := v_amount;
  if v_sale_id is not null then
    -- Direct allocation to single invoice
    select * into v_sale from public.sales where id = v_sale_id;
    if found and v_sale.balance_due > 0 then
      v_alloc_amt := least(v_rem_alloc, v_sale.balance_due);
      insert into public.customer_payment_allocations (payment_id, sale_id, amount) values (v_payment_id, v_sale_id, v_alloc_amt);
      update public.sales set
        amount_paid = amount_paid + v_alloc_amt,
        balance_due = balance_due - v_alloc_amt,
        payment_status = case when balance_due - v_alloc_amt <= 0 then 'paid'::public.payment_status else 'partial'::public.payment_status end
      where id = v_sale_id;
    end if;
  else
    -- FIFO allocation across unpaid customer invoices
    for v_sale in
      select id, balance_due from public.sales
      where customer_id = v_customer_id and payment_status in ('unpaid', 'partial') and status = 'posted'
      order by sale_date asc, created_at asc
    loop
      exit when v_rem_alloc <= 0;
      v_alloc_amt := least(v_rem_alloc, v_sale.balance_due);
      insert into public.customer_payment_allocations (payment_id, sale_id, amount) values (v_payment_id, v_sale.id, v_alloc_amt);
      update public.sales set
        amount_paid = amount_paid + v_alloc_amt,
        balance_due = balance_due - v_alloc_amt,
        payment_status = case when balance_due - v_alloc_amt <= 0 then 'paid'::public.payment_status else 'partial'::public.payment_status end
      where id = v_sale.id;
      v_rem_alloc := v_rem_alloc - v_alloc_amt;
    end loop;
  end if;

  -- Ledger posting (Credit customer khata)
  insert into public.customer_ledger_entries (
    customer_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
  ) values (
    v_customer_id, v_payment_date, 'payment', 'Receipt Voucher #' || v_receipt_no, v_receipt_no, 0, v_amount, 'payment', v_payment_id, auth.uid()
  );

  -- Audit log
  perform private.log_activity('payment.received', 'customer_payment', v_payment_id,
    'Receipt Voucher ' || v_receipt_no || ' (Rs. ' || v_amount || ') received from ' || v_customer.name,
    null, jsonb_build_object('receipt_no', v_receipt_no, 'amount', v_amount));

  return jsonb_build_object('id', v_payment_id, 'receipt_no', v_receipt_no, 'amount', v_amount);
end;
$$;

-- -----------------------------------------------------------------------------
-- Supplier Payment Voucher RPC
-- -----------------------------------------------------------------------------
create or replace function public.post_supplier_payment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_date     date;
  v_supplier_id      uuid;
  v_supplier         public.suppliers%rowtype;
  v_amount           numeric(14,2);
  v_payment_method   public.payment_method;
  v_payment_account  uuid;
  v_cheque_no        text;
  v_cheque_date      date;
  v_bank_name        text;
  v_purchase_id      uuid;
  v_notes            text;
  v_voucher_no       text;
  v_payment_id       uuid;

  v_rem_alloc        numeric(14,2);
  v_alloc_amt        numeric(14,2);
  v_pur              record;
begin
  perform private.assert_permission('supplier_payments.create');

  v_payment_date := coalesce((p_payload ->> 'payment_date')::date, private.business_today());
  perform private.assert_posting_date(v_payment_date, 'supplier_payments.backdate');

  v_supplier_id := (p_payload ->> 'supplier_id')::uuid;
  select * into v_supplier from public.suppliers where id = v_supplier_id and is_active;
  if not found then perform private.raise_error('SUPPLIER_NOT_FOUND'); end if;

  v_amount          := (p_payload ->> 'amount')::numeric;
  if v_amount <= 0 then perform private.raise_error('INVALID_AMOUNT'); end if;

  v_payment_method  := coalesce((p_payload ->> 'payment_method')::public.payment_method, 'cash');
  v_payment_account := (p_payload ->> 'payment_account_id')::uuid;
  v_cheque_no       := p_payload ->> 'cheque_no';
  v_cheque_date     := (p_payload ->> 'cheque_date')::date;
  v_bank_name       := p_payload ->> 'bank_name';
  v_purchase_id     := (p_payload ->> 'purchase_id')::uuid;
  v_notes           := p_payload ->> 'notes';

  v_voucher_no := private.next_document_no('supplier_payment', v_payment_date);

  insert into public.supplier_payments (
    voucher_no, payment_date, supplier_id, direction, amount, payment_method, payment_account_id,
    cheque_no, cheque_date, bank_name, purchase_id, notes, created_by
  ) values (
    v_voucher_no, v_payment_date, v_supplier_id, 'out', v_amount, v_payment_method, v_payment_account,
    v_cheque_no, v_cheque_date, v_bank_name, v_purchase_id, v_notes, auth.uid()
  ) returning id into v_payment_id;

  -- Allocation logic
  v_rem_alloc := v_amount;
  if v_purchase_id is not null then
    select * into v_pur from public.purchases where id = v_purchase_id;
    if found and v_pur.balance_due > 0 then
      v_alloc_amt := least(v_rem_alloc, v_pur.balance_due);
      insert into public.supplier_payment_allocations (payment_id, purchase_id, amount) values (v_payment_id, v_purchase_id, v_alloc_amt);
      update public.purchases set
        amount_paid = amount_paid + v_alloc_amt,
        balance_due = balance_due - v_alloc_amt,
        payment_status = case when balance_due - v_alloc_amt <= 0 then 'paid'::public.payment_status else 'partial'::public.payment_status end
      where id = v_purchase_id;
    end if;
  else
    for v_pur in
      select id, balance_due from public.purchases
      where supplier_id = v_supplier_id and payment_status in ('unpaid', 'partial') and status = 'posted'
      order by purchase_date asc, created_at asc
    loop
      exit when v_rem_alloc <= 0;
      v_alloc_amt := least(v_rem_alloc, v_pur.balance_due);
      insert into public.supplier_payment_allocations (payment_id, purchase_id, amount) values (v_payment_id, v_pur.id, v_alloc_amt);
      update public.purchases set
        amount_paid = amount_paid + v_alloc_amt,
        balance_due = balance_due - v_alloc_amt,
        payment_status = case when balance_due - v_alloc_amt <= 0 then 'paid'::public.payment_status else 'partial'::public.payment_status end
      where id = v_pur.id;
      v_rem_alloc := v_rem_alloc - v_alloc_amt;
    end loop;
  end if;

  -- Ledger posting (Debit supplier khata - reduces Dena)
  insert into public.supplier_ledger_entries (
    supplier_id, entry_date, entry_type, description, reference_no, debit, credit, source_type, source_id, created_by
  ) values (
    v_supplier_id, v_payment_date, 'payment', 'Payment Voucher #' || v_voucher_no, v_voucher_no, v_amount, 0, 'supplier_payment', v_payment_id, auth.uid()
  );

  -- Audit log
  perform private.log_activity('payment.made', 'supplier_payment', v_payment_id,
    'Payment Voucher ' || v_voucher_no || ' (Rs. ' || v_amount || ') paid to ' || v_supplier.name,
    null, jsonb_build_object('voucher_no', v_voucher_no, 'amount', v_amount));

  return jsonb_build_object('id', v_payment_id, 'voucher_no', v_voucher_no, 'amount', v_amount);
end;
$$;

grant execute on function public.post_customer_payment(jsonb) to authenticated;
grant execute on function public.post_supplier_payment(jsonb) to authenticated;
