import React from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'
import { PERMISSIONS } from '@/lib/permissions'
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Building2,
  ShoppingCart,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  DollarSign,
  Receipt,
  BarChart3,
  ShieldAlert,
  Settings,
  UserCheck,
  HelpCircle,
} from 'lucide-react'
import { useHelp } from '@/features/help/HelpContext'

interface NavGroup {
  title: string
  titleUrdu?: string
  items: {
    label: string
    labelUrdu?: string
    to: string
    icon: React.ElementType
    permission?: string
  }[]
}

export const Sidebar: React.FC = () => {
  const { hasPerm, profile } = useAuth()
  const { openHelp } = useHelp()

  const navGroups: NavGroup[] = [
    {
      title: 'Main',
      titleUrdu: 'مین ڈیش بورڈ',
      items: [
        { label: 'Dashboard', labelUrdu: 'جائزہ', to: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
      ],
    },
    {
      title: 'Catalog & Stock',
      titleUrdu: 'مال اور اسٹاک',
      items: [
        { label: 'Products & SKUs', labelUrdu: 'آئٹمز', to: '/products', icon: Package, permission: PERMISSIONS.CATALOG_VIEW },
        { label: 'Stock Inventory', labelUrdu: 'گودام اسٹاک', to: '/inventory', icon: Boxes, permission: PERMISSIONS.INVENTORY_VIEW },
      ],
    },
    {
      title: 'Parties & Khata',
      titleUrdu: 'کھاتے داری',
      items: [
        { label: 'Customers & Khata', labelUrdu: 'کسٹمرز لینا', to: '/customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { label: 'Suppliers & Khata', labelUrdu: 'سپلائرز دینا', to: '/suppliers', icon: Building2, permission: PERMISSIONS.SUPPLIERS_VIEW },
        { label: 'Scan Old Khata', labelUrdu: 'پرانا کھاتہ درج کریں', to: '/khata-import', icon: BookOpen, permission: PERMISSIONS.DATA_IMPORT },
      ],
    },
    {
      title: 'Transactions',
      titleUrdu: 'سیلز اور خریداری',
      items: [
        { label: 'Sales Invoices', labelUrdu: 'سیلز بل', to: '/sales', icon: ShoppingCart, permission: PERMISSIONS.SALES_VIEW },
        { label: 'Purchases', labelUrdu: 'خریداری بل', to: '/purchases', icon: ShoppingBag, permission: PERMISSIONS.PURCHASES_VIEW },
        { label: 'Sales Returns', labelUrdu: 'سیل واپسی', to: '/sales-returns', icon: ArrowDownLeft, permission: PERMISSIONS.SALES_RETURNS_VIEW },
        { label: 'Purchase Returns', labelUrdu: 'خرید واپسی', to: '/purchase-returns', icon: ArrowUpRight, permission: PERMISSIONS.PURCHASE_RETURNS_VIEW },
      ],
    },
    {
      title: 'Finance & Payments',
      titleUrdu: 'پیسوں کا لین دین',
      items: [
        { label: 'Customer Payments', labelUrdu: 'وصولی (آئے)', to: '/customer-payments', icon: DollarSign, permission: PERMISSIONS.CUSTOMER_PAYMENTS_VIEW },
        { label: 'Supplier Payments', labelUrdu: 'ادائیگی (دیے)', to: '/supplier-payments', icon: BookOpen, permission: PERMISSIONS.SUPPLIER_PAYMENTS_VIEW },
        { label: 'Expenses', labelUrdu: 'اخراجات', to: '/expenses', icon: Receipt, permission: PERMISSIONS.EXPENSES_VIEW },
      ],
    },
    {
      title: 'Analytics & Admin',
      titleUrdu: 'رپورٹس اور ایڈمن',
      items: [
        { label: 'Reports', labelUrdu: 'رپورٹس', to: '/reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_SALES },
        { label: 'User Management', labelUrdu: 'عملہ لاگ اِن', to: '/users', icon: UserCheck, permission: PERMISSIONS.USERS_MANAGE },
        { label: 'Audit Logs', labelUrdu: 'سرگرمی لاگ', to: '/audit-logs', icon: ShieldAlert, permission: PERMISSIONS.AUDIT_VIEW },
        { label: 'Settings', labelUrdu: 'سیٹنگز', to: '/settings', icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
      ],
    },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card shadow-sm md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md text-xs">
            E&S
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-foreground tracking-tight leading-tight line-clamp-1">Ejaz and sons hardware store</h1>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Manager v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.permission || hasPerm(item.permission))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title} className="mb-5">
              <div className="mb-2 flex items-center justify-between px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>{group.title}</span>
                {group.titleUrdu && (
                  <span dir="rtl" className="font-urdu text-[11px] font-normal text-muted-foreground/80 normal-case">
                    {group.titleUrdu}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.labelUrdu && (
                        <span dir="rtl" className="font-urdu text-[11px] opacity-80">
                          {item.labelUrdu}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* User Footer Profile & Help Trigger */}
      <div className="border-t border-border p-3 space-y-2">
        <button
          onClick={() => openHelp()}
          className="flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 transition-all hover:bg-amber-500/20 dark:text-amber-300 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span>Help & Workflow</span>
          </div>
          <span dir="rtl" className="font-urdu text-[11px] font-bold">
            مدد (رہنمائی)
          </span>
        </button>

        <div className="flex items-center justify-between px-1">
          <div className="truncate">
            <p className="truncate text-xs font-bold text-foreground">{profile?.full_name || 'Staff User'}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase">{profile?.role_name || 'Sales Staff'}</p>
          </div>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="System Online"></span>
        </div>
      </div>
    </aside>
  )
}
