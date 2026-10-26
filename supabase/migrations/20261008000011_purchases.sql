-- =============================================================================
-- 11 · Purchases: purchases, purchase_items, supplier_payments, supplier_payment_allocations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Purchases Header Table
-- -----------------------------------------------------------------------------
create table public.purchases (
  id                     uuid primary key default gen_random_uuid(),
  bill_no                text not null unique check (bill_no ~ '^[A-Z0-9_-]{3,30}$'),
  purchase_date          date not null,
  supplier_id            uuid not null references public.suppliers (id) on delete restrict,
  supplier_name_snapshot text not null,
  supplier_invoice_no    text,

  subtotal               numeric(14,2) not null check (subtotal >= 0),
  discount_amount        numeric(14,2) not null default 0 check (discount_amount >= 0),
  freight_charges        numeric(14,2) not null default 0 check (freight_charges >= 0),
  other_charges          numeric(14,2) not null default 0 check (other_charges >= 0),
  grand_total            numeric(14,2) not null check (grand_total >= 0),

  amount_paid            numeric(14,2) not null default 0 check (amount_paid >= 0),
  amount_returned        numeric(14,2) not null default 0 check (amount_returned >= 0),
  balance_due            numeric(14,2) not null check (balance_due >= 0),

  payment_status         public.payment_status not null default 'unpaid',
  status                 public.doc_status not null default 'posted',
  notes                  text,
  replaces_id            uuid references public.purchases (id),
  cancelled_at           timestamptz,
  cancelled_by           uuid references public.profiles (id),
  cancel_reason          text,
  client_request_id      uuid unique,
  created_at             timestamptz not null default now(),
  created_by             uuid references public.profiles (id)
);

create index purchases_date_idx on public.purchases (purchase_date, created_at desc);
create index purchases_supplier_idx on public.purchases (supplier_id, purchase_date);

-- -----------------------------------------------------------------------------
-- Purchase Line Items Table
-- -----------------------------------------------------------------------------
create table public.purchase_items (
  id                    uuid primary key default gen_random_uuid(),
  purchase_id           uuid not null references public.purchases (id) on delete cascade,
  line_no               integer not null,
  variant_id            uuid not null references public.product_variants (id) on delete restrict,
  sku_snapshot          text not null,
  product_name_snapshot text not null,
  unit_code_snapshot    text not null,
  brand_name_snapshot   text,

  quantity              numeric(14,3) not null check (quantity > 0),
  unit_cost             numeric(14,4) not null check (unit_cost >= 0),
  discount_amount       numeric(14,2) not null default 0 check (discount_amount >= 0),
  landed_cost_per_unit  numeric(14,4) not null check (landed_cost_per_unit >= 0),
  line_total            numeric(14,2) not null check (line_total >= 0),
  returned_quantity     numeric(14,3) not null default 0 check (returned_quantity >= 0 and returned_quantity <= quantity),

  unique (purchase_id, line_no)
);

create index purchase_items_variant_idx on public.purchase_items (variant_id);

-- -----------------------------------------------------------------------------
-- Supplier Payments & Purchase Allocations
-- -----------------------------------------------------------------------------
create table public.supplier_payments (
  id                 uuid primary key default gen_random_uuid(),
  voucher_no         text not null unique check (voucher_no ~ '^[A-Z0-9_-]{3,30}$'),
  payment_date       date not null,
  supplier_id        uuid not null references public.suppliers (id) on delete restrict,
  direction          public.payment_direction not null default 'out',
  amount             numeric(14,2) not null check (amount > 0),
  payment_method     public.payment_method not null default 'cash',
  payment_account_id uuid not null references public.payment_accounts (id) on delete restrict,

  cheque_no          text,
  cheque_date        date,
  bank_name          text,
  cheque_status      public.cheque_status,

  purchase_id        uuid references public.purchases (id),
  notes              text,
  status             public.doc_status not null default 'posted',
  voided_at          timestamptz,
  voided_by          uuid references public.profiles (id),
  void_reason        text,
  client_request_id  uuid unique,
  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id)
);

create index supplier_payments_supplier_idx on public.supplier_payments (supplier_id, payment_date);

create table public.supplier_payment_allocations (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references public.supplier_payments (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete restrict,
  amount      numeric(14,2) not null check (amount > 0),
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.purchases                    enable row level security;
alter table public.purchase_items               enable row level security;
alter table public.supplier_payments            enable row level security;
alter table public.supplier_payment_allocations enable row level security;

grant select on public.purchases, public.purchase_items, public.supplier_payments, public.supplier_payment_allocations to authenticated;

create policy purchases_select on public.purchases for select to authenticated using ((select private.has_permission('purchases.view')));
create policy purchase_items_select on public.purchase_items for select to authenticated using ((select private.has_permission('purchases.view')));
create policy supplier_payments_select on public.supplier_payments for select to authenticated using ((select private.has_permission('supplier_payments.view')));
create policy supplier_allocs_select on public.supplier_payment_allocations for select to authenticated using ((select private.has_permission('supplier_payments.view')));
