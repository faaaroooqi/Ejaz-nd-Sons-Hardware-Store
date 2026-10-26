import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function sanitizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return 'https://placeholder-project.supabase.co'
  let url = rawUrl.trim()
  // Strip trailing /rest/v1/ or slashes if accidentally included in .env
  url = url.replace(/\/rest\/v1\/?$/i, '')
  url = url.replace(/\/+$/, '')
  return url
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = sanitizeSupabaseUrl(rawUrl)
const supabaseAnonKey = rawKey ? rawKey.trim() : 'placeholder-anon-key'

export const isConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('placeholder-project')
)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
