import { useState } from 'react'
import { Search, RotateCcw, User } from 'lucide-react'
import { useSalesReturns } from '../queries'
import { formatPKR, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'

export function SalesReturnsPage() {
  const [search, setSearch] = useState('')
  const { data: returns = [], isLoading, error } = useSalesReturns(search)

  const totalReturnVal = returns.reduce((acc, curr) => acc + Number(curr.subtotal || 0), 0)

  return (
    <RequirePermission permission={PERMISSIONS.SALES_RETURNS_VIEW}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Sales Returns (Credit Notes)"
          titleUrdu="سیلز واپسی (کریڈٹ نوٹ)"
          description="Customer returns, restocking inventory, and automatic Khata credit postings."
          descriptionUrdu="کسٹمر کا واپس شدہ مال، گودام میں اسٹاک کی واپسی اور کسٹمر کھاتے میں ریفنڈ"
        />

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sales Return Value</p>
              <h3 className="text-xl font-bold text-foreground">{formatPKR(totalReturnVal)}</h3>
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Credit Notes Issued</p>
              <h3 className="text-xl font-bold text-foreground">{returns.length}</h3>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by return # or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading sales returns...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">Failed to load returns: {(error as any).message}</div>
          ) : returns.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No sales returns recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Return #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Return Subtotal</th>
                    <th className="px-4 py-3 text-right">Cash Refunded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {returns.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">{r.return_no}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.return_date)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.customer_name_snapshot}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-600">{formatPKR(r.subtotal)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatPKR(r.refund_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RequirePermission>
  )
}
