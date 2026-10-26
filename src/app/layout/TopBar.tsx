import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { Plus, LogOut, Search, User, ShieldCheck } from 'lucide-react'
import { HelpButton } from '@/features/help/HelpButton'

interface TopBarProps {
  onOpenQuickActions: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenQuickActions }) => {
  const { profile, logout } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-4">
        {/* Quick Action Button */}
        <button
          onClick={onOpenQuickActions}
          className="hidden items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground shadow-sm transition-all hover:brightness-110 md:flex"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry</span>
        </button>

        {/* Global Search Bar Placeholder */}
        <div className="relative w-48 sm:w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SKU, invoice, customer... (Ctrl+K)"
            className="w-full rounded-lg border border-input bg-background/50 py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Help & Guide Button */}
        <HelpButton variant="topbar" />

        {/* User Role Badge */}
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>{profile?.role_name || 'Sales Staff'}</span>
        </div>

        {/* User Menu / Logout */}
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <button
            onClick={() => logout()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
