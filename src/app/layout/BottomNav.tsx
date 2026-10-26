import React from 'react'
import { NavLink } from 'react-router'
import { LayoutDashboard, ShoppingCart, Plus, Users, Menu } from 'lucide-react'

interface BottomNavProps {
  onOpenQuickActions: () => void
  onOpenMobileMenu: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenQuickActions, onOpenMobileMenu }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground'
            }`
          }
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Sales</span>
        </NavLink>

        {/* Center Quick Action Button */}
        <button
          onClick={onOpenQuickActions}
          className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg transition-transform active:scale-95"
          aria-label="Quick Action"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground'
            }`
          }
        >
          <Users className="h-5 w-5" />
          <span>Khata</span>
        </NavLink>

        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </div>
  )
}
