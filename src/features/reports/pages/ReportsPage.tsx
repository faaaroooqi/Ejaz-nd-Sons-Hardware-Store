import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { TrendingUp, DollarSign, Package, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useFinancialSummary } from '../queries'
import { formatPKR } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'

const COLORS = ['#0f4c5c', '#e36414', '#fb8b24', '#5f0f40', '#9a031e']

export function ReportsPage() {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstDayOfMonth)
  const [endDate, setEndDate] = useState(todayStr)

  const { data: summary } = useFinancialSummary(startDate, endDate)

  const chartData = [
    {
      name: 'Sales Revenue',
      Amount: summary?.total_sales || 0,
      fill: '#0f4c5c',
    },
    {
      name: 'COGS',
      Amount: summary?.cogs || 0,
      fill: '#e36414',
    },
    {
      name: 'Gross Profit',
      Amount: summary?.gross_profit || 0,
      fill: '#10b981',
    },
    {
      name: 'Expenses',
      Amount: summary?.total_expenses || 0,
      fill: '#ef4444',
    },
    {
      name: 'Net Profit',
      Amount: summary?.net_profit || 0,
      fill: '#6366f1',
    },
  ]

  const pieData = [
    { name: 'Cost of Goods Sold', value: summary?.cogs || 1 },
    { name: 'Operating Expenses', value: summary?.total_expenses || 1 },
    { name: 'Net Profit Margin', value: Math.max(0, summary?.net_profit || 1) },
  ]

  return (
    <RequirePermission permission={PERMISSIONS.REPORTS_SALES}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Reports & Financial Analytics"
          titleUrdu="رپورٹس اور کھاتہ سمری"
          description="Profit & loss analysis, revenue trends, expense breakdowns, and inventory valuation."
          descriptionUrdu="نفع و نقصان، کل سیلز کا تجزیہ، اخراجات کی تفصیل اور کل اسٹاک کی مالیت"
          action={
            <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm">
              <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none"
              />
            </div>
          }
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Sales Revenue</span>
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{formatPKR(summary?.total_sales || 0)}</h3>
            <p className="text-[11px] text-muted-foreground">Invoiced in selected date range</p>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Gross Profit</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600">{formatPKR(summary?.gross_profit || 0)}</h3>
            <p className="text-[11px] text-muted-foreground">Revenue minus Weighted Cost</p>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Operating Expenses</span>
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-500">{formatPKR(summary?.total_expenses || 0)}</h3>
            <p className="text-[11px] text-muted-foreground">Shop rent, utilities & wages</p>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated Net Profit</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-indigo-600">{formatPKR(summary?.net_profit || 0)}</h3>
            <p className="text-[11px] text-muted-foreground">Gross Profit minus Expenses</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Financial Overview Bar Chart */}
          <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground">Financial Overview Comparison</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${value / 1000}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(value)} />
                  <Bar dataKey="Amount" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Distribution Pie Chart */}
          <div className="bg-card p-6 rounded-xl border border-border space-y-4 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-foreground">Revenue Breakdown</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f4c5c]" /> COGS
                </span>
                <span className="font-mono">{formatPKR(summary?.cogs || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e36414]" /> Expenses
                </span>
                <span className="font-mono">{formatPKR(summary?.total_expenses || 0)}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fb8b24]" /> Net Margin
                </span>
                <span className="font-mono text-emerald-600">{formatPKR(summary?.net_profit || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Profit & Loss Summary Statement */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Profit & Loss Statement Summary</h3>
              <p className="text-xs text-muted-foreground">Accrual-based financial statement snapshot</p>
            </div>
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="font-medium text-foreground">Gross Sales Revenue</span>
              <span className="font-mono font-bold text-foreground">{formatPKR(summary?.total_sales || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50 text-muted-foreground pl-4">
              <span>Less: Cost of Goods Sold (Weighted Avg Cost)</span>
              <span className="font-mono text-red-500">({formatPKR(summary?.cogs || 0)})</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border font-bold text-emerald-600">
              <span>GROSS PROFIT</span>
              <span className="font-mono">{formatPKR(summary?.gross_profit || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50 text-muted-foreground pl-4">
              <span>Less: Operating Expenses</span>
              <span className="font-mono text-red-500">({formatPKR(summary?.total_expenses || 0)})</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-primary font-extrabold text-lg text-foreground">
              <span>NET PROFIT / LOSS</span>
              <span className="font-mono text-primary">{formatPKR(summary?.net_profit || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}
