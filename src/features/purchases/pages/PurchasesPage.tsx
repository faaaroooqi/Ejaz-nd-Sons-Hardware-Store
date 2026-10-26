import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, ShoppingBag, CheckCircle2, Clock, AlertCircle, Ban, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/format'
import { usePurchases, useCancelPurchase, useUpdatePurchase } from '../queries'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import type { Purchase } from '../api'

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [purchaseToCancel, setPurchaseToCancel] = useState<Purchase | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [editNotes, setEditNotes] = useState('')

  const { data: purchases = [], isLoading } = usePurchases(searchTerm)
  const cancelPurchaseMutation = useCancelPurchase()
  const updatePurchaseMutation = useUpdatePurchase()

  const handleConfirmCancel = async () => {
    if (!purchaseToCancel) return
    try {
      await cancelPurchaseMutation.mutateAsync({ id: purchaseToCancel.id, reason: 'Cancelled by Admin' })
      toast.success(`Purchase ${purchaseToCancel.bill_no} cancelled successfully!`)
      setPurchaseToCancel(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel purchase')
    }
  }

  const handleSaveNotes = async () => {
    if (!editingPurchase) return
    try {
      await updatePurchaseMutation.mutateAsync({
        id: editingPurchase.id,
        payload: { notes: editNotes.trim() },
      })
      toast.success(`Notes updated for ${editingPurchase.bill_no}`)
      setEditingPurchase(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update purchase notes')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.PURCHASES_VIEW}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Purchases & Stock In"
          titleUrdu="خریداری اور مال آمد"
          description="Inward stock entries, supplier billing, and automatic payable ledger updates"
          descriptionUrdu="نئی خریداری کا بل درج کریں، گودام میں مال شامل کریں اور سپلائر کھاتہ اپڈیٹ کریں"
          action={
            <button
              onClick={() => navigate('/purchases/new')}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Purchase Entry</span>
            </button>
          }
        />

        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by purchase number or supplier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Purchases List Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">No Purchase Entries Found</h3>
              <p className="mt-1 text-xs text-muted-foreground">Record your first inventory purchase to update stock levels</p>
              <button
                onClick={() => navigate('/purchases/new')}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span>New Purchase</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Purchase #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Payable Due</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {purchases.map((p: any) => {
                    const due = Number(p.balance_due)
                    const isCancelled = p.status === 'cancelled'

                    return (
                      <tr key={p.id} className={`transition-colors hover:bg-muted/30 ${isCancelled ? 'opacity-60 bg-muted/10' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-primary">{p.bill_no || p.purchase_no}</span>
                            {isCancelled && (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                                Cancelled
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                          {formatDate(p.purchase_date)}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {p.supplier_name_snapshot}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-bold text-foreground">
                          {formatCurrency(p.grand_total)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric text-emerald-600 font-semibold">
                          {formatCurrency(p.amount_paid)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-bold">
                          <span className={due > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                            {formatCurrency(due)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Paid</span>
                            </span>
                          ) : p.payment_status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
                              <Clock className="h-3 w-3" />
                              <span>Partial</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                              <AlertCircle className="h-3 w-3" />
                              <span>Unpaid</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPurchase(p)
                                setEditNotes(p.notes || '')
                              }}
                              title="Edit Bill Notes"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={() => setPurchaseToCancel(p)}
                                title="Cancel / Void Bill"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
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

        {/* Quick Edit Notes Modal */}
        {editingPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="text-base font-bold text-foreground">
                  Edit Purchase Notes ({editingPurchase.bill_no})
                </h3>
                <button onClick={() => setEditingPurchase(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Notes & Remarks</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add shipment remarks or voucher reference..."
                  className="w-full rounded-xl border border-input bg-background/50 p-2.5 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={updatePurchaseMutation.isPending}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  {updatePurchaseMutation.isPending ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(purchaseToCancel)}
          onClose={() => setPurchaseToCancel(null)}
          onConfirm={handleConfirmCancel}
          isPending={cancelPurchaseMutation.isPending}
          confirmText="Confirm Cancel"
          title="Cancel Purchase Bill"
          message="Are you sure you want to cancel this purchase bill? The bill status will be updated to cancelled in audit ledgers."
          itemName={purchaseToCancel ? `${purchaseToCancel.bill_no} (${purchaseToCancel.supplier_name_snapshot})` : undefined}
        />
      </div>
    </RequirePermission>
  )
}
