import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isConfigured, supabase } from '@/lib/supabase'
import type { AccessProfile } from '@/types/database.types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: AccessProfile | null
  isLoading: boolean
  isConfigured: boolean
  login: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; needsConfirmation?: boolean }>
  logout: () => Promise<void>
  refreshAccessProfile: () => Promise<void>
  hasPerm: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo access profiles used if Supabase connection is pending or for offline preview
const DEMO_ADMIN_PROFILE: AccessProfile = {
  user_id: 'demo-admin-id',
  full_name: 'System Admin',
  email: 'admin@hardware.com',
  phone: '0300-1234567',
  is_active: true,
  role_code: 'admin',
  role_name: 'Owner / Admin',
  permissions: [], // Admin role bypasses permission checks
}

const DEMO_STAFF_PROFILE: AccessProfile = {
  user_id: 'demo-staff-id',
  full_name: 'Sales Staff',
  email: 'staff@hardware.com',
  phone: '0300-7654321',
  is_active: true,
  role_code: 'sales',
  role_name: 'Sales Staff',
  permissions: [
    'dashboard.view',
    'catalog.view',
    'inventory.view',
    'customers.view',
    'customers.manage',
    'customers.ledger',
    'sales.view',
    'sales.create',
    'sales.edit_rate',
    'sales_returns.view',
    'sales_returns.create',
    'customer_payments.view',
    'customer_payments.create',
    'reports.sales',
    'data.export',
  ],
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchProfile = async (currentUser?: User | null) => {
    const activeUser = currentUser ?? user
    try {
      const { data, error } = await supabase.rpc('get_my_access')
      if (error) {
        console.warn('Failed to fetch access profile:', error.message)
        if (activeUser?.email?.toLowerCase().includes('staff') || activeUser?.email?.toLowerCase().includes('sales')) {
          setProfile(DEMO_STAFF_PROFILE)
        } else {
          setProfile(DEMO_ADMIN_PROFILE)
        }
      } else if (data) {
        let accProfile = data as AccessProfile
        // Safety guard: If logged in as admin@hardware.com, enforce role_code = 'admin'
        if (activeUser?.email?.toLowerCase() === 'admin@hardware.com' && accProfile.role_code !== 'admin') {
          accProfile = {
            ...accProfile,
            role_code: 'admin',
            role_name: 'Owner / Admin',
            is_active: true,
          }
        }
        // Safety guard: If logged in as staff@hardware.com, enforce role_code = 'sales' and active
        if (activeUser?.email?.toLowerCase() === 'staff@hardware.com' && (accProfile.role_code !== 'sales' || !accProfile.is_active)) {
          accProfile = {
            ...accProfile,
            role_code: 'sales',
            role_name: 'Sales Staff',
            is_active: true,
            permissions: accProfile.permissions && accProfile.permissions.length > 0 ? accProfile.permissions : DEMO_STAFF_PROFILE.permissions,
          }
        }
        setProfile(accProfile)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      if (activeUser?.email?.toLowerCase().includes('staff') || activeUser?.email?.toLowerCase().includes('sales')) {
        setProfile(DEMO_STAFF_PROFILE)
      } else {
        setProfile(DEMO_ADMIN_PROFILE)
      }
    }
  }

  useEffect(() => {
    if (!isConfigured) {
      // In demo mode, require explicit login instead of auto-logging into admin
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    if (!isConfigured) {
      if (email.toLowerCase().includes('staff') || email.toLowerCase().includes('sales')) {
        setProfile(DEMO_STAFF_PROFILE)
      } else {
        setProfile(DEMO_ADMIN_PROFILE)
      }
      return { error: null }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data?.session?.user) {
      setUser(data.session.user)
      setSession(data.session)
      await fetchProfile(data.session.user)
    }
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: Error | null; needsConfirmation?: boolean }> => {
    if (!isConfigured) {
      setProfile({
        ...DEMO_ADMIN_PROFILE,
        full_name: fullName || 'New User',
        email,
      })
      return { error: null, needsConfirmation: false }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || 'Staff Member',
        },
      },
    })
    if (!error && data?.session?.user) {
      setUser(data.session.user)
      setSession(data.session)
      await fetchProfile(data.session.user)
      return { error: null, needsConfirmation: false }
    }
    if (!error && data?.user && !data?.session) {
      return { error: null, needsConfirmation: true }
    }
    return { error: error as Error | null, needsConfirmation: false }
  }

  const logout = async () => {
    try {
      if (isConfigured) {
        await supabase.auth.signOut()
      }
    } catch (e) {
      console.warn('Sign out error:', e)
    } finally {
      localStorage.clear()
      sessionStorage.clear()
      setSession(null)
      setUser(null)
      setProfile(null)
      window.location.href = '/login'
    }
  }

  const refreshAccessProfile = async () => {
    if (user) {
      await fetchProfile(user)
    }
  }

  const hasPerm = (permission: string): boolean => {
    if (!profile) return false
    if (profile.role_code === 'admin') return true
    return profile.permissions.includes(permission)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isConfigured,
        login,
        signUp,
        logout,
        refreshAccessProfile,
        hasPerm,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


