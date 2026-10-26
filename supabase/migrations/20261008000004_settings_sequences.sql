-- =============================================================================
-- 04 · Business settings, document numbering, posting-date guards
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings (single row, typed columns)
-- -----------------------------------------------------------------------------
create table public.settings (
  id                      smallint primary key default 1 check (id = 1),
  business_name           text not null default 'My Hardware Store' check (length(btrim(business_name)) > 0),
  business_tagline        text,
  business_address        text,
  business_city           text,
  business_phone          text,
  business_phone_alt      text,
  business_email          text,
  business_ntn            text,
  logo_path               text,

  currency_code           text not null default 'PKR',
  currency_symbol         text not null default 'Rs.',
  number_grouping         text not null default 'international' check (number_grouping in ('international', 'lakh')),
  date_format             text not null default 'dd/MM/yyyy' check (date_format in ('dd/MM/yyyy', 'dd-MM-yyyy', 'dd MMM yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy')),
  timezone                text not null default 'Asia/Karachi',
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),

  allow_negative_stock    boolean not null default false,
  credit_limit_mode       public.credit_limit_mode not null default 'warn',
  books_locked_until      date,
  backdate_limit_days     integer not null default 3 check (backdate_limit_days between 0 and 3650),

  invoice_terms           text default 'Goods once sold will only be returned or exchanged as per shop policy.',
  invoice_footer          text default 'Thank you for your business!',
  default_print_format    text not null default 'a4' check (default_print_format in ('a4', 'thermal80')),
  show_previous_balance_on_invoice boolean not null default true,

  updated_at              timestamptz not null default now(),
  updated_by              uuid references public.profiles (id)
);

insert into public.settings (id) values (1);

create trigger settings_set_updated_at before update on public.settings
  for each row execute function private.set_updated_at();

alter table public.settings enable row level security;
grant select on public.settings to authenticated;

create policy settings_select on public.settings
  for select to authenticated
  using ((select private.is_active_user()));
-- No UPDATE policy: changes go through public.admin_update_settings() (migration 05).

-- -----------------------------------------------------------------------------
-- Document numbering
-- -----------------------------------------------------------------------------
create table public.document_types (
  code        text primary key check (code ~ '^[a-z_]+$'),
  prefix      text not null check (prefix ~ '^[A-Z0-9]{1,8}$'),
  description text not null,
  yearly      boolean not null default true,
  pad_length  smallint not null default 6 check (pad_length between 3 and 10)
);

insert into public.document_types (code, prefix, description, yearly, pad_length) values
  ('sale',             'INV', 'Sales invoice',            true,  6),
  ('purchase',         'PUR', 'Purchase',                 true,  6),
  ('sales_return',     'SR',  'Sales return',             true,  5),
  ('purchase_return',  'PR',  'Purchase return',          true,  5),
  ('customer_payment', 'RCV', 'Customer payment / refund', true, 6),
  ('supplier_payment', 'PAY', 'Supplier payment / refund', true, 6),
  ('expense',          'EXP', 'Expense',                  true,  5),
  ('stock_adjustment', 'ADJ', 'Stock adjustment',         true,  5),
  ('customer',         'C',   'Customer code',            false, 5),
  ('supplier',         'S',   'Supplier code',            false, 5);

create table public.document_sequences (
  doc_type    text not null references public.document_types (code),
  fiscal_year integer not null check (fiscal_year >= 0),
  next_value  bigint not null default 1 check (next_value > 0),
  updated_at  timestamptz not null default now(),
  primary key (doc_type, fiscal_year)
);

alter table public.document_types     enable row level security;
alter table public.document_sequences enable row level security;
grant select on public.document_types to authenticated;

create policy document_types_select on public.document_types
  for select to authenticated
  using ((select private.is_active_user()));
-- document_sequences: no client access at all.

-- Business "today" in the configured timezone.
create or replace function private.business_today()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce((select timezone from public.settings where id = 1), 'Asia/Karachi'))::date;
$$;

grant execute on function private.business_today() to authenticated;

-- Fiscal year label for a date (e.g. FY starting July: 2026-08-01 → 2026, 2027-02-01 → 2026).
create or replace function private.fiscal_year_of(p_date date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select extract(year from p_date)::int
       - case when extract(month from p_date)::int < coalesce((select fiscal_year_start_month from public.settings where id = 1), 1)
              then 1 else 0 end;
$$;

-- Next document number. The UPDATE row-locks the sequence until the calling
-- transaction ends, so numbers are unique and gapless (rollback = no gap).
create or replace function private.next_document_no(p_doc_type text, p_date date default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type  public.document_types%rowtype;
  v_year  integer;
  v_value bigint;
begin
  select * into v_type from public.document_types where code = p_doc_type;
  if not found then
    perform private.raise_error('UNKNOWN_DOCUMENT_TYPE', jsonb_build_object('doc_type', p_doc_type));
  end if;

  v_year := case when v_type.yearly
                 then private.fiscal_year_of(coalesce(p_date, private.business_today()))
                 else 0 end;

  insert into public.document_sequences (doc_type, fiscal_year)
  values (p_doc_type, v_year)
  on conflict (doc_type, fiscal_year) do nothing;

  update public.document_sequences
     set next_value = next_value + 1,
         updated_at = now()
   where doc_type = p_doc_type and fiscal_year = v_year
  returning next_value - 1 into v_value;

  return v_type.prefix
      || case when v_type.yearly then '-' || v_year::text else '' end
      || '-' || lpad(v_value::text, v_type.pad_length, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- Posting-date guard used by every posting function.
--   * Never on/before books_locked_until (applies to everyone, incl. admin).
--   * Not in the future.
--   * Not older than backdate_limit_days unless the caller has p_backdate_permission.
-- -----------------------------------------------------------------------------
create or replace function private.assert_posting_date(p_date date, p_backdate_permission text default null)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.settings%rowtype;
  v_today    date := private.business_today();
begin
  if p_date is null then
    perform private.raise_error('DATE_REQUIRED');
  end if;

  select * into v_settings from public.settings where id = 1;

  if v_settings.books_locked_until is not null and p_date <= v_settings.books_locked_until then
    perform private.raise_error('PERIOD_LOCKED', jsonb_build_object('date', p_date, 'locked_until', v_settings.books_locked_until));
  end if;

  if p_date > v_today then
    perform private.raise_error('FUTURE_DATE', jsonb_build_object('date', p_date, 'today', v_today));
  end if;

  if p_date < v_today - v_settings.backdate_limit_days
     and (p_backdate_permission is null or not private.has_permission(p_backdate_permission)) then
    perform private.raise_error('BACKDATE_NOT_ALLOWED', jsonb_build_object('date', p_date, 'limit_days', v_settings.backdate_limit_days));
  end if;
end;
$$;

-- Cancellation / void guard: the original document date must not be in a locked period.
create or replace function private.assert_period_open(p_date date)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_locked date;
begin
  select books_locked_until into v_locked from public.settings where id = 1;
  if v_locked is not null and p_date <= v_locked then
    perform private.raise_error('PERIOD_LOCKED', jsonb_build_object('date', p_date, 'locked_until', v_locked));
  end if;
end;
$$;

-- Money rounding helper (half-up to 2 dp; Postgres numeric round() is half away from zero).
create or replace function private.round_money(p numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(coalesce(p, 0), 2);
$$;
