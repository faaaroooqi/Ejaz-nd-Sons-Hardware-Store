import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  Users,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/common/PageHeader'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayInvoiceCount: 0,
    receivables: 0,
    payables: 0,
    lowStockCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        const todayStr = new Date().toISOString().split('T')[0]

        // 1. Today Sales
        const { data: salesData } = await (supabase as any)
          .from('sales')
          .select('grand_total')
          .eq('sale_date', todayStr)
          .neq('status', 'cancelled')

        const todaySales = (salesData || []).reduce((acc: number, s: any) => acc + (Number(s.grand_total) || 0), 0)
        const todayInvoiceCount = (salesData || []).length

        // 2. Receivables
        const { data: recData } = await (supabase as any)
          .from('customer_balances')
          .select('current_balance')

        const receivables = (recData || []).reduce((acc: number, r: any) => acc + Math.max(0, r.current_balance || 0), 0)

        // 3. Payables
        const { data: payData } = await (supabase as any)
          .from('supplier_balances')
          .select('current_balance')

        const payables = (payData || []).reduce((acc: number, p: any) => acc + Math.max(0, p.current_balance || 0), 0)

        // 4. Low Stock
        const { data: stockData } = await (supabase as any)
          .from('stock_levels')
          .select('quantity_on_hand, variant:product_variants(min_stock_level)')

        const lowStockCount = (stockData || []).filter((s: any) => {
          const minLevel = s.variant?.min_stock_level || 0
          return s.quantity_on_hand <= minLevel
        }).length

        setMetrics({
          todaySales,
          todayInvoiceCount,
          receivables,
          payables,
          lowStockCount,
        })
      } catch (err) {
        console.warn('Dashboard metric load error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardMetrics()
  }, [])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Business Overview"
        titleUrdu="کاروباری جائزہ"
        description="Real-time daily sales, receivables, payables and stock health"
        descriptionUrdu="روزانہ کی سیلز، کسٹمر سے لینا، سپلائر کو دینا اور گودام کا لائیو اسٹاک"
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Today's Sales</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black font-numeric text-foreground">
            {isLoading ? '...' : formatCurrency(metrics.todaySales)}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-emerald-600">
            {metrics.todayInvoiceCount} Invoices posted today
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Customer Receivables</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black font-numeric text-foreground">
            {isLoading ? '...' : formatCurrency(metrics.receivables)}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-muted-foreground">Lena / Customer Khata owed</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Supplier Payables</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black font-numeric text-foreground">
            {isLoading ? '...' : formatCurrency(metrics.payables)}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-muted-foreground">Dena / Supplier Khata owed</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Low Stock Alert</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black font-numeric text-foreground">
            {isLoading ? '...' : `${metrics.lowStockCount} SKUs`}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-rose-600">Items below minimum level</span>
        </div>
      </div>

      {/* Beginner-Friendly Quick Action Guide */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              What do you want to do today? • آج کیا کام کرنا چاہتے ہیں؟
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Simple 1-click shortcuts for everyday shopkeeping
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Action 1: Scan Old Khata */}
          <button
            type="button"
            onClick={() => navigate('/khata-import')}
            className="group flex flex-col justify-between rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 hover:border-primary/40 hover:shadow-md active:scale-95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-foreground">Scan Old Khata</h3>
              <p dir="rtl" className="font-urdu text-[11px] font-bold text-primary mt-0.5">
                پرانا کھاتہ درج کریں
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                Scan handwritten register photos or enter past records
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
              <span>Open Scanner</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 2: New Sale Bill */}
          <button
            type="button"
            onClick={() => navigate('/sales/new')}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-foreground">New Sale Bill</h3>
              <p dir="rtl" className="font-urdu text-[11px] font-bold text-emerald-600 mt-0.5">
                نیا سیلز بل بنائیں
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                Instant cash bill or customer credit invoice
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <span>Create Bill</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 3: Purchase / Stock In */}
          <button
            type="button"
            onClick={() => navigate('/purchases/new')}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-foreground">Add Stock-In</h3>
              <p dir="rtl" className="font-urdu text-[11px] font-bold text-blue-600 mt-0.5">
                خریداری مال داخل کریں
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                Record new goods received from suppliers
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
              <span>Add Goods</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 4: Receive Payment */}
          <button
            type="button"
            onClick={() => navigate('/customer-payments')}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 group-hover:scale-105 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-foreground">Customer Payments</h3>
              <p dir="rtl" className="font-urdu text-[11px] font-bold text-purple-600 mt-0.5">
                گاہک سے رقم وصولی
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                Record cash or bank payments from customer
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-600">
              <span>Receive Cash</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 5: Customer Khata Statements */}
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-95"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-bold text-foreground">Party Ledgers</h3>
              <p dir="rtl" className="font-urdu text-[11px] font-bold text-amber-600 mt-0.5">
                کھاتہ اسٹیٹمنٹ دیکھیں
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                Check who owes what and print party statements
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-600">
              <span>View Khata</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">Recent Sales Invoices</h2>
          <p className="text-xs text-muted-foreground">Latest transactions from shop POS</p>
          <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            Sales transaction feed will load here
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">Stock Valuation & Cash Flow</h2>
          <p className="text-xs text-muted-foreground">Estimated gross profit and liquidity</p>
          <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            Financial analytics charts will load here
          </div>
        </div>
      </div>
    </div>
  )
}

