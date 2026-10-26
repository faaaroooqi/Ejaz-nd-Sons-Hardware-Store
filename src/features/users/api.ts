import { supabase } from '@/lib/supabase'

export interface AppUser {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role_id: string
  role_code: string
  role_name: string
  is_active: boolean
  last_sign_in_at: string | null
  created_at: string
}

export async function fetchUsers(): Promise<AppUser[]> {
  const { data, error } = await (supabase as any).rpc('admin_list_users')

  if (error) {
    // Fallback profile query if RPC fails
    const { data: profiles, error: profErr } = await (supabase as any)
      .from('profiles')
      .select('*, role:roles(code, name)')

    if (profErr) throw profErr

    return (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      role_id: p.role_id,
      role_code: p.role?.code || 'sales',
      role_name: p.role?.name || 'Sales Staff',
      is_active: p.is_active,
      last_sign_in_at: null,
      created_at: p.created_at,
    }))
  }

  return (data || []) as AppUser[]
}

export async function updateUserProfile(payload: {
  user_id: string
  full_name?: string
  phone?: string
  role_code?: string
  is_active?: boolean
}): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_update_user', {
    p_user_id: payload.user_id,
    p_full_name: payload.full_name,
    p_phone: payload.phone,
    p_role_code: payload.role_code,
    p_is_active: payload.is_active,
  })

  if (error) {
    const { error: directErr } = await (supabase as any)
      .from('profiles')
      .update({
        full_name: payload.full_name,
        phone: payload.phone,
        is_active: payload.is_active,
      })
      .eq('id', payload.user_id)

    if (directErr) throw directErr
  }
}
