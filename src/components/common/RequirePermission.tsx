import React from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'
import { AlertTriangle } from 'lucide-react'

interface RequirePermissionProps {
  permission?: string
  children: React.ReactNode
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children }) => {
  const { profile, isLoading, hasPerm } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!profile && !isLoading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (permission && !hasPerm(permission)) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground">Access Restricted</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission (<code className="font-mono text-xs">{permission}</code>) to access this module. Contact your administrator if you require access.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
