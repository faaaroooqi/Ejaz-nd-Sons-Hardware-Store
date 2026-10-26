import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../AuthContext'
import { LogIn, UserPlus, Wrench, Shield, Lock, Mail, UserCheck, ShieldCheck, Eye, EyeOff, User } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, signUp, isConfigured, session, profile } = useAuth()
  const [isSignUp, setIsSignUp] = useState<boolean>(false)
  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState<string>('admin@hardware.com')
  const [password, setPassword] = useState<string>('Admin@123456')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (session || profile) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, profile, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (isSignUp) {
      const { error, needsConfirmation } = await signUp(email, password, fullName)
      setIsLoading(false)
      if (error) {
        setErrorMsg(error.message)
      } else if (needsConfirmation) {
        setSuccessMsg('Account registered! Supabase email confirmation is required: please confirm your email, or run the SQL activation script in Supabase, then Sign In.')
      } else {
        setSuccessMsg('Account created successfully! Logging you in...')
        setTimeout(() => navigate('/dashboard'), 800)
      }
    } else {
      const { error } = await login(email, password)
      setIsLoading(false)
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMsg('Email not confirmed in Supabase. Run the quick SQL script in Supabase SQL Editor to confirm and activate this user.')
        } else {
          setErrorMsg(error.message)
        }
      } else {
        navigate('/dashboard')
      }
    }
  }

  const selectCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail)
    setPassword(userPass)
    setIsSignUp(false)
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Wrench className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Ejaz and sons hardware store
        </h2>
        <p className="mt-1 text-center text-xs font-medium text-muted-foreground">
          Inventory, Sales & Financial Khata System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          {/* Mode Switch Tabs */}
          <div className="mb-6 flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                !isSignUp
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                isSignUp
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isConfigured && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <Shield className="h-4 w-4" />
                <span>Demo Preview Mode Active</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Connect your live Supabase URL in <code className="font-mono text-xs">.env</code> to enable live Database auth.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-semibold text-destructive">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-600">
              {successMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-xs font-semibold text-foreground">Full Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Muhammad Bilal"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground">Email Address</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="user@hardware.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In to System</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Fill Selector (visible in Sign In mode) */}
          {!isSignUp && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Select Quick Login Credentials
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectCredentials('admin@hardware.com', 'Admin@123456')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-left transition-all ${
                    email === 'admin@hardware.com'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Admin User</span>
                  </div>
                  <span className="mt-1 text-[10px] opacity-80">admin@hardware.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectCredentials('staff@hardware.com', 'Staff@123456')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-left transition-all ${
                    email === 'staff@hardware.com'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Staff User</span>
                  </div>
                  <span className="mt-1 text-[10px] opacity-80">staff@hardware.com</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


