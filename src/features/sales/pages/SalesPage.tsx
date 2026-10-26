import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Plus,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  Pencil,
  X,
  Eye,
  Truck,
  HardHat,
  Filter,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/format'
import { useSales, useCancelSale, useUpdateSale } from '../queries'
import { fetchSaleById } from '../api'
import { useCustomers } from '@/features/customers/queries'
import { PrintableInvoiceModal } from '@/components/common/PrintableInvoiceModal'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import type { Sale } from '../api'

export const SalesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editNotes, setEditNotes] = useState('')

  // View Bill Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [loadingSaleId, setLoadingSaleId] = useState<string | null>(null)

  const { data: customers = [] } = useCustomers()
  const { data: sales = [], isLoading } = useSales({
    search: searchTerm || undefined,
    customerId: selectedCustomerId || undefined,
  })

  const cancelSaleMutation = useCancelSale()
  const updateSaleMutation = useUpdateSale()

  const handleConfirmCancel = async () => {
    if (!saleToCancel) return
    try {
      await cancelSaleMutation.mutateAsync({ id: saleToCancel.id, reason: 'Cancelled by Admin' })
      toast.success(
        `Bill #${saleToCancel.bill_number ?? ''} (${saleToCancel.invoice_no}) cancelled successfully!`
      )
      setSaleToCancel(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel bill')
    }
  }

  const handleSaveNotes = async () => {
    if (!editingSale) return
    try {
      await updateSaleMutation.mutateAsync({
        id: editingSale.id,
        payload: { notes: editNotes.trim() },
      })
      toast.success(`Notes updated for Bill #${editingSale.bill_number ?? editingSale.invoice_no}`)
      setEditingSale(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sale notes')
    }
  }

  const handleViewBill = async (sale: Sale) => {
    try {
      setLoadingSaleId(sale.id)
      const details = await fetchSaleById(sale.id)
      setSelectedInvoice({
        id: details.id,
        invoice_no: details.invoice_no,
        bill_number: details.bill_number,
        bilty_number: details.bilty_number,
        laborer_name: details.laborer_name,
        sale_date: details.sale_date,
        customer_name_snapshot: details.customer_name_snapshot,
        customer_phone_snapshot: details.customer?.phone || null,
        subtotal: Number(details.subtotal),
        discount_amount: Number(details.discount_amount),
        additional_charges: Number(details.additional_charges || 0),
        grand_total: Number(details.grand_total),
        amount_paid: Number(details.amount_paid),
        balance_due: Number(details.balance_due),
        payment_status: details.payment_status,
        status: details.status,
        notes: details.notes,
        items: (details.items || []).map((it) => ({
          sku_snapshot: it.sku_snapshot || it.variant?.sku || '',
          product_name_snapshot: it.product_name_snapshot || it.variant?.product?.name || 'Item',
          unit_code_snapshot: it.unit_code_snapshot || it.variant?.product?.unit?.code || 'pcs',
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          line_total: Number(it.line_total),
        })),
      })
      setIsInvoiceModalOpen(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load bill details')
    } finally {
      setLoadingSaleId(null)
    }
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedCustomerId('')
  }

  return (
    <RequirePermission permission={PERMISSIONS.SALES_VIEW}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Sales Bills & Invoices"
          titleUrdu="سیلز بلز اور انوائسز"
          description="Record wholesale sales bills with sequential numbering, bilty, laborer, and print preview"
          descriptionUrdu="سیلز بل بنائیں، بل نمبر اور بلٹی نمبر سے تلاش کریں اور پرنٹ کریں"
          action={
            <button
              onClick={() => navigate('/sales/new')}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Sales Bill</span>
            </button>
          }
        />

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Bill # (e.g. 12 or #12), Bilty #, Laborer, Invoice # or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs min-w-[200px]">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">All Customers / Walk-in</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedCustomerId) && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset filters"
                className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Sales List Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">No Sales Bills Found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchTerm || selectedCustomerId
                  ? 'No sales match the filter criteria.'
                  : 'Create your first sale to start recording transactions.'}
              </p>
              <button
                onClick={() => navigate('/sales/new')}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span>New Sale</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Bill # / Invoice</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Transport & Laborer</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {sales.map((s) => {
                    const due = Number(s.balance_due)
                    const isCancelled = s.status === 'cancelled'

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors hover:bg-muted/30 ${
                          isCancelled ? 'opacity-60 bg-muted/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              {s.bill_number ? (
                                <span className="font-mono text-xs font-black text-primary">
                                  Bill #{s.bill_number}
                                </span>
                              ) : null}
                              {isCancelled && (
                                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                                  Cancelled
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {s.invoice_no}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                          {formatDate(s.sale_date)}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {s.customer_name_snapshot}
                        </td>
                        <td className="py-3 px-4">
                          {s.bilty_number || s.laborer_name ? (
                            <div className="text-[11px] space-y-0.5">
                              {s.bilty_number && (
                                <div className="flex items-center gap-1 text-foreground">
                                  <Truck className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{s.bilty_number}</span>
                                </div>
                              )}
                              {s.laborer_name && (
                                <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                  <HardHat className="h-2.5 w-2.5" />
                                  <span>{s.laborer_name}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-bold text-foreground">
                          {formatCurrency(s.grand_total)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric text-emerald-600 font-semibold">
                          {formatCurrency(s.amount_paid)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-bold">
                          <span className={due > 0 ? 'text-rose-600' : 'text-muted-foreground'}>
                            {formatCurrency(due)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Paid</span>
                            </span>
                          ) : s.payment_status === 'partial' ? (
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
                              onClick={() => handleViewBill(s)}
                              disabled={loadingSaleId === s.id}
                              title="View & Print Bill"
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{loadingSaleId === s.id ? '...' : 'View'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingSale(s)
                                setEditNotes(s.notes || '')
                              }}
                              title="Edit Bill Notes"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={() => setSaleToCancel(s)}
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
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="text-base font-bold text-foreground">
                  Edit Notes (Bill #{editingSale.bill_number ?? editingSale.invoice_no})
                </h3>
                <button
                  onClick={() => setEditingSale(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Notes & Delivery Particulars
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add customer reference or delivery remarks..."
                  className="w-full rounded-xl border border-input bg-background/50 p-2.5 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={updateSaleMutation.isPending}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50"
                >
                  {updateSaleMutation.isPending ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Bill Preview Modal */}
        <PrintableInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoice={selectedInvoice}
        />

        {/* Cancel Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(saleToCancel)}
          onClose={() => setSaleToCancel(null)}
          onConfirm={handleConfirmCancel}
          title="Cancel / Void Sales Bill"
          message={`Are you sure you want to cancel Bill #${saleToCancel?.bill_number ?? ''} (${saleToCancel?.invoice_no})? This will safely reverse the customer ledger debit, return items to inventory stock, create an audit record, and keep the bill number permanently preserved without reuse.`}
          confirmText="Yes, Cancel Bill"
          isPending={cancelSaleMutation.isPending}
        />
      </div>
    </RequirePermission>
  )
}
