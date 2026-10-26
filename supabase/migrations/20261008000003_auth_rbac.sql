-- =============================================================================
-- 03 · Roles, permissions, profiles, permission helpers, auth user trigger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z][a-z_]*$'),
  name        text not null check (length(btrim(name)) > 0),
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.permissions (
  code        text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
  module      text not null,
  description text not null,
  sort_order  integer not null default 0
);

create table public.role_permissions (
  role_id         uuid not null references public.roles (id) on delete cascade,
  permission_code text not null references public.permissions (code) on delete cascade,
  granted_at      timestamptz not null default now(),
  primary key (role_id, permission_code)
);

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (length(btrim(full_name)) > 0),
  email      text,
  phone      text,
  role_id    uuid not null references public.roles (id) on delete restrict,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_id_idx on public.profiles (role_id);

create trigger roles_set_updated_at    before update on public.roles    for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Seed: system roles
-- -----------------------------------------------------------------------------
insert into public.roles (code, name, description, is_system) values
  ('admin',     'Owner / Admin',   'Full access to every module and setting.', true),
  ('sales',     'Sales Staff',     'Sales, customers, customer payments and permitted customer information.', true),
  ('inventory', 'Inventory Staff', 'Products, inventory, purchases and stock operations.', true);

-- -----------------------------------------------------------------------------
-- Seed: permission catalogue (all modules, defined up-front)
-- -----------------------------------------------------------------------------
insert into public.permissions (code, module, description, sort_order) values
  ('dashboard.view',            'dashboard',         'View operational dashboard', 10),
  ('dashboard.financials',      'dashboard',         'View financial dashboard tiles (cash, receivables, payables, stock value)', 11),

  ('catalog.view',              'catalog',           'View products, categories and brands', 20),
  ('catalog.manage',            'catalog',           'Create and edit products, categories and brands', 21),
  ('catalog.manage_prices',     'catalog',           'Change sale / wholesale / retail rates of existing products', 22),
  ('catalog.view_cost',         'catalog',           'View purchase rates and average cost', 23),

  ('inventory.view',            'inventory',         'View stock quantities', 30),
  ('inventory.view_movements',  'inventory',         'View stock movement history', 31),
  ('inventory.adjust',          'inventory',         'Post opening stock and stock adjustments', 32),

  ('customers.view',            'customers',         'View customers', 40),
  ('customers.manage',          'customers',         'Create and edit customers', 41),
  ('customers.ledger',          'customers',         'View customer khata / ledger and balances', 42),
  ('customers.credit_limit',    'customers',         'Set customer credit limits', 43),

  ('suppliers.view',            'suppliers',         'View suppliers', 50),
  ('suppliers.manage',          'suppliers',         'Create and edit suppliers', 51),
  ('suppliers.ledger',          'suppliers',         'View supplier khata / ledger and balances', 52),

  ('sales.view',                'sales',             'View sales invoices', 60),
  ('sales.create',              'sales',             'Create sales invoices', 61),
  ('sales.edit_rate',           'sales',             'Change the rate on a sale line', 62),
  ('sales.cancel',              'sales',             'Cancel sales invoices', 63),
  ('sales.backdate',            'sales',             'Post sales beyond the backdate limit', 64),

  ('sales_returns.view',        'sales_returns',     'View sales returns', 70),
  ('sales_returns.create',      'sales_returns',     'Create sales returns', 71),
  ('sales_returns.cancel',      'sales_returns',     'Cancel sales returns', 72),
  ('sales_returns.unlinked',    'sales_returns',     'Create returns not linked to an invoice', 73),

  ('customer_payments.view',    'customer_payments', 'View customer payments', 80),
  ('customer_payments.create',  'customer_payments', 'Receive customer payments / refunds', 81),
  ('customer_payments.void',    'customer_payments', 'Void customer payments, mark cheques bounced', 82),

  ('purchases.view',            'purchases',         'View purchases', 90),
  ('purchases.create',          'purchases',         'Create purchases', 91),
  ('purchases.cancel',          'purchases',         'Cancel purchases', 92),
  ('purchases.backdate',        'purchases',         'Post purchases beyond the backdate limit', 93),

  ('purchase_returns.view',     'purchase_returns',  'View purchase returns', 100),
  ('purchase_returns.create',   'purchase_returns',  'Create purchase returns', 101),
  ('purchase_returns.cancel',   'purchase_returns',  'Cancel purchase returns', 102),

  ('supplier_payments.view',    'supplier_payments', 'View supplier payments', 110),
  ('supplier_payments.create',  'supplier_payments', 'Pay suppliers / record supplier refunds', 111),
  ('supplier_payments.void',    'supplier_payments', 'Void supplier payments, mark cheques bounced', 112),

  ('expenses.view',             'expenses',          'View expenses', 120),
  ('expenses.create',           'expenses',          'Record expenses', 121),
  ('expenses.void',             'expenses',          'Void expenses', 122),

  ('accounts.view',             'accounts',          'View payment accounts (cash / bank / wallet)', 130),
  ('accounts.manage',           'accounts',          'Manage payment accounts', 131),

  ('reports.sales',             'reports',           'Sales reports', 140),
  ('reports.purchases',         'reports',           'Purchase reports', 141),
  ('reports.inventory',         'reports',           'Inventory reports', 142),
  ('reports.financial',         'reports',           'Financial reports (receivables, payables, cash flow, expenses)', 143),
  ('reports.profit',            'reports',           'Estimated gross profit report', 144),

  ('users.manage',              'admin',             'Manage users and role permissions', 150),
  ('settings.manage',           'admin',             'Change business settings', 151),
  ('audit.view',                'admin',             'View activity / audit log', 152),
  ('data.import',               'admin',             'Import data from CSV / Excel', 153),
  ('data.export',               'admin',             'Export data to CSV / Excel', 154);

-- Admin: every permission (admin also bypasses checks in has_permission).
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p where r.code = 'admin';

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view',
  'catalog.view',
  'inventory.view',
  'customers.view', 'customers.manage', 'customers.ledger',
  'sales.view', 'sales.create', 'sales.edit_rate',
  'sales_returns.view', 'sales_returns.create',
  'customer_payments.view', 'customer_payments.create',
  'reports.sales',
  'data.export'
)
where r.code = 'sales';

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view',
  'catalog.view', 'catalog.manage', 'catalog.view_cost',
  'inventory.view', 'inventory.view_movements', 'inventory.adjust',
  'suppliers.view', 'suppliers.manage',
  'purchases.view', 'purchases.create',
  'purchase_returns.view', 'purchase_returns.create',
  'reports.purchases', 'reports.inventory',
  'data.export'
)
where r.code = 'inventory';

-- -----------------------------------------------------------------------------
-- Permission helpers (SECURITY DEFINER, STABLE, empty search_path)
-- -----------------------------------------------------------------------------
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function private.current_role_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.code
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active;
$$;

create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and p.is_active
      and (
        r.code = 'admin'
        or exists (
          select 1 from public.role_permissions rp
          where rp.role_id = p.role_id and rp.permission_code = p_permission
        )
      )
  );
$$;

create or replace function private.assert_permission(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission(p_permission) then
    perform private.raise_error('PERMISSION_DENIED', jsonb_build_object('permission', p_permission));
  end if;
end;
$$;

grant execute on function private.is_active_user()          to authenticated;
grant execute on function private.current_role_code()       to authenticated;
grant execute on function private.has_permission(text)      to authenticated;
grant execute on function private.assert_permission(text)   to authenticated;

-- -----------------------------------------------------------------------------
-- Public RPC: the signed-in user's access profile (used by the frontend to
-- render navigation; the database still enforces everything independently).
-- -----------------------------------------------------------------------------
create or replace function public.get_my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id',     p.id,
    'full_name',   p.full_name,
    'email',       p.email,
    'phone',       p.phone,
    'is_active',   p.is_active,
    'role_code',   r.code,
    'role_name',   r.name,
    'permissions', case
      when not p.is_active then '[]'::jsonb
      when r.code = 'admin' then (select coalesce(jsonb_agg(code order by sort_order), '[]'::jsonb) from public.permissions)
      else (
        select coalesce(jsonb_agg(rp.permission_code order by pm.sort_order), '[]'::jsonb)
        from public.role_permissions rp
        join public.permissions pm on pm.code = rp.permission_code
        where rp.role_id = p.role_id
      )
    end
  )
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission(p_permission);
$$;

grant execute on function public.get_my_access()        to authenticated;
grant execute on function public.has_permission(text)   to authenticated;

-- -----------------------------------------------------------------------------
-- New auth user → profile.
-- Role and activation come ONLY from raw_app_meta_data (not user-editable).
-- Accounts created without an app_metadata role are INACTIVE (no access).
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_code text := new.raw_app_meta_data ->> 'role';
  v_role_id   uuid;
  v_active    boolean := false;
begin
  if v_role_code is not null then
    select id into v_role_id from public.roles where code = v_role_code;
    v_active := v_role_id is not null;
  end if;

  if v_role_id is null then
    select id into v_role_id from public.roles where code = 'sales';
  end if;

  insert into public.profiles (id, full_name, email, phone, role_id, is_active)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    v_role_id,
    v_active
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profile email in sync when the auth email changes.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Guard: there must always be at least one active admin.
-- -----------------------------------------------------------------------------
create or replace function private.ensure_active_admin_remains()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_role uuid;
begin
  select id into v_admin_role from public.roles where code = 'admin';

  if old.role_id = v_admin_role and old.is_active
     and (new.role_id <> v_admin_role or not new.is_active) then
    if not exists (
      select 1 from public.profiles
      where id <> old.id and role_id = v_admin_role and is_active
    ) then
      perform private.raise_error('LAST_ADMIN', jsonb_build_object('user_id', old.id));
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_ensure_admin
  before update of role_id, is_active on public.profiles
  for each row execute function private.ensure_active_admin_remains();

-- -----------------------------------------------------------------------------
-- One-time bootstrap (run from the SQL editor as postgres; not granted to API):
--   select private.bootstrap_first_admin('owner@example.com');
-- Only works while there is no active admin.
-- -----------------------------------------------------------------------------
create or replace function private.bootstrap_first_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_role uuid;
  v_user_id    uuid;
begin
  select id into v_admin_role from public.roles where code = 'admin';

  if exists (select 1 from public.profiles where role_id = v_admin_role and is_active) then
    perform private.raise_error('ADMIN_ALREADY_EXISTS');
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    perform private.raise_error('USER_NOT_FOUND', jsonb_build_object('email', p_email));
  end if;

  update public.profiles set role_id = v_admin_role, is_active = true where id = v_user_id;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
   where id = v_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles         enable row level security;

grant select on public.roles, public.permissions, public.role_permissions to authenticated;
grant select on public.profiles to authenticated;
-- Users may edit only their own name and phone.
grant update (full_name, phone) on public.profiles to authenticated;

create policy roles_select on public.roles
  for select to authenticated
  using ((select private.is_active_user()));

create policy permissions_select on public.permissions
  for select to authenticated
  using ((select private.is_active_user()));

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using ((select private.is_active_user()));

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('users.manage')));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
