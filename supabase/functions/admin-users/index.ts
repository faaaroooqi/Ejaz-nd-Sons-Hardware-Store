// =============================================================================
// admin-users Edge Function
// -----------------------------------------------------------------------------
// The ONLY place the service-role key is used. It never reaches the browser.
//
// Actions (POST JSON { action, ...payload }):
//   create_user     { email, password, full_name, phone?, role_code }
//   update_user     { user_id, full_name?, phone?, role_code?, is_active? }
//   reset_password  { user_id, password }
//
// Authorization: caller's JWT must belong to an active user holding the
// `users.manage` permission (checked in the database via has_permission()).
// Role / activation changes are applied through the admin_update_user() RPC
// using the CALLER's JWT, so DB rules (last-admin guard, audit actor) apply.
// =============================================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, json, requireEnv } from '../_shared/http.ts'

const ROLE_CODES = new Set(['admin', 'sales', 'inventory'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BAN_FOREVER = '876000h' // ~100 years

type Payload = Record<string, unknown>

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v.trim() : undefined
}

function validatePassword(pw: string | undefined): string | null {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters.'
  if (pw.length > 72) return 'Password must be at most 72 characters.'
  return null
}

async function logActivity(
  admin: SupabaseClient,
  actorId: string,
  action: string,
  entityId: string,
  summary: string,
  newData: Record<string, unknown> | null = null,
) {
  const { error } = await admin.from('activity_logs').insert({
    actor_id: actorId,
    action,
    entity_type: 'user',
    entity_id: entityId,
    summary,
    new_data: newData,
  })
  if (error) console.error('activity log insert failed', error)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Use POST.', 405)

  try {
    const url = requireEnv('SUPABASE_URL')
    const anonKey = requireEnv('SUPABASE_ANON_KEY')
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('UNAUTHENTICATED', 'Missing authorization.', 401)
    }

    // Client acting AS the caller (RLS + permission checks apply).
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return errorResponse('UNAUTHENTICATED', 'Invalid session.', 401)
    const callerId = userData.user.id

    const { data: allowed, error: permError } = await callerClient.rpc('has_permission', {
      p_permission: 'users.manage',
    })
    if (permError) return errorResponse('PERMISSION_CHECK_FAILED', permError.message, 500)
    if (!allowed) return errorResponse('PERMISSION_DENIED', 'You are not allowed to manage users.', 403)

    // Privileged client (server-side only).
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = (await req.json().catch(() => null)) as Payload | null
    if (!body || typeof body !== 'object') return errorResponse('INVALID_PAYLOAD', 'Body must be JSON.')
    const action = str(body.action)

    // ------------------------------------------------------------------------
    if (action === 'create_user') {
      const email = str(body.email)?.toLowerCase()
      const password = typeof body.password === 'string' ? body.password : undefined
      const fullName = str(body.full_name)
      const phone = str(body.phone) || null
      const roleCode = str(body.role_code)

      if (!email || !EMAIL_RE.test(email)) return errorResponse('INVALID_EMAIL', 'Enter a valid email address.')
      const pwErr = validatePassword(password)
      if (pwErr) return errorResponse('INVALID_PASSWORD', pwErr)
      if (!fullName) return errorResponse('NAME_REQUIRED', 'Full name is required.')
      if (!roleCode || !ROLE_CODES.has(roleCode)) return errorResponse('ROLE_NOT_FOUND', 'Select a valid role.')

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone },
        app_metadata: { role: roleCode },
      })
      if (error || !created.user) {
        const msg = error?.message ?? 'Could not create user.'
        const code = /already|registered|exists/i.test(msg) ? 'EMAIL_TAKEN' : 'CREATE_USER_FAILED'
        return errorResponse(code, msg)
      }

      await logActivity(admin, callerId, 'user.created', created.user.id,
        `User created: ${fullName} (${email}) as ${roleCode}`, { email, full_name: fullName, role_code: roleCode })

      return json({ user_id: created.user.id })
    }

    // ------------------------------------------------------------------------
    if (action === 'update_user') {
      const userId = str(body.user_id)
      if (!userId) return errorResponse('USER_NOT_FOUND', 'user_id is required.')
      const roleCode = str(body.role_code)
      if (roleCode && !ROLE_CODES.has(roleCode)) return errorResponse('ROLE_NOT_FOUND', 'Select a valid role.')
      const isActive = typeof body.is_active === 'boolean' ? body.is_active : null

      // 1) Authoritative DB update as the caller (validations + audit with actor).
      const { data: profile, error } = await callerClient.rpc('admin_update_user', {
        p_user_id: userId,
        p_full_name: str(body.full_name) ?? null,
        p_phone: typeof body.phone === 'string' ? body.phone : null,
        p_role_code: roleCode ?? null,
        p_is_active: isActive,
      })
      if (error) return errorResponse(error.message, error.message, 400, error.details)

      // 2) Sync Supabase Auth. Even if this fails, an inactive profile has no access.
      const authUpdate: Record<string, unknown> = {}
      if (roleCode) authUpdate.app_metadata = { role: roleCode }
      if (isActive === false) authUpdate.ban_duration = BAN_FOREVER
      if (isActive === true) authUpdate.ban_duration = 'none'
      if (Object.keys(authUpdate).length > 0) {
        const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate)
        if (authError) {
          return json({ profile, warning: `Profile updated but auth sync failed: ${authError.message}` })
        }
      }
      return json({ profile })
    }

    // ------------------------------------------------------------------------
    if (action === 'reset_password') {
      const userId = str(body.user_id)
      const password = typeof body.password === 'string' ? body.password : undefined
      if (!userId) return errorResponse('USER_NOT_FOUND', 'user_id is required.')
      const pwErr = validatePassword(password)
      if (pwErr) return errorResponse('INVALID_PASSWORD', pwErr)

      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return errorResponse('RESET_PASSWORD_FAILED', error.message)

      await logActivity(admin, callerId, 'user.password_reset', userId, 'Password reset by admin')
      return json({ ok: true })
    }

    return errorResponse('UNKNOWN_ACTION', `Unknown action: ${action ?? '(none)'}`)
  } catch (e) {
    console.error(e)
    return errorResponse('INTERNAL_ERROR', e instanceof Error ? e.message : 'Unexpected error', 500)
  }
})
