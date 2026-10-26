-- =============================================================================
-- 07 · Parties & Khata: customers, suppliers, customer_balances, supplier_balances,
--      customer_ledger_entries, supplier_ledger_entries
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Customer Master
-- -----------------------------------------------------------------------------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name          text not null check (length(btrim(name)) > 0),
  business_name text,
  phone         text not null check (length(btrim(phone)) > 0),
  alt_phone     text,
  cnic          text,
  address       text,
  city          text not null default 'Karachi',
  area          text,
  price_tier    public.price_tier not null default 'default',
  credit_limit  numeric(14,2) not null default 0 check (credit_limit >= 0),
  is_walk_in    boolean not null default false,
  is_active     boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index customers_phone_idx on public.customers (phone);
create index customers_name_trgm_idx on public.customers using gin (name gin_trgm_ops);

-- Seed Walk-in / Cash Customer system row
insert into public.customers (id, code, name, phone, is_walk_in, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'C-WALKIN', 'Walk-in Cash Customer', '00000000000', true, true);

-- -----------------------------------------------------------------------------
-- Supplier Master
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name          text not null check (length(btrim(name)) > 0),
  company_name  text,
  phone         text not null check (length(btrim(phone)) > 0),
  alt_phone     text,
  ntn           text,
  address       text,
  city          text not null default 'Karachi',
  is_active     boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index suppliers_phone_idx on public.suppliers (phone);
create index suppliers_name_trgm_idx on public.suppliers using gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Customer Balance & Ledger (Receivable / Lena)
-- Balance = SUM(debit - credit)
--   > 0 : Customer owes us (Receivable)
--   < 0 : We owe customer (Advance)
-- -----------------------------------------------------------------------------
create table public.customer_balances (
  customer_id      uuid primary key references public.customers (id) on delete restrict,
  current_balance  numeric(14,2) not null default 0,
  last_entry_date  date,
  updated_at       timestamptz not null default now()
);

create table public.customer_ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete restrict,
  entry_date   date not null,
  entry_type   public.ledger_entry_type not null,
  description  text not null,
  reference_no text,
  debit        numeric(14,2) not null default 0 check (debit >= 0),
  credit       numeric(14,2) not null default 0 check (credit >= 0),
  source_type  text not null check (source_type in ('sale', 'payment', 'return', 'opening', 'reversal')),
  source_id    uuid,
  reversal_of  uuid unique references public.customer_ledger_entries (id),
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index customer_ledger_party_idx on public.customer_ledger_entries (customer_id, entry_date, created_at);

-- Trigger to maintain customer_balances cache
create or replace function private.maintain_customer_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_balances (customer_id, current_balance, last_entry_date)
  values (new.customer_id, new.debit - new.credit, new.entry_date)
  on conflict (customer_id) do update set
    current_balance = customer_balances.current_balance + (new.debit - new.credit),
    last_entry_date = greatest(customer_balances.last_entry_date, new.entry_date),
    updated_at = now();
  return new;
end;
$$;

create trigger customer_ledger_after_insert
  after insert on public.customer_ledger_entries
  for each row execute function private.maintain_customer_balance();

-- Immutable guard for ledger entries
create trigger customer_ledger_immutable
  before update or delete on public.customer_ledger_entries
  for each row execute function private.prevent_modification();

-- -----------------------------------------------------------------------------
-- Supplier Balance & Ledger (Payable / Dena)
-- Balance = SUM(credit - debit)
--   > 0 : We owe supplier (Payable)
--   < 0 : Supplier owes us (Advance)
-- -----------------------------------------------------------------------------
create table public.supplier_balances (
  supplier_id      uuid primary key references public.suppliers (id) on delete restrict,
  current_balance  numeric(14,2) not null default 0,
  last_entry_date  date,
  updated_at       timestamptz not null default now()
);

create table public.supplier_ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers (id) on delete restrict,
  entry_date   date not null,
  entry_type   public.ledger_entry_type not null,
  description  text not null,
  reference_no text,
  debit        numeric(14,2) not null default 0 check (debit >= 0),
  credit       numeric(14,2) not null default 0 check (credit >= 0),
  source_type  text not null check (source_type in ('purchase', 'payment', 'return', 'opening', 'reversal')),
  source_id    uuid,
  reversal_of  uuid unique references public.supplier_ledger_entries (id),
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index supplier_ledger_party_idx on public.supplier_ledger_entries (supplier_id, entry_date, created_at);

-- Trigger to maintain supplier_balances cache
create or replace function private.maintain_supplier_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.supplier_balances (supplier_id, current_balance, last_entry_date)
  values (new.supplier_id, new.credit - new.debit, new.entry_date)
  on conflict (supplier_id) do update set
    current_balance = supplier_balances.current_balance + (new.credit - new.debit),
    last_entry_date = greatest(supplier_balances.last_entry_date, new.entry_date),
    updated_at = now();
  return new;
end;
$$;

create trigger supplier_ledger_after_insert
  after insert on public.supplier_ledger_entries
  for each row execute function private.maintain_supplier_balance();

-- Immutable guard for supplier ledger entries
create trigger supplier_ledger_immutable
  before update or delete on public.supplier_ledger_entries
  for each row execute function private.prevent_modification();

-- Triggers for updated_at
create trigger customers_set_updated_at before update on public.customers for each row execute function private.set_updated_at();
create trigger suppliers_set_updated_at before update on public.suppliers for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------------------------------
alter table public.customers               enable row level security;
alter table public.suppliers               enable row level security;
alter table public.customer_balances       enable row level security;
alter table public.supplier_balances       enable row level security;
alter table public.customer_ledger_entries enable row level security;
alter table public.supplier_ledger_entries enable row level security;

grant select on public.customers, public.suppliers to authenticated;
grant insert, update on public.customers, public.suppliers to authenticated;
grant select on public.customer_balances, public.supplier_balances to authenticated;
grant select on public.customer_ledger_entries, public.supplier_ledger_entries to authenticated;

create policy customers_select on public.customers for select to authenticated using ((select private.has_permission('customers.view')));
create policy customers_write  on public.customers for insert to authenticated with check ((select private.has_permission('customers.manage')));
create policy customers_update on public.customers for update to authenticated using ((select private.has_permission('customers.manage')));

create policy suppliers_select on public.suppliers for select to authenticated using ((select private.has_permission('suppliers.view')));
create policy suppliers_write  on public.suppliers for insert to authenticated with check ((select private.has_permission('suppliers.manage')));
create policy suppliers_update on public.suppliers for update to authenticated using ((select private.has_permission('suppliers.manage')));

create policy customer_balances_select on public.customer_balances for select to authenticated using ((select private.has_permission('customers.ledger')));
create policy supplier_balances_select on public.supplier_balances for select to authenticated using ((select private.has_permission('suppliers.ledger')));

create policy customer_ledger_select on public.customer_ledger_entries for select to authenticated using ((select private.has_permission('customers.ledger')));
create policy supplier_ledger_select on public.supplier_ledger_entries for select to authenticated using ((select private.has_permission('suppliers.ledger')));
