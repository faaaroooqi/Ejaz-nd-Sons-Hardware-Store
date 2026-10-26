-- =============================================================================
-- 29 – Customer statement, real sale cancellation, opening-balance RPC,
--      ledger source_type fix, payment allocation scalar fix
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ledger source_type: post_sales_return() (migration 20) writes
--    source_type = 'sales_return', which the original CHECK rejected, so every
--    sales return against a real customer rolled back. Widen the CHECK only.
-- -----------------------------------------------------------------------------
alter table public.customer_ledger_entries
  drop constraint if exists customer_ledger_entries_source_type_check;

alter table public.customer_ledger_entries
  add constraint customer_ledger_entries_source_type_check
  check (source_type in ('sale', 'payment', 'return', 'sales_return', 'opening', 'reversal'));

-- -----------------------------------------------------------------------------
-- 2. cancel_sale(): full, atomic, auditable cancellation.
--    Previously (migration 27) it only flipped sales.status, leaving the
--    customer debit in the khata and the stock deducted.
--
--    * The bill row is KEPT (number is never reused; counter only moves forward).
--    * The ledger debit is neutralised with an append-only REVERSAL entry
--      (reversal_of -> original). Nothing is edited or deleted.
--    * Stock is restored with append-only reversal movements.
--    * Money already received against the bill is NOT silently refunded: the
--      payment credit stays on the khata, so the customer shows an advance
--      (negative balance) until staff refund / re-allocate it.
--    * Idempotent: cancelling an already-cancelled bill is a no-op.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default 'Cancelled by admin')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale     public.sales%rowtype;
  v_entry    public.customer_ledger_entries%rowtype;
  v_mv       public.stock_movements%rowtype;
  v_today    date := private.business_today();
  v_reason   text := coalesce(nullif(btrim(p_reason), ''), 'Cancelled by admin');
  v_retained numeric(14,2) := 0;
begin
  perform private.assert_permission('sales.cancel');

  -- Row lock serialises concurrent cancels of the same bill.
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    perform private.raise_error('SALE_NOT_FOUND');
  end if;

  if v_sale.status = 'cancelled' then
    return jsonb_build_object('success', true, 'already_cancelled', true,
                              'bill_number', v_sale.bill_number,
                              'message', 'Sale bill was already cancelled.');
  end if;

  perform private.assert_period_open(v_sale.sale_date);

  if exists (select 1 from public.sales_returns where sale_id = p_sale_id and status = 'posted') then
    perform private.raise_error('DOCUMENT_HAS_RETURNS', jsonb_build_object('sale_id', p_sale_id));
  end if;

  -- Ledger: reverse the bill's debit entry (if any - walk-in sales have none).
  for v_entry in
    select e.* from public.customer_ledger_entries e
     where e.source_type = 'sale' and e.source_id = p_sale_id and e.entry_type = 'sale'
       and not exists (select 1 from public.customer_ledger_entries r where r.reversal_of = e.id)
  loop
    insert into public.customer_ledger_entries (
      customer_id, entry_date, entry_type, description, reference_no,
      debit, credit, source_type, source_id, reversal_of, created_by
    ) values (
      v_entry.customer_id, v_today, 'reversal',
      'Reversal: Sales Bill #' || v_sale.bill_number || ' (' || v_sale.invoice_no || ') cancelled',
      v_sale.invoice_no,
      v_entry.credit, v_entry.debit,
      'reversal', p_sale_id, v_entry.id, auth.uid()
    );
  end loop;

  -- Stock: put the goods back (append-only reversal movements).
  for v_mv in
    select m.* from public.stock_movements m
     where m.source_type = 'sale' and m.source_id = p_sale_id
       and not exists (select 1 from public.stock_movements r where r.reversal_of = m.id)
  loop
    insert into public.stock_movements (
      variant_id, movement_date, movement_type, quantity, unit_cost, balance_after,
      source_type, source_id, source_line_id, reversal_of, created_by
    ) values (
      v_mv.variant_id, v_today, 'sales_return', -v_mv.quantity, v_mv.unit_cost, 0,
      'reversal', p_sale_id, v_mv.source_line_id, v_mv.id, auth.uid()
    );
  end loop;

  select coalesce(sum(amount), 0) into v_retained
    from public.customer_payments
   where sale_id = p_sale_id and direction = 'in' and status = 'posted';

  update public.sales
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = auth.uid(),
         cancel_reason = v_reason
   where id = p_sale_id;

  perform private.log_activity('sale.cancelled', 'sale', p_sale_id,
    'Sales Bill #' || v_sale.bill_number || ' (' || v_sale.invoice_no || ') cancelled: ' || v_reason,
    jsonb_build_object('status', 'posted', 'grand_total', v_sale.grand_total, 'balance_due', v_sale.balance_due),
    jsonb_build_object('status', 'cancelled', 'bill_number', v_sale.bill_number, 'reason', v_reason,
                       'payments_retained_as_credit', v_retained));

  return jsonb_build_object(
    'success', true,
    'bill_number', v_sale.bill_number,
    'payments_retained_as_credit', v_retained,
    'message', case when v_retained > 0
      then 'Sale bill cancelled. Rs. ' || v_retained || ' already received stays on the customer account as credit.'
      else 'Sale bill cancelled successfully.' end
  );
end;
$$;

grant execute on function public.cancel_sale(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Opening balance. The client used to INSERT into customer_ledger_entries
--    directly, which `authenticated` is not allowed to do (error was ignored),
--    so opening balances were never stored. Post through the ledger trigger
--    path instead (same single balance-update mechanism).
--    p_amount > 0 : customer owes us (debit).  p_amount < 0 : advance (credit).
-- -----------------------------------------------------------------------------
create or replace function public.post_customer_opening_balance(
  p_customer_id uuid,
  p_amount      numeric,
  p_date        date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
  v_date     date := coalesce(p_date, private.business_today());
  v_entry_id uuid;
begin
  perform private.assert_permission('customers.manage');

  select * into v_customer from public.customers where id = p_customer_id and is_active;
  if not found or v_customer.is_walk_in then
    perform private.raise_error('CUSTOMER_NOT_FOUND');
  end if;

  if p_amount is null or p_amount = 0 then
    perform private.raise_error('INVALID_AMOUNT');
  end if;

  if exists (select 1 from public.customer_ledger_entries
              where customer_id = p_customer_id and entry_type = 'opening_balance') then
    perform private.raise_error('OPENING_BALANCE_EXISTS', jsonb_build_object('customer_id', p_customer_id));
  end if;

  insert into public.customer_ledger_entries (
    customer_id, entry_date, entry_type, description, reference_no,
    debit, credit, source_type, created_by
  ) values (
    p_customer_id, v_date, 'opening_balance', 'Opening Khata Balance', 'OPN-BAL',
    greatest(p_amount, 0), greatest(-p_amount, 0), 'opening', auth.uid()
  ) returning id into v_entry_id;

  perform private.log_activity('customer.opening_balance', 'customer', p_customer_id,
    'Opening balance Rs. ' || p_amount || ' posted for ' || v_customer.name,
    null, jsonb_build_object('amount', p_amount, 'entry_date', v_date));

  return jsonb_build_object('id', v_entry_id, 'customer_id', p_customer_id, 'amount', p_amount);
end;
$$;

grant execute on function public.post_customer_opening_balance(uuid, numeric, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Customer statement (khata).
--    * Running balance is computed over the customer's WHOLE history, then the
--      date range / search filter is applied, so a filtered view still shows the
--      true balance after each row.
--    * opening_balance = balance carried in before p_from (0 when no p_from;
--      the customer's own "Opening Khata Balance" entry is then the first row).
--    * Every row that belongs to a bill carries sale_id / bill_number /
--      bilty_number / laborer_name so the UI can link to the bill.
--    * Same-timestamp rows are ordered debit-before-credit so a bill appears
--      before the payment taken with it.
--    * `balance_matches_cache` lets callers verify the ledger against the
--      trigger-maintained customer_balances row.
-- -----------------------------------------------------------------------------
create or replace function public.get_customer_statement(
  p_customer_id uuid,
  p_from        date default null,
  p_to          date default null,
  p_search      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer     public.customers%rowtype;
  v_search       text := nullif(btrim(ltrim(btrim(coalesce(p_search, '')), '#')), '');
  v_opening      numeric(14,2) := 0;
  v_range_debit  numeric(14,2);
  v_range_credit numeric(14,2);
  v_ledger_total numeric(14,2);
  v_cached       numeric(14,2);
  v_rows         jsonb;
begin
  perform private.assert_permission('customers.ledger');

  select * into v_customer from public.customers where id = p_customer_id;
  if not found then
    perform private.raise_error('CUSTOMER_NOT_FOUND');
  end if;

  if p_from is not null then
    select coalesce(sum(debit - credit), 0) into v_opening
      from public.customer_ledger_entries
     where customer_id = p_customer_id and entry_date < p_from;
  end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0) into v_range_debit, v_range_credit
    from public.customer_ledger_entries
   where customer_id = p_customer_id
     and (p_from is null or entry_date >= p_from)
     and (p_to   is null or entry_date <= p_to);

  select coalesce(sum(debit - credit), 0) into v_ledger_total
    from public.customer_ledger_entries where customer_id = p_customer_id;

  select current_balance into v_cached from public.customer_balances where customer_id = p_customer_id;

  with base as (
    select e.*,
           row_number() over (order by e.entry_date, e.created_at, (e.credit > 0), e.id) as ord,
           sum(e.debit - e.credit) over (
             order by e.entry_date, e.created_at, (e.credit > 0), e.id
             rows between unbounded preceding and current row
           ) as running_balance
      from public.customer_ledger_entries e
     where e.customer_id = p_customer_id
  ),
  linked as (
    select b.*,
           case b.source_type
             when 'sale'         then b.source_id
             when 'payment'      then (select cp.sale_id from public.customer_payments cp where cp.id = b.source_id)
             when 'sales_return' then (select sr.sale_id from public.sales_returns sr where sr.id = b.source_id)
             when 'reversal'     then (select o.source_id from public.customer_ledger_entries o
                                        where o.id = b.reversal_of and o.source_type = 'sale')
           end as sale_id
      from base b
  ),
  shaped as (
    select l.*, s.invoice_no, s.bill_number, s.bilty_number, s.laborer_name,
           s.status as sale_status, s.grand_total as bill_total
      from linked l
      left join public.sales s on s.id = l.sale_id
     where (p_from is null or l.entry_date >= p_from)
       and (p_to   is null or l.entry_date <= p_to)
       and (
         v_search is null
         or (
           v_search ~ '^[0-9]+$'
           and (
             s.bill_number = v_search::bigint
             or s.bilty_number ilike '%' || v_search || '%'
             or s.laborer_name ilike '%' || v_search || '%'
             or l.reference_no = v_search
           )
         )
         or (
           not (v_search ~ '^[0-9]+$')
           and (
             s.bill_number::text = v_search
             or s.bilty_number ilike '%' || v_search || '%'
             or s.laborer_name ilike '%' || v_search || '%'
             or l.reference_no ilike '%' || v_search || '%'
           )
         )
       )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'entry_id',        id,
           'entry_date',      entry_date,
           'entry_type',      entry_type,
           'description',     description,
           'reference_no',    reference_no,
           'debit',           debit,
           'credit',          credit,
           'running_balance', running_balance,
           'sale_id',         sale_id,
           'invoice_no',      invoice_no,
           'bill_number',     bill_number,
           'bilty_number',    bilty_number,
           'laborer_name',    laborer_name,
           'sale_status',     sale_status,
           'bill_total',      bill_total
         ) order by ord), '[]'::jsonb)
    into v_rows
    from shaped;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', v_customer.id, 'code', v_customer.code, 'name', v_customer.name,
      'business_name', v_customer.business_name, 'phone', v_customer.phone, 'address', v_customer.address),
    'from',            p_from,
    'to',              p_to,
    'search',          v_search,
    'opening_balance', v_opening,
    'total_debit',     v_range_debit,
    'total_credit',    v_range_credit,
    'closing_balance', v_opening + v_range_debit - v_range_credit,
    'current_balance', v_ledger_total,
    'cached_balance',  coalesce(v_cached, 0),
    'balance_matches_cache', v_ledger_total = coalesce(v_cached, 0),
    'rows',            v_rows
  );
end;
$$;

grant execute on function public.get_customer_statement(uuid, date, date, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Bill history / search.
--    SECURITY INVOKER: the caller's RLS (sales.view) still applies.
--    Bill number is matched EXACTLY (searching "4" must not return 14, 24 ...);
--    invoice no., customer name, bilty number and laborer are substring matches.
-- -----------------------------------------------------------------------------
create or replace function public.search_sales(
  p_search      text default null,
  p_customer_id uuid default null,
  p_from        date default null,
  p_to          date default null
)
returns setof public.sales
language sql
stable
security invoker
set search_path = ''
as $$
  select s.*
    from public.sales s
   cross join lateral (
     select nullif(btrim(ltrim(btrim(coalesce(p_search, '')), '#')), '') as q
   ) f
   where (p_customer_id is null or s.customer_id = p_customer_id)
     and (p_from is null or s.sale_date >= p_from)
     and (p_to   is null or s.sale_date <= p_to)
     and (
       f.q is null
       or (
         f.q ~ '^[0-9]+$'
         and (
           s.bill_number = f.q::bigint
           or s.bilty_number ilike '%' || f.q || '%'
           or s.laborer_name ilike '%' || f.q || '%'
         )
       )
       or (
         not (f.q ~ '^[0-9]+$')
         and (
           s.bill_number::text = f.q
           or s.invoice_no ilike '%' || f.q || '%'
           or s.customer_name_snapshot ilike '%' || f.q || '%'
           or s.bilty_number ilike '%' || f.q || '%'
           or s.laborer_name ilike '%' || f.q || '%'
         )
       )
     )
   order by s.sale_date desc, s.created_at desc, s.bill_number desc;
$$;

grant execute on function public.search_sales(text, uuid, date, date) to authenticated;
