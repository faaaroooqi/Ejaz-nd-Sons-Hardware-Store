-- =============================================================================
-- 02 · Domain enums
-- =============================================================================

create type public.doc_status        as enum ('posted', 'cancelled');
create type public.payment_status    as enum ('unpaid', 'partial', 'paid');
create type public.payment_method    as enum ('cash', 'bank', 'online', 'cheque', 'other');
-- customer: in = receipt from customer, out = refund to customer
-- supplier: out = payment to supplier,  in  = refund received from supplier
create type public.payment_direction as enum ('in', 'out');
create type public.cheque_status     as enum ('pending', 'cleared', 'bounced');

create type public.movement_type as enum (
  'opening_stock',
  'purchase',
  'purchase_return',
  'sale',
  'sales_return',
  'adjustment'
);

create type public.adjustment_reason as enum (
  'count_correction',
  'damage',
  'loss_theft',
  'found',
  'internal_use',
  'other'
);

create type public.ledger_entry_type as enum (
  'opening_balance',
  'sale',
  'purchase',
  'payment',
  'refund',
  'sales_return',
  'purchase_return',
  'adjustment',
  'reversal'
);

create type public.price_tier        as enum ('default', 'wholesale', 'retail');
create type public.discount_type     as enum ('amount', 'percent');
create type public.account_type      as enum ('cash', 'bank', 'wallet');
create type public.credit_limit_mode as enum ('off', 'warn', 'block');
