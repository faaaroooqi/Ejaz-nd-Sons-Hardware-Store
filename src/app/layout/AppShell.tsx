import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { QuickActionModal } from './QuickActionModal'
import { HelpProvider, useHelp } from '@/features/help/HelpContext'
import { HelpModal } from '@/features/help/HelpModal'
import {
  X,
  HelpCircle,
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  Users,
  Building2,
  DollarSign,
  Receipt,
  BarChart3,
  Settings,
} from 'lucide-react'

const AppShellInner: React.FC = () => {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)
  const { openHelp } = useHelp()

  const mobileNavLinks = [
    { label: 'Dashboard', labelUrdu: 'جائزہ', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Sales Invoices', labelUrdu: 'سیلز بل', to: '/sales', icon: ShoppingCart },
    { label: 'Purchases', labelUrdu: 'خریداری', to: '/purchases', icon: ShoppingBag },
    { label: 'Inventory & Stock', labelUrdu: 'اسٹاک', to: '/inventory', icon: Boxes },
    { label: 'Customers Khata', labelUrdu: 'کسٹمر کھاتہ', to: '/customers', icon: Users },
    { label: 'Suppliers Khata', labelUrdu: 'سپلائر کھاتہ', to: '/suppliers', icon: Building2 },
    { label: 'Customer Payments', labelUrdu: 'وصولیاں', to: '/customer-payments', icon: DollarSign },
    { label: 'Shop Expenses', labelUrdu: 'اخراجات', to: '/expenses', icon: Receipt },
    { label: 'Reports', labelUrdu: 'رپورٹس', to: '/reports', icon: BarChart3 },
    { label: 'Settings', labelUrdu: 'سیٹنگز', to: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Workspace Area */}
      <div className="flex flex-col md:pl-64">
        {/* Top Header Navigation Bar */}
        <TopBar onOpenQuickActions={() => setIsQuickActionOpen(true)} />

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        onOpenQuickActions={() => setIsQuickActionOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-4/5 max-w-sm flex-col border-l border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Menu & Navigation</h3>
                <p dir="rtl" className="font-urdu text-xs text-muted-foreground">
                  تمام مینو اور رہنمائی
                </p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Help Button */}
            <div className="my-3">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  openHelp()
                }}
                className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 shadow-sm dark:text-amber-300"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                  <span>Help & Instructions</span>
                </div>
                <span dir="rtl" className="font-urdu text-xs font-bold">
                  مدد (رہنمائی)
                </span>
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 space-y-1 overflow-y-auto py-2">
              {mobileNavLinks.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <span dir="rtl" className="font-urdu text-[11px] opacity-80">
                      {item.labelUrdu}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Transaction Action Modal */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />

      {/* Bilingual Help & App Flow Modal */}
      <HelpModal />
    </div>
  )
}

export const AppShell: React.FC = () => {
  return (
    <HelpProvider>
      <AppShellInner />
    </HelpProvider>
  )
}
