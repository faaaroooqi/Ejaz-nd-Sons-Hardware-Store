// Real-Postgres harness for the Supabase SQL migrations.
//
// Starts a throw-away embedded PostgreSQL, creates the minimal Supabase
// scaffolding the migrations expect (roles, auth schema, auth.uid(), extensions
// schema), applies the migrations from supabase/migrations in order, and gives
// tests helpers to act as a specific "authenticated" user (RLS + grants apply,
// exactly like PostgREST would do).
//
// It never touches any remote / production database.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import net from 'node:net'
import { execSync } from 'node:child_process'
import EmbeddedPostgres from 'embedded-postgres'

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

const here = path.dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = path.resolve(here, '../../supabase/migrations')

export const ADMIN_ID = 'a0000000-0000-0000-0000-000000000001' // created by migration 22
export const STAFF_ID = 'b0000000-0000-0000-0000-000000000002' // created by migration 22 (role: sales)
export const WALKIN_ID = '00000000-0000-0000-0000-000000000001'

const SUPABASE_SCAFFOLD = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  end $$;
  create schema if not exists extensions;
  grant usage on schema extensions to anon, authenticated;
  create extension if not exists citext   with schema extensions;
  create extension if not exists pg_trgm  with schema extensions;
  create extension if not exists pgcrypto with schema extensions;
  alter database ${'"hw_test"'} set search_path = public, extensions;
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key,
    instance_id uuid, aud text, role text, email text, encrypted_password text,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz
  );
  create or replace function auth.uid() returns uuid language sql stable as
    $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  grant usage on schema public to anon, authenticated;
`

export function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
}

export class TestDb {
  constructor() {
    this.port = null
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-pg-'))
    this.server = null
    this.clients = []
  }

  async start() {
    this.port = await freePort()
    this.server = new EmbeddedPostgres({
      databaseDir: this.dir,
      user: 'postgres',
      password: 'postgres',
      port: this.port,
      persistent: false,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      onLog: () => {},
      onError: () => {},
    })
    await this.server.initialise()
    await this.server.start()
    await this.server.createDatabase('hw_test')
    this.admin = await this.rawClient() // superuser = the "migration role"
    await this.admin.query(SUPABASE_SCAFFOLD)
    await this.admin.end() // new session picks up the database-level search_path
    this.clients = this.clients.filter((c) => c !== this.admin)
    this.admin = await this.rawClient()
  }

  async rawClient() {
    const c = new pg.Client({ host: 'localhost', port: this.port, user: 'postgres', password: 'postgres', database: 'hw_test' })
    c.on('error', () => {})
    await c.connect()
    this.clients.push(c)
    return c
  }

  /** Apply migrations whose filename sorts within (afterExclusive, upToInclusive] by numeric prefix. */
  async applyMigrations({ from = 0, to = Infinity } = {}) {
    for (const f of migrationFiles()) {
      const n = Number(f.slice(8, 14)) // 20261008 | 000028 | _name.sql
      if (n < from || n > to) continue
      await this.admin.query(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
    }
  }

  /** A fresh connection that behaves like PostgREST: role `authenticated` + JWT sub claim. */
  async userClient(userId) {
    const c = await this.rawClient()
    await c.query('set role authenticated')
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [userId])
    return c
  }

  async stop() {
    await Promise.all(
      this.clients.map((c) => Promise.race([c.end().catch(() => {}), new Promise((r) => setTimeout(r, 2000))])),
    )
    if (this.server) {
      await Promise.race([this.server.stop().catch(() => {}), new Promise((r) => setTimeout(r, 8000))])
      // Belt and braces (Windows): make sure the postmaster is really gone.
      try {
        const pid = Number(fs.readFileSync(path.join(this.dir, 'postmaster.pid'), 'utf8').split('\n')[0])
        if (pid) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
      } catch { /* already stopped */ }
    }
    fs.rmSync(this.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
  }
}

export async function rpc(client, fn, ...args) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await client.query(`select public.${fn}(${placeholders}) as r`, args.map((a) => (a !== null && typeof a === 'object' ? JSON.stringify(a) : a)))
  return rows[0].r
}

/** Run a query and return the thrown error message (business error code) or null. */
export async function expectError(promise) {
  try {
    await promise
  } catch (e) {
    return e
  }
  return null
}
