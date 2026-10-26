import React, { useState, useRef } from 'react'
import {
  X,
  Printer,
  Search,
  Calendar,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  HardHat,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/format'
import { useCustomerStatement } from '../queries'
import { fetchSaleById } from '@/features/sales/api'
import { PrintableInvoiceModal } from '@/components/common/PrintableInvoiceModal'
import type { CustomerWithBalance, CustomerStatementRow } from '../api'

interface CustomerStatementModalProps {
  isOpen: boolean
  onClose: () => void
  customer: CustomerWithBalance | null
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilterSearch, setActiveFilterSearch] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [loadingSaleId, setLoadingSaleId] = useState<string | null>(null)

  const printRef = useRef<HTMLDivElement>(null)

  const { data: statement, isLoading } = useCustomerStatement(
    customer?.id || null,
    {
      from: fromDate || null,
      to: toDate || null,
      search: activeFilterSearch || null,
    }
  )

  if (!isOpen || !customer) return null

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFilterSearch(searchTerm.trim())
  }

  const handleResetFilters = () => {
    setFromDate('')
    setToDate('')
    setSearchTerm('')
    setActiveFilterSearch('')
  }

  const handleViewBill = async (saleId: string) => {
    try {
      setLoadingSaleId(saleId)
      const sale = await fetchSaleById(saleId)
      setSelectedInvoice({
        id: sale.id,
        invoice_no: sale.invoice_no,
        bill_number: sale.bill_number,
        bilty_number: sale.bilty_number,
        laborer_name: sale.laborer_name,
        sale_date: sale.sale_date,
        customer_name_snapshot: sale.customer_name_snapshot,
        customer_phone_snapshot: (sale as any).customer?.phone || null,
        subtotal: Number(sale.subtotal),
        discount_amount: Number(sale.discount_amount),
        additional_charges: Number(sale.additional_charges || 0),
        grand_total: Number(sale.grand_total),
        amount_paid: Number(sale.amount_paid),
        balance_due: Number(sale.balance_due),
        payment_status: sale.payment_status,
        status: sale.status,
        notes: sale.notes,
        items: (sale.items || []).map((it) => ({
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

  const handlePrint = () => {
    window.print()
  }

  const rows: CustomerStatementRow[] = statement?.rows || []
  const openingBalance = Number(statement?.opening_balance || 0)
  const totalDebit = Number(statement?.total_debit || 0)
  const totalCredit = Number(statement?.total_credit || 0)
  const closingBalance = Number(statement?.closing_balance || 0)
  const isMatch = statement?.balance_matches_cache ?? true

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-5xl rounded-2xl bg-card p-6 shadow-2xl border border-border space-y-5 my-6 max-h-[92vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Customer Khata Statement (کھاتہ اسٹیٹمنٹ)
                </h2>
                <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                  {customer.code}
                </span>
                {customer.is_active === false && (
                  <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-bold text-foreground">{customer.name}</span>
                {customer.business_name ? ` • ${customer.business_name}` : ''}
                {customer.phone ? ` • Phone: ${customer.phone}` : ''}
                {customer.city ? ` • ${customer.city}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-muted"
              >
                <Printer className="h-4 w-4" />
                <span>Print Statement</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <form onSubmit={handleApplySearch} className="flex flex-1 items-center gap-2 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by Bill # (e.g. 12 or #12), Bilty #, or Laborer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                Filter
              </button>
            </form>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-input bg-background py-1 px-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] text-muted-foreground">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-input bg-background py-1 px-2 text-xs"
                />
              </div>

              {(fromDate || toDate || activeFilterSearch || searchTerm) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Clear all filters"
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Opening / Brought Forward
              </span>
              <span className="font-numeric text-sm font-bold text-foreground">
                {formatCurrency(openingBalance)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Total Bills (Debits)
              </span>
              <span className="font-numeric text-sm font-bold text-rose-600">
                + {formatCurrency(totalDebit)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Payments & Returns (Credits)
              </span>
              <span className="font-numeric text-sm font-bold text-emerald-600">
                - {formatCurrency(totalCredit)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-medium text-muted-foreground">
                  Current Net Balance
                </span>
                {isMatch ? (
                  <span title="Ledger matches balance">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </span>
                ) : (
                  <span title="Balance discrepancy">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </span>
                )}
              </div>
              <span
                className={`font-numeric text-base font-black ${
                  closingBalance > 0
                    ? 'text-rose-600'
                    : closingBalance < 0
                    ? 'text-amber-600'
                    : 'text-muted-foreground'
                }`}
              >
                {formatCurrency(Math.abs(closingBalance))}
                <span className="ml-1 text-[10px] font-normal uppercase">
                  {closingBalance > 0 ? '(Lena / Receivable)' : closingBalance < 0 ? '(Advance / Dena)' : '(NIL)'}
                </span>
              </span>
            </div>
          </div>

          {/* Statement Ledger Table */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <h4 className="mt-2 text-sm font-bold text-foreground">No Statement Records</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeFilterSearch || fromDate || toDate
                    ? 'No entries match the specified filter criteria'
                    : 'No ledger transactions recorded for this customer yet.'}
                </p>
              </div>
            ) : (
              <div ref={printRef} className="print:p-4">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur-xs text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference / Bill #</th>
                      <th className="py-2.5 px-3">Bilty / Laborer</th>
                      <th className="py-2.5 px-3 text-right">Debit (Rs.)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Rs.)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                      <th className="py-2.5 px-3 text-center print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border">
                    {rows.map((row) => {
                      const isSale = row.entry_type === 'sale'
                      const isPayment = row.entry_type === 'payment'
                      const isReturn = row.entry_type === 'sales_return' || row.entry_type === 'return'
                      const isOpening = row.entry_type === 'opening_balance'
                      const isReversal = row.entry_type === 'reversal'
                      const rb = Number(row.running_balance)

                      return (
                        <tr
                          key={row.entry_id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                            {formatDate(row.entry_date)}
                          </td>
                          <td className="py-2.5 px-3">
                            {isSale ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                <ArrowDownLeft className="h-3 w-3" /> Sale Bill
                              </span>
                            ) : isPayment ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                <ArrowUpRight className="h-3 w-3" /> Payment
                              </span>
                            ) : isReturn ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                Return
                              </span>
                            ) : isOpening ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-400">
                                Opening Bal
                              </span>
                            ) : isReversal ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                Cancelled Reversal
                              </span>
                            ) : (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">
                                {row.entry_type}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              {row.bill_number ? (
                                <span className="font-mono text-xs font-bold text-primary">
                                  Bill #{row.bill_number}
                                </span>
                              ) : null}
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {row.reference_no || row.description}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {row.bilty_number || row.laborer_name ? (
                              <div className="text-[11px]">
                                {row.bilty_number && (
                                  <div className="flex items-center gap-1 text-foreground">
                                    <Truck className="h-3 w-3 text-muted-foreground" />
                                    <span>{row.bilty_number}</span>
                                  </div>
                                )}
                                {row.laborer_name && (
                                  <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                    <HardHat className="h-2.5 w-2.5" />
                                    <span>{row.laborer_name}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-numeric font-medium">
                            {Number(row.debit) > 0 ? (
                              <span className="text-rose-600 font-bold">
                                {formatCurrency(row.debit)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-numeric font-medium">
                            {Number(row.credit) > 0 ? (
                              <span className="text-emerald-600 font-bold">
                                {formatCurrency(row.credit)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-numeric font-bold">
                            <span
                              className={
                                rb > 0
                                  ? 'text-rose-600'
                                  : rb < 0
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              {formatCurrency(Math.abs(rb))}
                              {rb < 0 ? ' (Adv)' : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center print:hidden">
                            {row.sale_id ? (
                              <button
                                onClick={() => handleViewBill(row.sale_id!)}
                                disabled={loadingSaleId === row.sale_id}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                                title="View Saved Bill Details & Line Items"
                              >
                                <Eye className="h-3 w-3" />
                                <span>{loadingSaleId === row.sale_id ? 'Loading...' : 'View Bill'}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Printable Invoice Modal for Bill details view */}
      <PrintableInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={selectedInvoice}
      />
    </>
  )
}
