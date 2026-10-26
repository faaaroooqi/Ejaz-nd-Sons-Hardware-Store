-- =============================================================================
-- 10 · Sales: sales, sale_items, customer_payments, customer_payment_allocations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sales Header Table
-- -----------------------------------------------------------------------------
create table public.sales (
  id                     uuid primary key default gen_random_uuid(),
  invoice_no             text not null unique check (invoice_no ~ '^[A-Z0-9_-]{3,30}$'),
  sale_date              date not null,
  customer_id            uuid references public.customers (id) on delete restrict,
  customer_name_snapshot text not null,
  customer_phone_snapshot text,
  price_tier_snapshot    public.price_tier not null default 'default',

  subtotal               numeric(14,2) not null check (subtotal >= 0),
  discount_amount        numeric(14,2) not null default 0 check (discount_amount >= 0),
  additional_charges     numeric(14,2) not null default 0 check (additional_charges >= 0),
  grand_total            numeric(14,2) not null check (grand_total >= 0),

  amount_paid            numeric(14,2) not null default 0 check (amount_paid >= 0),
  amount_returned        numeric(14,2) not null default 0 check (amount_returned >= 0),
  balance_due            numeric(14,2) not null check (balance_due >= 0),

  payment_status         public.payment_status not null default 'unpaid',
  status                 public.doc_status not null default 'posted',
  notes                  text,
  replaces_id            uuid references public.sales (id),
  cancelled_at           timestamptz,
  cancelled_by           uuid references public.profiles (id),
  cancel_reason          text,
  client_request_id      uuid unique, -- Idempotency key
  created_at             timestamptz not null default now(),
  created_by             uuid references public.profiles (id),

  -- Walk-in customers must be fully paid at posting time
  check (customer_id is not null or balance_due = 0)
);

create index sales_date_idx on public.sales (sale_date, created_at desc);
create index sales_customer_idx on public.sales (customer_id, sale_date);

-- -----------------------------------------------------------------------------
-- Sale Items Table (Snapshots product rates at invoice creation)
-- -----------------------------------------------------------------------------
create table public.sale_items (
  id                    uuid primary key default gen_random_uuid(),
  sale_id               uuid not null references public.sales (id) on delete cascade,
  line_no               integer not null,
  variant_id            uuid not null references public.product_variants (id) on delete restrict,
  sku_snapshot          text not null,
  product_name_snapshot text not null,
  unit_code_snapshot    text not null,
  brand_name_snapshot   text,

  quantity              numeric(14,3) not null check (quantity > 0),
  default_rate          numeric(14,2) not null check (default_rate >= 0),
  rate                  numeric(14,2) not null check (rate >= 0),
  discount_amount       numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total            numeric(14,2) not null check (line_total >= 0),
  net_unit_price        numeric(14,4) not null check (net_unit_price >= 0),
  returned_quantity     numeric(14,3) not null default 0 check (returned_quantity >= 0 and returned_quantity <= quantity),

  unique (sale_id, line_no)
);

create index sale_items_variant_idx on public.sale_items (variant_id);

-- -----------------------------------------------------------------------------
-- Customer Payments & Invoice Allocations
-- -----------------------------------------------------------------------------
create table public.customer_payments (
  id                 uuid primary key default gen_random_uuid(),
  receipt_no         text not null unique check (receipt_no ~ '^[A-Z0-9_-]{3,30}$'),
  payment_date       date not null,
  customer_id        uuid references public.customers (id) on delete restrict,
  direction          public.payment_direction not null default 'in',
  amount             numeric(14,2) not null check (amount > 0),
  payment_method     public.payment_method not null default 'cash',
  payment_account_id uuid not null references public.payment_accounts (id) on delete restrict,

  cheque_no          text,
  cheque_date        date,
  bank_name          text,
  cheque_status      public.cheque_status,

  sale_id            uuid references public.sales (id), -- Optional direct invoice link
  notes              text,
  status             public.doc_status not null default 'posted',
  voided_at          timestamptz,
  voided_by          uuid references public.profiles (id),
  void_reason        text,
  client_request_id  uuid unique,
  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id)
);

create index customer_payments_customer_idx on public.customer_payments (customer_id, payment_date);

create table public.customer_payment_allocations (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references public.customer_payments (id) on delete cascade,
  sale_id     uuid not null references public.sales (id) on delete restrict,
  amount      numeric(14,2) not null check (amount > 0),
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.sales                       enable row level security;
alter table public.sale_items                  enable row level security;
alter table public.customer_payments           enable row level security;
alter table public.customer_payment_allocations enable row level security;

grant select on public.sales, public.sale_items, public.customer_payments, public.customer_payment_allocations to authenticated;

create policy sales_select       on public.sales for select to authenticated using ((select private.has_permission('sales.view')));
create policy sale_items_select  on public.sale_items for select to authenticated using ((select private.has_permission('sales.view')));
create policy payments_select    on public.customer_payments for select to authenticated using ((select private.has_permission('customer_payments.view')));
create policy allocs_select      on public.customer_payment_allocations for select to authenticated using ((select private.has_permission('customer_payments.view')));
