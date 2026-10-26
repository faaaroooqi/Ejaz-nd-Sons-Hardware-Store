-- =============================================================================
-- 08 · Payment Accounts & Expenses
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Payment Accounts
-- -----------------------------------------------------------------------------
create table public.payment_accounts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(btrim(name)) > 0),
  account_type    public.account_type not null,
  bank_name       text,
  account_no      text,
  opening_balance numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed standard accounts
insert into public.payment_accounts (id, name, account_type) values
  ('00000000-0000-0000-0000-000000000010', 'Cash in Hand (Counter)', 'cash'),
  ('00000000-0000-0000-0000-000000000011', 'Main Bank Account', 'bank');

-- -----------------------------------------------------------------------------
-- Expense Categories
-- -----------------------------------------------------------------------------
create table public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        citext not null unique check (length(btrim(name)) > 0),
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed hardware store expense categories
insert into public.expense_categories (name, description) values
  ('Shop Rent',            'Monthly shop & godown rent'),
  ('Electricity & Utility','K-Electric, Water, Sui Gas bills'),
  ('Staff Salaries',       'Shop staff & helper wages'),
  ('Transport & Freight',  'Goods transport & delivery charges'),
  ('Loading / Unloading',  'Labor loading and unloading charges'),
  ('Shop Maintenance',     'Repairs, stationery, tea & shop expenses'),
  ('Internet & Phone',     'Broadband, mobile recharge'),
  ('Miscellaneous',        'Other shop operating expenses');

-- -----------------------------------------------------------------------------
-- Expenses
-- -----------------------------------------------------------------------------
create table public.expenses (
  id                 uuid primary key default gen_random_uuid(),
  expense_no         text not null unique check (expense_no ~ '^[A-Z0-9_-]{3,20}$'),
  expense_date       date not null,
  category_id        uuid not null references public.expense_categories (id) on delete restrict,
  amount             numeric(14,2) not null check (amount > 0),
  payment_method     public.payment_method not null default 'cash',
  payment_account_id uuid not null references public.payment_accounts (id) on delete restrict,
  paid_to            text,
  description        text not null check (length(btrim(description)) > 0),
  attachment_path    text,
  status             public.doc_status not null default 'posted',
  voided_at          timestamptz,
  voided_by          uuid references public.profiles (id),
  void_reason        text,
  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id)
);

create index expenses_date_idx on public.expenses (expense_date, created_at desc);

-- Triggers for updated_at
create trigger payment_accounts_set_updated_at before update on public.payment_accounts for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------------------------------
alter table public.payment_accounts   enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses           enable row level security;

grant select on public.payment_accounts, public.expense_categories, public.expenses to authenticated;
grant insert, update on public.payment_accounts, public.expense_categories to authenticated;

create policy payment_accounts_select on public.payment_accounts for select to authenticated using ((select private.has_permission('accounts.view')));
create policy payment_accounts_write  on public.payment_accounts for insert to authenticated with check ((select private.has_permission('accounts.manage')));
create policy payment_accounts_update on public.payment_accounts for update to authenticated using ((select private.has_permission('accounts.manage')));

create policy expense_categories_select on public.expense_categories for select to authenticated using ((select private.has_permission('expenses.view')));
create policy expense_categories_write  on public.expense_categories for insert to authenticated with check ((select private.has_permission('expenses.create')));

create policy expenses_select on public.expenses for select to authenticated using ((select private.has_permission('expenses.view')));
-- Expense inserts/voids happen via RPC function (migration 18)
