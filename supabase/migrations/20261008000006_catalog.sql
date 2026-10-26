-- =============================================================================
-- 06 · Catalog: categories, subcategories, brands, units, products, variants,
--      variant costs, price history
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Master Tables
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        citext not null unique check (length(btrim(name)) > 0),
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name        text not null check (length(btrim(name)) > 0),
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (category_id, name),
  unique (id, category_id) -- composite key for strictly-typed product FK
);

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        citext not null unique check (length(btrim(name)) > 0),
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.units (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[a-z_]{1,10}$'),
  name          text not null check (length(btrim(name)) > 0),
  allow_decimal boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Seed standard hardware units
insert into public.units (code, name, allow_decimal) values
  ('pcs',  'Pieces',      false),
  ('box',  'Box',         false),
  ('dz',   'Dozen',       false),
  ('kg',   'Kilogram',    true),
  ('ft',   'Feet',        true),
  ('m',    'Meter',       true),
  ('roll', 'Roll',        false),
  ('set',  'Set',         false),
  ('ltr',  'Liter',       true),
  ('pair', 'Pair',        false);

-- -----------------------------------------------------------------------------
-- Products & Variants
-- -----------------------------------------------------------------------------
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) > 0),
  category_id    uuid not null references public.categories (id) on delete restrict,
  subcategory_id uuid references public.subcategories (id) on delete restrict,
  brand_id       uuid references public.brands (id) on delete restrict,
  unit_id        uuid not null references public.units (id) on delete restrict,
  model          text,
  description    text,
  image_path     text,
  has_variants   boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (subcategory_id, category_id) references public.subcategories (id, category_id)
);

create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  sku              citext not null unique check (sku ~ '^[A-Z0-9_-]{3,30}$'),
  barcode          text unique check (barcode is null or length(btrim(barcode)) > 0),
  variant_name     text not null check (length(btrim(variant_name)) > 0),
  size             text,
  material         text,
  color            text,
  grade            text,
  default_rate     numeric(14,2) not null check (default_rate >= 0),
  wholesale_rate   numeric(14,2) not null check (wholesale_rate >= 0),
  retail_rate      numeric(14,2) not null check (retail_rate >= 0),
  min_stock_level  numeric(14,3) not null default 0 check (min_stock_level >= 0),
  is_default       boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- At most one default variant per product
create unique index product_variants_one_default_idx
  on public.product_variants (product_id)
  where is_default;

-- Trigram search indexes
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index product_variants_sku_trgm_idx on public.product_variants using gin (sku gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Variant Costs (Restricted Visibility: view_cost permission required)
-- -----------------------------------------------------------------------------
create table public.variant_costs (
  variant_id            uuid primary key references public.product_variants (id) on delete cascade,
  default_purchase_rate numeric(14,4) not null default 0 check (default_purchase_rate >= 0),
  last_purchase_rate    numeric(14,4) not null default 0 check (last_purchase_rate >= 0),
  average_cost          numeric(14,4) not null default 0 check (average_cost >= 0),
  updated_at            timestamptz not null default now()
);

-- Auto-create 1:1 variant_costs row when a variant is created
create or replace function private.handle_new_variant_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.variant_costs (variant_id, default_purchase_rate, last_purchase_rate, average_cost)
  values (new.id, 0, 0, 0)
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

create trigger on_product_variant_created
  after insert on public.product_variants
  for each row execute function private.handle_new_variant_cost();

-- -----------------------------------------------------------------------------
-- Product Price History Audit
-- -----------------------------------------------------------------------------
create table public.product_price_history (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  field_name  text not null check (field_name in ('default_rate', 'wholesale_rate', 'retail_rate', 'default_purchase_rate')),
  old_rate    numeric(14,4) not null,
  new_rate    numeric(14,4) not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index product_price_history_variant_idx on public.product_price_history (variant_id, changed_at desc);

-- Audit rate changes
create or replace function private.audit_variant_price_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.default_rate is distinct from new.default_rate then
    insert into public.product_price_history (variant_id, field_name, old_rate, new_rate, changed_by)
    values (new.id, 'default_rate', old.default_rate, new.default_rate, auth.uid());
  end if;
  if old.wholesale_rate is distinct from new.wholesale_rate then
    insert into public.product_price_history (variant_id, field_name, old_rate, new_rate, changed_by)
    values (new.id, 'wholesale_rate', old.wholesale_rate, new.wholesale_rate, auth.uid());
  end if;
  if old.retail_rate is distinct from new.retail_rate then
    insert into public.product_price_history (variant_id, field_name, old_rate, new_rate, changed_by)
    values (new.id, 'retail_rate', old.retail_rate, new.retail_rate, auth.uid());
  end if;
  return new;
end;
$$;

create trigger product_variants_audit_prices
  after update on public.product_variants
  for each row execute function private.audit_variant_price_changes();

-- Triggers for updated_at
create trigger categories_set_updated_at    before update on public.categories    for each row execute function private.set_updated_at();
create trigger subcategories_set_updated_at before update on public.subcategories for each row execute function private.set_updated_at();
create trigger brands_set_updated_at        before update on public.brands        for each row execute function private.set_updated_at();
create trigger products_set_updated_at      before update on public.products      for each row execute function private.set_updated_at();
create trigger variants_set_updated_at      before update on public.product_variants for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------------------------------
alter table public.categories        enable row level security;
alter table public.subcategories     enable row level security;
alter table public.brands            enable row level security;
alter table public.units             enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.variant_costs     enable row level security;
alter table public.product_price_history enable row level security;

grant select on public.categories, public.subcategories, public.brands, public.units, public.products, public.product_variants to authenticated;
grant insert, update on public.categories, public.subcategories, public.brands, public.products, public.product_variants to authenticated;
grant select on public.variant_costs, public.product_price_history to authenticated;

-- Policies
create policy categories_select on public.categories for select to authenticated using ((select private.has_permission('catalog.view')));
create policy categories_write  on public.categories for insert to authenticated with check ((select private.has_permission('catalog.manage')));
create policy categories_update on public.categories for update to authenticated using ((select private.has_permission('catalog.manage')));

create policy subcategories_select on public.subcategories for select to authenticated using ((select private.has_permission('catalog.view')));
create policy subcategories_write  on public.subcategories for insert to authenticated with check ((select private.has_permission('catalog.manage')));
create policy subcategories_update on public.subcategories for update to authenticated using ((select private.has_permission('catalog.manage')));

create policy brands_select on public.brands for select to authenticated using ((select private.has_permission('catalog.view')));
create policy brands_write  on public.brands for insert to authenticated with check ((select private.has_permission('catalog.manage')));
create policy brands_update on public.brands for update to authenticated using ((select private.has_permission('catalog.manage')));

create policy units_select on public.units for select to authenticated using ((select private.has_permission('catalog.view')));

create policy products_select on public.products for select to authenticated using ((select private.has_permission('catalog.view')));
create policy products_write  on public.products for insert to authenticated with check ((select private.has_permission('catalog.manage')));
create policy products_update on public.products for update to authenticated using ((select private.has_permission('catalog.manage')));

create policy variants_select on public.product_variants for select to authenticated using ((select private.has_permission('catalog.view')));
create policy variants_write  on public.product_variants for insert to authenticated with check ((select private.has_permission('catalog.manage')));
create policy variants_update on public.product_variants for update to authenticated using ((select private.has_permission('catalog.manage')));

-- Restricted cost visibility (requires catalog.view_cost)
create policy variant_costs_select on public.variant_costs for select to authenticated using ((select private.has_permission('catalog.view_cost')));
create policy price_history_select  on public.product_price_history for select to authenticated using ((select private.has_permission('catalog.view')));
