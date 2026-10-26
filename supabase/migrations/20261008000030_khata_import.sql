-- =============================================================================
-- 30 – Old khata (paper ledger) import
--
--   * Lets the owner scan / type the entries of an old paper khata and post them
--     into the customer / supplier ledgers in ONE atomic, auditable batch.
--   * Posts ONLY ledger rows. It never touches stock, sales, purchases, payments
--     or cash accounts, so historical entries cannot distort today's numbers.
--     Balances, khata statements, receivables and payables update through the
--     existing ledger triggers (single balance-update mechanism).
--   * Ledger rows stay append-only: an import is undone with REVERSAL entries.
--   * Also fixes two latent ledger defects found while wiring this up:
--       - supplier_ledger_entries.source_type rejected 'supplier_payment' /
--         'purchase_return', which the existing purchase / supplier-payment /
--         purchase-return functions write;
--       - suppliers had no opening-balance RPC (the client INSERT into the
--         ledger was always denied and its error ignored).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ledger source_type: allow 'khata_import' (+ the supplier values already used)
-- -----------------------------------------------------------------------------
alter table public.customer_ledger_entries
  drop constraint if exists customer_ledger_entries_source_type_check;
alter table public.customer_ledger_entries
  add constraint customer_ledger_entries_source_type_check
  check (source_type in ('sale', 'payment', 'return', 'sales_return', 'opening', 'reversal', 'khata_import'));

alter table public.supplier_ledger_entries
  drop constraint if exists supplier_ledger_entries_source_type_check;
alter table public.supplier_ledger_entries
  add constraint supplier_ledger_entries_source_type_check
  check (source_type in ('purchase', 'payment', 'supplier_payment', 'return', 'purchase_return',
                         'opening', 'reversal', 'khata_import'));

-- -----------------------------------------------------------------------------
-- 2. Gap-free import numbers (KH-0001, KH-0002 ...)
-- -----------------------------------------------------------------------------
insert into public.document_types (code, prefix, description, yearly, pad_length)
values ('khata_import', 'KH', 'Old khata import batch', false, 4)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Import batches + their lines (the lines link every ledger row to its batch,
--    which is what makes "undo" exact).
--    charge  = amount that INCREASED what is owed (customer: udhaar given /
--              supplier: goods bought on credit)
--    payment = amount that REDUCED what is owed (money received / money paid)
-- -----------------------------------------------------------------------------
create table public.khata_imports (
  id              uuid primary key default gen_random_uuid(),
  import_no       text not null unique,
  party_type      text not null check (party_type in ('customer', 'supplier')),
  title           text,
  notes           text,
  source_files    text[] not null default '{}',
  status          text not null default 'posted' check (status in ('posted', 'undone')),
  entry_count     integer not null default 0,
  party_count     integer not null default 0,
  new_party_count integer not null default 0,
  total_charges   numeric(14,2) not null default 0,
  total_payments  numeric(14,2) not null default 0,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id),
  undone_at       timestamptz,
  undone_by       uuid references public.profiles (id),
  undo_reason     text
);

create index khata_imports_created_idx on public.khata_imports (created_at desc);

create table public.khata_import_lines (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid not null references public.khata_imports (id) on delete restrict,
  line_no         integer not null,
  party_id        uuid not null,
  party_name      text not null,
  entry_date      date not null,
  description     text,
  charge          numeric(14,2) not null default 0 check (charge >= 0),
  payment         numeric(14,2) not null default 0 check (payment >= 0),
  ledger_entry_id uuid not null,
  fingerprint     text not null,
  check ((charge > 0 and payment = 0) or (payment > 0 and charge = 0))
);

create index khata_import_lines_import_idx on public.khata_import_lines (import_id, line_no);
create index khata_import_lines_fingerprint_idx on public.khata_import_lines (fingerprint);

alter table public.khata_imports      enable row level security;
alter table public.khata_import_lines enable row level security;

-- Read-only for the client; every write goes through the SECURITY DEFINER functions below.
grant select on public.khata_imports, public.khata_import_lines to authenticated;

create policy khata_imports_select on public.khata_imports
  for select to authenticated using ((select private.has_permission('data.import')));
create policy khata_import_lines_select on public.khata_import_lines
  for select to authenticated using ((select private.has_permission('data.import')));

-- -----------------------------------------------------------------------------
-- 4. post_khata_import(): validate everything, resolve / create parties, post the
--    ledger rows, record the batch. All-or-nothing.
--
--    p_payload = {
--      party_type: 'customer' | 'supplier',
--      title?, notes?, source_files?: [storage paths],
--      lines: [{ party_id? , party_name?, party_phone?, entry_date, description?,
--                charge?, payment? }]      -- exactly ONE of charge / payment > 0
--    }
--    A line without party_id is matched to an active party with exactly the same
--    name, otherwise a new party is created (needs customers.manage / suppliers.manage).
--    Lines identical to an entry of an earlier, still-active import are reported as
--    DUPLICATE_ENTRIES (detail.lines = 1-based line numbers) unless p_force is true.
-- -----------------------------------------------------------------------------
create or replace function public.post_khata_import(p_payload jsonb, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type          text  := p_payload ->> 'party_type';
  v_lines         jsonb := p_payload -> 'lines';
  v_title         text  := left(nullif(btrim(coalesce(p_payload ->> 'title', '')), ''), 200);
  v_notes         text  := left(nullif(btrim(coalesce(p_payload ->> 'notes', '')), ''), 1000);
  v_files         text[] := '{}';
  v_today         date  := private.business_today();
  v_import_id     uuid;
  v_import_no     text;
  v_line          jsonb;
  v_idx           integer := 0;
  v_party_id      uuid;
  v_party_name    text;
  v_phone         text;
  v_date          date;
  v_desc          text;
  v_charge        numeric(14,2);
  v_payment       numeric(14,2);
  v_label         text;
  v_fp            text;
  v_ledger_id     uuid;
  v_key           text;
  v_resolved      jsonb := '{}'::jsonb;
  v_party_ids     uuid[] := '{}';
  v_dups          integer[] := '{}';
  v_code          text;
  v_count         integer := 0;
  v_new_count     integer := 0;
  v_total_charge  numeric(14,2) := 0;
  v_total_payment numeric(14,2) := 0;
begin
  perform private.assert_permission('data.import');

  if v_type is null or v_type not in ('customer', 'supplier') then
    perform private.raise_error('INVALID_PAYLOAD', jsonb_build_object('field', 'party_type'));
  end if;
  if v_lines is null or jsonb_typeof(v_lines) <> 'array'
     or jsonb_array_length(v_lines) = 0 or jsonb_array_length(v_lines) > 1000 then
    perform private.raise_error('INVALID_PAYLOAD', jsonb_build_object('field', 'lines'));
  end if;

  if jsonb_typeof(p_payload -> 'source_files') = 'array' then
    select coalesce(array_agg(f), '{}') into v_files
      from (select left(x, 300) as f from jsonb_array_elements_text(p_payload -> 'source_files') x limit 50) s;
  end if;

  v_import_no := private.next_document_no('khata_import');

  insert into public.khata_imports (import_no, party_type, title, notes, source_files, created_by)
  values (v_import_no, v_type, v_title, v_notes, v_files, auth.uid())
  returning id into v_import_id;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    v_idx := v_idx + 1;

    -- ---- parse -------------------------------------------------------------
    begin
      v_date     := nullif(v_line ->> 'entry_date', '')::date;
      v_charge   := round(coalesce(nullif(v_line ->> 'charge', '')::numeric, 0), 2);
      v_payment  := round(coalesce(nullif(v_line ->> 'payment', '')::numeric, 0), 2);
      v_party_id := nullif(v_line ->> 'party_id', '')::uuid;
    exception when others then
      perform private.raise_error('INVALID_PAYLOAD', jsonb_build_object('line', v_idx));
    end;

    -- ---- validate ----------------------------------------------------------
    if v_date is null then
      perform private.raise_error('DATE_REQUIRED', jsonb_build_object('line', v_idx));
    end if;
    if v_date > v_today then
      perform private.raise_error('FUTURE_DATE', jsonb_build_object('line', v_idx, 'date', v_date));
    end if;
    perform private.assert_period_open(v_date);

    if v_charge < 0 or v_payment < 0 or v_charge > 99999999999 or v_payment > 99999999999
       or (v_charge = 0 and v_payment = 0) or (v_charge > 0 and v_payment > 0) then
      perform private.raise_error('INVALID_LINE_ITEM', jsonb_build_object('line', v_idx));
    end if;

    v_desc := left(nullif(btrim(coalesce(v_line ->> 'description', '')), ''), 250);

    -- ---- resolve the party ---------------------------------------------------
    if v_party_id is not null then
      if v_type = 'customer' then
        select name into v_party_name from public.customers
         where id = v_party_id and is_active and not is_walk_in;
        if not found then
          perform private.raise_error('CUSTOMER_NOT_FOUND', jsonb_build_object('line', v_idx));
        end if;
      else
        select name into v_party_name from public.suppliers
         where id = v_party_id and is_active;
        if not found then
          perform private.raise_error('SUPPLIER_NOT_FOUND', jsonb_build_object('line', v_idx));
        end if;
      end if;
    else
      v_party_name := regexp_replace(btrim(coalesce(v_line ->> 'party_name', '')), '\s+', ' ', 'g');
      if v_party_name = '' then
        perform private.raise_error('INVALID_PAYLOAD', jsonb_build_object('line', v_idx, 'field', 'party_name'));
      end if;
      v_party_name := left(v_party_name, 150);
      v_key := lower(v_party_name);

      if v_resolved ? v_key then
        v_party_id := (v_resolved ->> v_key)::uuid;
      else
        if v_type = 'customer' then
          select id into v_party_id from public.customers
           where is_active and not is_walk_in
             and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = v_key
           order by created_at limit 1;
        else
          select id into v_party_id from public.suppliers
           where is_active
             and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = v_key
           order by created_at limit 1;
        end if;

        if v_party_id is null then
          v_phone := coalesce(nullif(left(btrim(coalesce(v_line ->> 'party_phone', '')), 30), ''), 'N/A');
          if v_type = 'customer' then
            perform private.assert_permission('customers.manage');
            loop
              v_code := private.next_document_no('customer');
              exit when not exists (select 1 from public.customers where code = v_code);
            end loop;
            insert into public.customers (code, name, phone)
            values (v_code, v_party_name, v_phone) returning id into v_party_id;
          else
            perform private.assert_permission('suppliers.manage');
            loop
              v_code := private.next_document_no('supplier');
              exit when not exists (select 1 from public.suppliers where code = v_code);
            end loop;
            insert into public.suppliers (code, name, phone)
            values (v_code, v_party_name, v_phone) returning id into v_party_id;
          end if;
          v_new_count := v_new_count + 1;
        end if;
        v_resolved := v_resolved || jsonb_build_object(v_key, v_party_id);
      end if;
    end if;

    -- Snapshot the party's STORED name (not the spelling that was typed / scanned).
    if v_type = 'customer' then
      select name into v_party_name from public.customers where id = v_party_id;
    else
      select name into v_party_name from public.suppliers where id = v_party_id;
    end if;

    -- ---- duplicate guard (against OTHER, still-active imports) -------------
    v_fp := md5(concat_ws('|', v_party_id::text, v_date::text, v_charge::text, v_payment::text,
                          lower(regexp_replace(btrim(coalesce(v_desc, '')), '\s+', ' ', 'g'))));
    if exists (select 1 from public.khata_import_lines l
                 join public.khata_imports i on i.id = l.import_id
                where l.fingerprint = v_fp and i.status = 'posted' and i.id <> v_import_id) then
      v_dups := array_append(v_dups, v_idx);
    end if;

    -- ---- post the ledger row -----------------------------------------------
    v_label := 'Old khata: ' || coalesce(v_desc,
      case when v_type = 'customer'
           then case when v_charge > 0 then 'Goods on credit' else 'Payment received' end
           else case when v_charge > 0 then 'Goods bought on credit' else 'Payment made' end
      end);

    if v_type = 'customer' then
      insert into public.customer_ledger_entries (
        customer_id, entry_date, entry_type, description, reference_no,
        debit, credit, source_type, source_id, created_by
      ) values (
        v_party_id, v_date, 'adjustment', v_label, v_import_no,
        v_charge, v_payment, 'khata_import', v_import_id, auth.uid()
      ) returning id into v_ledger_id;
    else
      insert into public.supplier_ledger_entries (
        supplier_id, entry_date, entry_type, description, reference_no,
        debit, credit, source_type, source_id, created_by
      ) values (
        v_party_id, v_date, 'adjustment', v_label, v_import_no,
        v_payment, v_charge, 'khata_import', v_import_id, auth.uid()
      ) returning id into v_ledger_id;
    end if;

    insert into public.khata_import_lines (
      import_id, line_no, party_id, party_name, entry_date, description,
      charge, payment, ledger_entry_id, fingerprint
    ) values (
      v_import_id, v_idx, v_party_id, v_party_name, v_date, v_desc,
      v_charge, v_payment, v_ledger_id, v_fp
    );

    v_count := v_count + 1;
    v_total_charge  := v_total_charge + v_charge;
    v_total_payment := v_total_payment + v_payment;
    if not (v_party_id = any (v_party_ids)) then
      v_party_ids := array_append(v_party_ids, v_party_id);
    end if;
  end loop;

  if cardinality(v_dups) > 0 and not coalesce(p_force, false) then
    -- Rolls back everything above (parties, ledger rows, number) - nothing is half-posted.
    perform private.raise_error('DUPLICATE_ENTRIES', jsonb_build_object('lines', to_jsonb(v_dups)));
  end if;

  update public.khata_imports
     set entry_count     = v_count,
         party_count     = cardinality(v_party_ids),
         new_party_count = v_new_count,
         total_charges   = v_total_charge,
         total_payments  = v_total_payment
   where id = v_import_id;

  perform private.log_activity('khata_import.posted', 'khata_import', v_import_id,
    'Old khata import ' || v_import_no || ': ' || v_count || ' entries for ' || cardinality(v_party_ids)
      || ' ' || v_type || '(s)' || case when v_new_count > 0 then ' (' || v_new_count || ' new)' else '' end,
    null,
    jsonb_build_object('import_no', v_import_no, 'party_type', v_type, 'entries', v_count,
                       'charges', v_total_charge, 'payments', v_total_payment,
                       'forced_duplicates', cardinality(v_dups)));

  return jsonb_build_object(
    'id', v_import_id, 'import_no', v_import_no, 'party_type', v_type,
    'entry_count', v_count, 'party_count', cardinality(v_party_ids),
    'new_party_count', v_new_count,
    'total_charges', v_total_charge, 'total_payments', v_total_payment);
end;
$$;

grant execute on function public.post_khata_import(jsonb, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. undo_khata_import(): append-only reversal of a whole batch.
--    Each original ledger row stays; an opposite REVERSAL row (same date) is added.
--    Parties created by the import are kept (they may have been used since).
-- -----------------------------------------------------------------------------
create or replace function public.undo_khata_import(p_import_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imp    public.khata_imports%rowtype;
  v_line   public.khata_import_lines%rowtype;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), 'Undone by admin');
  v_orig_c public.customer_ledger_entries%rowtype;
  v_orig_s public.supplier_ledger_entries%rowtype;
  v_n      integer := 0;
begin
  perform private.assert_permission('data.import');

  select * into v_imp from public.khata_imports where id = p_import_id for update;
  if not found then
    perform private.raise_error('KHATA_IMPORT_NOT_FOUND');
  end if;

  if v_imp.status = 'undone' then
    return jsonb_build_object('success', true, 'already_undone', true, 'import_no', v_imp.import_no);
  end if;

  -- Every date must still be in an open period (same rule as cancelling a bill).
  for v_line in select * from public.khata_import_lines where import_id = p_import_id loop
    perform private.assert_period_open(v_line.entry_date);
  end loop;

  for v_line in select * from public.khata_import_lines where import_id = p_import_id order by line_no loop
    if v_imp.party_type = 'customer' then
      select * into v_orig_c from public.customer_ledger_entries where id = v_line.ledger_entry_id;
      if found and not exists (select 1 from public.customer_ledger_entries r where r.reversal_of = v_orig_c.id) then
        insert into public.customer_ledger_entries (
          customer_id, entry_date, entry_type, description, reference_no,
          debit, credit, source_type, source_id, reversal_of, created_by
        ) values (
          v_orig_c.customer_id, v_orig_c.entry_date, 'reversal',
          'Reversal: old khata import ' || v_imp.import_no || ' undone', v_imp.import_no,
          v_orig_c.credit, v_orig_c.debit, 'reversal', p_import_id, v_orig_c.id, auth.uid()
        );
        v_n := v_n + 1;
      end if;
    else
      select * into v_orig_s from public.supplier_ledger_entries where id = v_line.ledger_entry_id;
      if found and not exists (select 1 from public.supplier_ledger_entries r where r.reversal_of = v_orig_s.id) then
        insert into public.supplier_ledger_entries (
          supplier_id, entry_date, entry_type, description, reference_no,
          debit, credit, source_type, source_id, reversal_of, created_by
        ) values (
          v_orig_s.supplier_id, v_orig_s.entry_date, 'reversal',
          'Reversal: old khata import ' || v_imp.import_no || ' undone', v_imp.import_no,
          v_orig_s.credit, v_orig_s.debit, 'reversal', p_import_id, v_orig_s.id, auth.uid()
        );
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  update public.khata_imports
     set status = 'undone', undone_at = now(), undone_by = auth.uid(), undo_reason = v_reason
   where id = p_import_id;

  perform private.log_activity('khata_import.undone', 'khata_import', p_import_id,
    'Old khata import ' || v_imp.import_no || ' undone: ' || v_reason,
    jsonb_build_object('status', 'posted'),
    jsonb_build_object('status', 'undone', 'reversed_entries', v_n, 'reason', v_reason));

  return jsonb_build_object('success', true, 'import_no', v_imp.import_no, 'reversed_entries', v_n);
end;
$$;

grant execute on function public.undo_khata_import(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Supplier opening balance (mirror of post_customer_opening_balance).
--    p_amount > 0 : we owe the supplier (credit).  p_amount < 0 : advance (debit).
-- -----------------------------------------------------------------------------
create or replace function public.post_supplier_opening_balance(
  p_supplier_id uuid,
  p_amount      numeric,
  p_date        date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier public.suppliers%rowtype;
  v_date     date := coalesce(p_date, private.business_today());
  v_entry_id uuid;
begin
  perform private.assert_permission('suppliers.manage');

  select * into v_supplier from public.suppliers where id = p_supplier_id and is_active;
  if not found then
    perform private.raise_error('SUPPLIER_NOT_FOUND');
  end if;

  if p_amount is null or p_amount = 0 then
    perform private.raise_error('INVALID_AMOUNT');
  end if;

  if exists (select 1 from public.supplier_ledger_entries
              where supplier_id = p_supplier_id and entry_type = 'opening_balance') then
    perform private.raise_error('OPENING_BALANCE_EXISTS', jsonb_build_object('supplier_id', p_supplier_id));
  end if;

  insert into public.supplier_ledger_entries (
    supplier_id, entry_date, entry_type, description, reference_no,
    debit, credit, source_type, created_by
  ) values (
    p_supplier_id, v_date, 'opening_balance', 'Opening Payable Balance', 'OPN-BAL',
    greatest(-p_amount, 0), greatest(p_amount, 0), 'opening', auth.uid()
  ) returning id into v_entry_id;

  perform private.log_activity('supplier.opening_balance', 'supplier', p_supplier_id,
    'Opening balance Rs. ' || p_amount || ' posted for ' || v_supplier.name,
    null, jsonb_build_object('amount', p_amount, 'entry_date', v_date));

  return jsonb_build_object('id', v_entry_id, 'supplier_id', p_supplier_id, 'amount', p_amount);
end;
$$;

grant execute on function public.post_supplier_opening_balance(uuid, numeric, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Private storage bucket for the scanned pages (only where Supabase Storage
--    exists - skipped on plain PostgreSQL such as the local test database).
-- -----------------------------------------------------------------------------
do $storage$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('khata-scans', 'khata-scans', false)
    on conflict (id) do nothing;

    execute 'drop policy if exists khata_scans_insert on storage.objects';
    execute 'drop policy if exists khata_scans_select on storage.objects';
    execute $p$
      create policy khata_scans_insert on storage.objects
        for insert to authenticated
        with check (bucket_id = 'khata-scans' and (select private.has_permission('data.import')))
    $p$;
    execute $p$
      create policy khata_scans_select on storage.objects
        for select to authenticated
        using (bucket_id = 'khata-scans' and (select private.has_permission('data.import')))
    $p$;
  end if;
end
$storage$;
