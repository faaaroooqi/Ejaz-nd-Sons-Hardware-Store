-- =============================================================================
-- 12 · Returns: sales_returns, sale_return_items, purchase_returns, purchase_return_items
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sales Returns Header & Line Items
-- -----------------------------------------------------------------------------
create table public.sales_returns (
  id                uuid primary key default gen_random_uuid(),
  return_no         text not null unique check (return_no ~ '^[A-Z0-9_-]{3,30}$'),
  return_date       date not null,
  sale_id           uuid references public.sales (id) on delete restrict,
  customer_id       uuid not null references public.customers (id) on delete restrict,
  customer_name_snapshot text not null,
  subtotal          numeric(14,2) not null check (subtotal >= 0),
  refund_amount     numeric(14,2) not null default 0 check (refund_amount >= 0),
  payment_account_id uuid references public.payment_accounts (id) on delete restrict,
  status            public.doc_status not null default 'posted',
  notes             text,
  client_request_id uuid unique,
  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id)
);

create table public.sale_return_items (
  id           uuid primary key default gen_random_uuid(),
  return_id    uuid not null references public.sales_returns (id) on delete cascade,
  sale_item_id uuid references public.sale_items (id) on delete restrict,
  variant_id   uuid not null references public.product_variants (id) on delete restrict,
  quantity     numeric(14,3) not null check (quantity > 0),
  rate         numeric(14,2) not null check (rate >= 0),
  line_total   numeric(14,2) not null check (line_total >= 0)
);

-- -----------------------------------------------------------------------------
-- Purchase Returns Header & Line Items
-- -----------------------------------------------------------------------------
create table public.purchase_returns (
  id                uuid primary key default gen_random_uuid(),
  return_no         text not null unique check (return_no ~ '^[A-Z0-9_-]{3,30}$'),
  return_date       date not null,
  purchase_id       uuid references public.purchases (id) on delete restrict,
  supplier_id       uuid not null references public.suppliers (id) on delete restrict,
  supplier_name_snapshot text not null,
  subtotal          numeric(14,2) not null check (subtotal >= 0),
  refund_amount     numeric(14,2) not null default 0 check (refund_amount >= 0),
  payment_account_id uuid references public.payment_accounts (id) on delete restrict,
  status            public.doc_status not null default 'posted',
  notes             text,
  client_request_id uuid unique,
  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id)
);

create table public.purchase_return_items (
  id               uuid primary key default gen_random_uuid(),
  return_id        uuid not null references public.purchase_returns (id) on delete cascade,
  purchase_item_id uuid references public.purchase_items (id) on delete restrict,
  variant_id       uuid not null references public.product_variants (id) on delete restrict,
  quantity         numeric(14,3) not null check (quantity > 0),
  unit_cost        numeric(14,4) not null check (unit_cost >= 0),
  line_total       numeric(14,2) not null check (line_total >= 0)
);

-- RLS
alter table public.sales_returns         enable row level security;
alter table public.sale_return_items     enable row level security;
alter table public.purchase_returns      enable row level security;
alter table public.purchase_return_items enable row level security;

grant select on public.sales_returns, public.sale_return_items, public.purchase_returns, public.purchase_return_items to authenticated;

create policy sales_returns_select on public.sales_returns for select to authenticated using ((select private.has_permission('sales_returns.view')));
create policy sale_return_items_select on public.sale_return_items for select to authenticated using ((select private.has_permission('sales_returns.view')));
create policy purchase_returns_select on public.purchase_returns for select to authenticated using ((select private.has_permission('purchase_returns.view')));
create policy purchase_return_items_select on public.purchase_return_items for select to authenticated using ((select private.has_permission('purchase_returns.view')));
