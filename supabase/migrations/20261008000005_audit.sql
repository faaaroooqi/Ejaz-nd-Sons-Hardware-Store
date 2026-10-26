-- =============================================================================
-- 05 · Activity / audit log, generic change trigger, admin settings RPC
-- =============================================================================

create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null,
  entity_id   uuid,
  summary     text,
  old_data    jsonb,
  new_data    jsonb,
  metadata    jsonb not null default '{}'::jsonb
);

create index activity_logs_occurred_at_idx on public.activity_logs (occurred_at desc);
create index activity_logs_entity_idx      on public.activity_logs (entity_type, entity_id, occurred_at desc);
create index activity_logs_actor_idx       on public.activity_logs (actor_id, occurred_at desc);
create index activity_logs_action_idx      on public.activity_logs (action, occurred_at desc);

-- Physically immutable (even for SECURITY DEFINER functions).
create trigger activity_logs_immutable
  before update or delete on public.activity_logs
  for each row execute function private.prevent_modification();

alter table public.activity_logs enable row level security;
grant select on public.activity_logs to authenticated;

create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using ((select private.has_permission('audit.view')));

-- -----------------------------------------------------------------------------
-- Semantic event logger (called by posting functions).
-- -----------------------------------------------------------------------------
create or replace function private.log_activity(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_summary     text,
  p_old_data    jsonb default null,
  p_new_data    jsonb default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_actor uuid := auth.uid();
begin
  -- Only reference an actor that has a profile (service-role / migration calls have none).
  if v_actor is not null and not exists (select 1 from public.profiles where id = v_actor) then
    v_actor := null;
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, summary, old_data, new_data, metadata)
  values (v_actor, p_action, p_entity_type, p_entity_id, p_summary, p_old_data, p_new_data, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Generic row-change audit trigger.
--   TG_ARGV[0] = entity type label (e.g. 'product')
--   TG_ARGV[1] = optional column used for the summary (e.g. 'name')
-- Stores only changed columns on UPDATE; skips no-op updates.
-- -----------------------------------------------------------------------------
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity   text := tg_argv[0];
  v_label    text := coalesce(tg_argv[1], 'id');
  v_old      jsonb;
  v_new      jsonb;
  v_old_diff jsonb;
  v_new_diff jsonb;
  v_id       uuid;
  v_name     text;
begin
  if tg_op = 'INSERT' then
    v_new  := to_jsonb(new);
    v_id   := (v_new ->> 'id')::uuid;
    v_name := v_new ->> v_label;
    perform private.log_activity(v_entity || '.created', v_entity, v_id,
      initcap(replace(v_entity, '_', ' ')) || ' created' || coalesce(': ' || v_name, ''),
      null, v_new);
    return new;

  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);

    select jsonb_object_agg(n.key, o.value), jsonb_object_agg(n.key, n.value)
      into v_old_diff, v_new_diff
      from jsonb_each(v_new) n
      left join jsonb_each(v_old) o on o.key = n.key
     where n.value is distinct from o.value
       and n.key not in ('updated_at', 'updated_by');

    if v_new_diff is null then
      return new;
    end if;

    v_id   := case when v_new ? 'id' then nullif(v_new ->> 'id', '')::uuid end;
    v_name := v_new ->> v_label;
    perform private.log_activity(v_entity || '.updated', v_entity, v_id,
      initcap(replace(v_entity, '_', ' ')) || ' updated' || coalesce(': ' || v_name, '')
        || ' (' || (select string_agg(k, ', ' order by k) from jsonb_object_keys(v_new_diff) k) || ')',
      v_old_diff, v_new_diff);
    return new;

  else -- DELETE
    v_old  := to_jsonb(old);
    v_id   := case when v_old ? 'id' then nullif(v_old ->> 'id', '')::uuid end;
    v_name := v_old ->> v_label;
    perform private.log_activity(v_entity || '.deleted', v_entity, v_id,
      initcap(replace(v_entity, '_', ' ')) || ' deleted' || coalesce(': ' || v_name, ''),
      v_old, null);
    return old;
  end if;
end;
$$;

-- settings has a smallint id, so we audit it explicitly instead (see admin_update_settings).
create trigger profiles_audit
  after update on public.profiles
  for each row execute function private.audit_row_change('user', 'full_name');

create trigger roles_audit
  after insert or update or delete on public.roles
  for each row execute function private.audit_row_change('role', 'name');

-- role_permissions has a composite key → dedicated trigger.
create or replace function private.audit_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid := coalesce(new.role_id, old.role_id);
  v_perm    text := coalesce(new.permission_code, old.permission_code);
  v_role    text;
begin
  select name into v_role from public.roles where id = v_role_id;
  perform private.log_activity(
    case when tg_op = 'INSERT' then 'role.permission_granted' else 'role.permission_revoked' end,
    'role', v_role_id,
    case when tg_op = 'INSERT' then 'Granted ' else 'Revoked ' end || v_perm
      || case when tg_op = 'INSERT' then ' to ' else ' from ' end || coalesce(v_role, 'role'),
    null, jsonb_build_object('permission', v_perm));
  return coalesce(new, old);
end;
$$;

create trigger role_permissions_audit
  after insert or delete on public.role_permissions
  for each row execute function private.audit_role_permission_change();

create trigger document_types_audit
  after update on public.document_types
  for each row execute function private.audit_row_change('document_type', 'code');

-- -----------------------------------------------------------------------------
-- Admin: update business settings (validated, audited).
-- Accepts a partial JSON object; unknown keys are rejected.
-- -----------------------------------------------------------------------------
create or replace function public.admin_update_settings(p_changes jsonb)
returns public.settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed  text[] := array[
    'business_name', 'business_tagline', 'business_address', 'business_city',
    'business_phone', 'business_phone_alt', 'business_email', 'business_ntn', 'logo_path',
    'currency_code', 'currency_symbol', 'number_grouping', 'date_format', 'timezone',
    'fiscal_year_start_month', 'allow_negative_stock', 'credit_limit_mode',
    'books_locked_until', 'backdate_limit_days', 'invoice_terms', 'invoice_footer',
    'default_print_format', 'show_previous_balance_on_invoice'
  ];
  v_unknown  text[];
  v_old      public.settings%rowtype;
  v_new      public.settings%rowtype;
  v_old_diff jsonb;
  v_new_diff jsonb;
begin
  perform private.assert_permission('settings.manage');

  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    perform private.raise_error('INVALID_PAYLOAD');
  end if;

  select array_agg(k) into v_unknown
    from jsonb_object_keys(p_changes) k
   where k <> all (v_allowed);
  if v_unknown is not null then
    perform private.raise_error('UNKNOWN_SETTINGS', jsonb_build_object('keys', v_unknown));
  end if;

  if p_changes ? 'timezone'
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_changes ->> 'timezone') then
    perform private.raise_error('INVALID_TIMEZONE', jsonb_build_object('timezone', p_changes ->> 'timezone'));
  end if;

  select * into v_old from public.settings where id = 1 for update;

  -- jsonb_populate_record overlays provided keys onto the current row;
  -- column CHECK constraints validate the result.
  v_new := jsonb_populate_record(v_old, p_changes);
  v_new.id         := 1;
  v_new.updated_by := auth.uid();

  update public.settings s set
    business_name           = v_new.business_name,
    business_tagline        = v_new.business_tagline,
    business_address        = v_new.business_address,
    business_city           = v_new.business_city,
    business_phone          = v_new.business_phone,
    business_phone_alt      = v_new.business_phone_alt,
    business_email          = v_new.business_email,
    business_ntn            = v_new.business_ntn,
    logo_path               = v_new.logo_path,
    currency_code           = v_new.currency_code,
    currency_symbol         = v_new.currency_symbol,
    number_grouping         = v_new.number_grouping,
    date_format             = v_new.date_format,
    timezone                = v_new.timezone,
    fiscal_year_start_month = v_new.fiscal_year_start_month,
    allow_negative_stock    = v_new.allow_negative_stock,
    credit_limit_mode       = v_new.credit_limit_mode,
    books_locked_until      = v_new.books_locked_until,
    backdate_limit_days     = v_new.backdate_limit_days,
    invoice_terms           = v_new.invoice_terms,
    invoice_footer          = v_new.invoice_footer,
    default_print_format    = v_new.default_print_format,
    show_previous_balance_on_invoice = v_new.show_previous_balance_on_invoice,
    updated_by              = v_new.updated_by
  where s.id = 1
  returning * into v_new;

  select jsonb_object_agg(n.key, o.value), jsonb_object_agg(n.key, n.value)
    into v_old_diff, v_new_diff
    from jsonb_each(to_jsonb(v_new)) n
    left join jsonb_each(to_jsonb(v_old)) o on o.key = n.key
   where n.value is distinct from o.value
     and n.key not in ('updated_at', 'updated_by');

  if v_new_diff is not null then
    perform private.log_activity('settings.updated', 'settings', null,
      'Settings updated (' || (select string_agg(k, ', ' order by k) from jsonb_object_keys(v_new_diff) k) || ')',
      v_old_diff, v_new_diff);
  end if;

  return v_new;
end;
$$;

grant execute on function public.admin_update_settings(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Admin: user management (database side).
-- Role / activation are authoritative HERE. The `admin-users` Edge Function
-- calls these with the caller's JWT (so audit captures the real actor) and
-- then syncs Supabase Auth (app_metadata role, ban on deactivation).
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id              uuid,
  full_name       text,
  email           text,
  phone           text,
  role_id         uuid,
  role_code       text,
  role_name       text,
  is_active       boolean,
  last_sign_in_at timestamptz,
  created_at      timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_permission('users.manage');

  return query
  select p.id, p.full_name, p.email, p.phone, p.role_id, r.code, r.name, p.is_active,
         u.last_sign_in_at, p.created_at
  from public.profiles p
  join public.roles r on r.id = p.role_id
  left join auth.users u on u.id = p.id
  order by p.is_active desc, p.full_name;
end;
$$;

create or replace function public.admin_update_user(
  p_user_id   uuid,
  p_full_name text    default null,
  p_phone     text    default null,
  p_role_code text    default null,
  p_is_active boolean default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_profile public.profiles%rowtype;
begin
  perform private.assert_permission('users.manage');

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    perform private.raise_error('USER_NOT_FOUND', jsonb_build_object('user_id', p_user_id));
  end if;

  if p_user_id = auth.uid() and p_is_active is false then
    perform private.raise_error('CANNOT_DEACTIVATE_SELF');
  end if;

  if p_role_code is not null then
    select id into v_role_id from public.roles where code = p_role_code;
    if v_role_id is null then
      perform private.raise_error('ROLE_NOT_FOUND', jsonb_build_object('role_code', p_role_code));
    end if;
  end if;

  if p_full_name is not null and length(btrim(p_full_name)) = 0 then
    perform private.raise_error('NAME_REQUIRED');
  end if;

  update public.profiles set
    full_name = coalesce(nullif(btrim(p_full_name), ''), full_name),
    phone     = case when p_phone is null then phone else nullif(btrim(p_phone), '') end,
    role_id   = coalesce(v_role_id, role_id),
    is_active = coalesce(p_is_active, is_active)
  where id = p_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, text, boolean) to authenticated;
