import { useState } from 'react'
import { Plus, Search, ArrowUpRight, Building2, Pencil, Ban } from 'lucide-react'
import { useSupplierPayments, useUpdateSupplierPayment, useVoidSupplierPayment } from '../queries'
import { SupplierPaymentModal } from '../components/SupplierPaymentModal'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { formatPKR, formatDate } from '@/lib/format'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import { toast } from 'sonner'

export function SupplierPaymentsPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [paymentToVoid, setPaymentToVoid] = useState<any | null>(null)

  const { data: payments = [], isLoading, error } = useSupplierPayments(search)
  const updatePaymentMutation = useUpdateSupplierPayment()
  const voidPaymentMutation = useVoidSupplierPayment()

  const totalPaid = payments
    .filter((p: any) => p.status !== 'cancelled')
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  const handleSaveNotes = async () => {
    if (!editingPayment) return
    try {
      await updatePaymentMutation.mutateAsync({
        id: editingPayment.id,
        notes: editNotes,
      })
      toast.success('Payment notes updated successfully!')
      setEditingPayment(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update notes')
    }
  }

  const handleVoidPayment = async () => {
    if (!paymentToVoid) return
    try {
      await voidPaymentMutation.mutateAsync({
        id: paymentToVoid.id,
        reason: 'Cancelled by Admin',
      })
      toast.success(`Payment voucher ${paymentToVoid.voucher_no} cancelled successfully!`)
      setPaymentToVoid(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel payment voucher')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.SUPPLIER_PAYMENTS_VIEW}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Supplier Payments Made"
          titleUrdu="سپلائر کو ادائیگی (پیسے دیے)"
          description="Payment vouchers to suppliers, bill allocations, and supplier Dena reduction entries."
          descriptionUrdu="سپلائر کو ادائیگی کا واؤچر، بلوں کی ادائیگی اور واجب الادا رقم (دینا) میں کمی"
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Record Supplier Payment
            </button>
          }
        />

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payments Made</p>
              <h3 className="text-xl font-bold text-foreground">{formatPKR(totalPaid)}</h3>
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payment Vouchers</p>
              <h3 className="text-xl font-bold text-foreground">{payments.length}</h3>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by voucher # or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading supplier payment vouchers...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">Failed to load payments: {(error as any).message}</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No supplier payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Voucher #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Source Account</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Notes / Cheque #</th>
                    <th className="px-4 py-3 text-right">Amount (PKR)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p: any) => {
                    const isCancelled = p.status === 'cancelled'
                    return (
                      <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${isCancelled ? 'opacity-60 bg-muted/20' : ''}`}>
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{p.voucher_no}</span>
                            {isCancelled && (
                              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">
                                Voided
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(p.payment_date)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {p.supplier?.name || 'Supplier'}
                          {p.supplier?.company_name && (
                            <span className="block text-xs text-muted-foreground font-normal">{p.supplier.company_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.account?.name || 'Cash'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-600 font-medium uppercase">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.cheque_no ? `Cheque #${p.cheque_no} (${p.bank_name || ''})` : p.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {isCancelled ? <span className="line-through">{formatPKR(p.amount)}</span> : formatPKR(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPayment(p)
                                setEditNotes(p.notes || '')
                              }}
                              disabled={isCancelled}
                              title="Edit Notes"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPaymentToVoid(p)}
                              disabled={isCancelled}
                              title="Void / Cancel Voucher"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Notes Modal */}
        {editingPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-foreground">Edit Payment Notes #{editingPayment.voucher_no}</h3>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add or update notes for this voucher..."
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="btn btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={updatePaymentMutation.isPending}
                  className="btn btn-primary text-xs"
                >
                  {updatePaymentMutation.isPending ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Void Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(paymentToVoid)}
          onClose={() => setPaymentToVoid(null)}
          onConfirm={handleVoidPayment}
          isPending={voidPaymentMutation.isPending}
          title="Void Supplier Payment Voucher"
          message="Are you sure you want to void this supplier payment? This will mark the payment voucher as cancelled in records."
          itemName={paymentToVoid ? `${paymentToVoid.voucher_no} (PKR ${paymentToVoid.amount})` : undefined}
        />

        <SupplierPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </RequirePermission>
  )
}

