-- =============================================================================
-- 01 · Extensions, schemas, default privileges, shared trigger functions
-- =============================================================================
-- Security posture: CLOSED BY DEFAULT.
--   * anon gets nothing.
--   * authenticated gets nothing on new tables/functions unless a later
--     migration grants it explicitly.
--   * `private` schema holds helper functions; it is NOT exposed via PostgREST.
-- =============================================================================

create extension if not exists citext   with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
-- authenticated needs USAGE so RLS policy expressions can call private helpers.
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Default privileges: nothing is granted implicitly for objects created by the
-- migration role in `public` or `private`.
-- -----------------------------------------------------------------------------
alter default privileges in schema public  revoke all     on tables    from anon, authenticated;
alter default privileges in schema public  revoke all     on sequences from anon, authenticated;
alter default privileges in schema public  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke all     on tables    from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Generic guard for append-only tables (raises on UPDATE / DELETE).
-- -----------------------------------------------------------------------------
create or replace function private.prevent_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'IMMUTABLE_RECORD',
    detail  = json_build_object('table', tg_table_name, 'operation', tg_op)::text;
end;
$$;

-- -----------------------------------------------------------------------------
-- Standard error raiser so every business error follows one contract:
--   SQLSTATE P0001, MESSAGE = <ERROR_CODE>, DETAIL = <json>
-- -----------------------------------------------------------------------------
create or replace function private.raise_error(p_code text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = p_code,
    detail  = coalesce(p_detail, '{}'::jsonb)::text;
end;
$$;

grant execute on function private.raise_error(text, jsonb) to authenticated;
