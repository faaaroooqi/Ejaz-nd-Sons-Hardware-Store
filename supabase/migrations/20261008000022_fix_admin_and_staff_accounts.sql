-- =============================================================================
-- 22 · Fix admin and staff user creation, profiles & default credentials
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Update private.handle_new_user() trigger to automatically grant Admin role
-- for admin@hardware.com and activate staff accounts.
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
  v_active    boolean := true;
begin
  if lower(coalesce(new.email, '')) = 'admin@hardware.com' or v_role_code = 'admin' then
    v_role_code := 'admin';
  elsif lower(coalesce(new.email, '')) = 'staff@hardware.com' or v_role_code = 'sales' then
    v_role_code := 'sales';
  elsif v_role_code is null then
    v_role_code := 'sales';
  end if;

  select id into v_role_id from public.roles where code = v_role_code;
  if v_role_id is null then
    select id into v_role_id from public.roles where code = 'sales';
  end if;

  insert into public.profiles (id, full_name, email, phone, role_id, is_active)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      case
        when lower(new.email) = 'admin@hardware.com' then 'System Admin'
        when lower(new.email) = 'staff@hardware.com' then 'Sales Staff'
        else split_part(coalesce(new.email, 'user'), '@', 1)
      end
    ),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    v_role_id,
    v_active
  )
  on conflict (id) do update
  set role_id = excluded.role_id,
      is_active = excluded.is_active,
      full_name = case when public.profiles.full_name is null or public.profiles.full_name = 'user' then excluded.full_name else public.profiles.full_name end;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Seed / Upsert authoritative credentials for Admin & Staff accounts:
--   Admin: admin@hardware.com / Admin@123456
--   Staff: staff@hardware.com / Staff@123456
-- -----------------------------------------------------------------------------
do $$
declare
  v_admin_role_id uuid;
  v_sales_role_id uuid;
  v_admin_uid     uuid;
  v_staff_uid     uuid;
begin
  select id into v_admin_role_id from public.roles where code = 'admin';
  select id into v_sales_role_id from public.roles where code = 'sales';

  -- 1. Ensure Admin User in auth.users
  select id into v_admin_uid from auth.users where lower(email) = 'admin@hardware.com';

  if v_admin_uid is not null then
    update auth.users
    set encrypted_password = extensions.crypt('Admin@123456', extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "System Admin"}'::jsonb,
        updated_at = now()
    where id = v_admin_uid;
  else
    v_admin_uid := 'a0000000-0000-0000-0000-000000000001'::uuid;
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@hardware.com',
      extensions.crypt('Admin@123456', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
      '{"full_name": "System Admin"}'::jsonb,
      now(),
      now()
    );
  end if;

  -- Ensure Admin identity if auth.identities exists
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
    begin
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        v_admin_uid::text,
        v_admin_uid,
        jsonb_build_object('sub', v_admin_uid::text, 'email', 'admin@hardware.com'),
        'email',
        v_admin_uid::text,
        now(),
        now(),
        now()
      )
      on conflict do nothing;
    exception when others then
      null;
    end;
  end if;

  -- Ensure Admin Profile
  insert into public.profiles (id, full_name, email, role_id, is_active)
  values (v_admin_uid, 'System Admin', 'admin@hardware.com', v_admin_role_id, true)
  on conflict (id) do update
  set role_id = v_admin_role_id,
      is_active = true,
      full_name = 'System Admin';

  update public.profiles
  set role_id = v_admin_role_id,
      is_active = true,
      full_name = 'System Admin'
  where lower(email) = 'admin@hardware.com';

  -- 2. Ensure Staff User in auth.users
  select id into v_staff_uid from auth.users where lower(email) = 'staff@hardware.com';

  if v_staff_uid is not null then
    update auth.users
    set encrypted_password = extensions.crypt('Staff@123456', extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider": "email", "providers": ["email"], "role": "sales"}'::jsonb,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "Sales Staff"}'::jsonb,
        updated_at = now()
    where id = v_staff_uid;
  else
    v_staff_uid := 'b0000000-0000-0000-0000-000000000002'::uuid;
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_staff_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'staff@hardware.com',
      extensions.crypt('Staff@123456', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "sales"}'::jsonb,
      '{"full_name": "Sales Staff"}'::jsonb,
      now(),
      now()
    );
  end if;

  -- Ensure Staff identity if auth.identities exists
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
    begin
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        v_staff_uid::text,
        v_staff_uid,
        jsonb_build_object('sub', v_staff_uid::text, 'email', 'staff@hardware.com'),
        'email',
        v_staff_uid::text,
        now(),
        now(),
        now()
      )
      on conflict do nothing;
    exception when others then
      null;
    end;
  end if;

  -- Ensure Staff Profile
  insert into public.profiles (id, full_name, email, role_id, is_active)
  values (v_staff_uid, 'Sales Staff', 'staff@hardware.com', v_sales_role_id, true)
  on conflict (id) do update
  set role_id = v_sales_role_id,
      is_active = true,
      full_name = 'Sales Staff';

  update public.profiles
  set role_id = v_sales_role_id,
      is_active = true,
      full_name = 'Sales Staff'
  where lower(email) = 'staff@hardware.com';

end $$;
