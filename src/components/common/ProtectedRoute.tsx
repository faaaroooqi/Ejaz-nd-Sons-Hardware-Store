import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'

export const ProtectedRoute: React.FC = () => {
  const { session, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-xs font-semibold text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    )
  }

  if (!session && !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
