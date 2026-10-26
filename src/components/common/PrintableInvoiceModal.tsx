import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { formatPKR, formatDate } from '@/lib/format'

export interface PrintableInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: {
    id?: string
    invoice_no: string
    bill_number?: number | string | null
    bilty_number?: string | null
    laborer_name?: string | null
    sale_date: string
    customer_name_snapshot: string
    customer_phone_snapshot?: string | null
    subtotal: number
    discount_amount: number
    additional_charges?: number
    grand_total: number
    amount_paid: number
    balance_due: number
    payment_status: string
    status?: string
    notes?: string | null
    items?: {
      sku_snapshot: string
      product_name_snapshot: string
      unit_code_snapshot: string
      quantity: number
      rate: number
      line_total: number
    }[]
  } | null
}

export function PrintableInvoiceModal({ isOpen, onClose, invoice }: PrintableInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !invoice) return null

  const handlePrint = () => {
    window.print()
  }

  const isCancelled = invoice.status === 'cancelled'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-card p-6 shadow-2xl border border-border space-y-6 my-8">
        {/* Action Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">Sales Bill Print Preview</h2>
            {invoice.bill_number && (
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-black text-primary">
                Bill #{invoice.bill_number}
              </span>
            )}
            {isCancelled && (
              <span className="rounded-lg bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive uppercase">
                CANCELLED / VOID
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Bill Container */}
        <div ref={printRef} className="relative p-8 bg-white text-black rounded-lg space-y-6 print:p-0 print:shadow-none">
          {/* Cancelled Watermark */}
          {isCancelled && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rotate-[-25deg] text-6xl font-black uppercase text-red-500/20 border-8 border-dashed border-red-500/20 px-12 py-4 rounded-3xl">
                CANCELLED / VOID
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-wide">Ejaz and sons hardware store</h1>
              <p className="text-xs text-gray-600">Main Wholesale Market, Pakistan</p>
              <p className="text-xs text-gray-600">Phone: +92 300 0000000 | NTN: 1234567-8</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-primary">SALES BILL</h2>
              {invoice.bill_number && (
                <p className="text-base font-mono font-extrabold text-black mt-0.5">
                  Bill #{invoice.bill_number}
                </p>
              )}
              <p className="text-xs font-mono font-semibold text-gray-500">Ref: {invoice.invoice_no}</p>
              <p className="text-xs text-gray-600 mt-1">Date: {formatDate(invoice.sale_date)}</p>
            </div>
          </div>

          {/* Customer & Delivery Metadata */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-md border border-gray-200 text-xs">
            <div>
              <span className="font-bold text-gray-500 uppercase block mb-1">Customer:</span>
              <p className="font-bold text-sm text-black">{invoice.customer_name_snapshot}</p>
              {invoice.customer_phone_snapshot && (
                <p className="text-gray-600">Phone: {invoice.customer_phone_snapshot}</p>
              )}
            </div>
            <div>
              <span className="font-bold text-gray-500 uppercase block mb-1">Transport & Delivery:</span>
              <p className="text-gray-700">
                <span className="font-semibold">Bilty #:</span> {invoice.bilty_number || '—'}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Laborer:</span> {invoice.laborer_name || '—'}
              </p>
            </div>
            <div className="text-right">
              <span className="font-bold text-gray-500 uppercase block mb-1">Payment Status:</span>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase border border-black">
                {invoice.payment_status}
              </span>
              {isCancelled && (
                <span className="block mt-1 font-bold text-xs text-red-600 uppercase">
                  Bill Cancelled
                </span>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase text-gray-700 font-bold border-b border-gray-300">
              <tr>
                <th className="p-2 border border-gray-300 text-center">#</th>
                <th className="p-2 border border-gray-300">SKU</th>
                <th className="p-2 border border-gray-300">Item Description</th>
                <th className="p-2 border border-gray-300 text-right">Qty</th>
                <th className="p-2 border border-gray-300 text-right">Rate (PKR)</th>
                <th className="p-2 border border-gray-300 text-right">Line Total (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2 border border-gray-300 text-center font-mono">{idx + 1}</td>
                  <td className="p-2 border border-gray-300 font-mono font-medium">{item.sku_snapshot}</td>
                  <td className="p-2 border border-gray-300 font-medium">{item.product_name_snapshot}</td>
                  <td className="p-2 border border-gray-300 text-right font-mono">
                    {item.quantity} {item.unit_code_snapshot}
                  </td>
                  <td className="p-2 border border-gray-300 text-right font-mono">{formatPKR(item.rate)}</td>
                  <td className="p-2 border border-gray-300 text-right font-mono font-bold">{formatPKR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calculations Summary */}
          <div className="flex justify-between items-start">
            <div className="max-w-xs text-xs text-gray-600">
              {invoice.notes && (
                <div className="p-2 rounded bg-gray-50 border border-gray-200">
                  <span className="font-bold block text-gray-700">Remarks / Notes:</span>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>
            <div className="w-64 space-y-1 text-xs border border-gray-300 p-3 rounded-md bg-gray-50">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">{formatPKR(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-mono">- {formatPKR(invoice.discount_amount)}</span>
                </div>
              )}
              {invoice.additional_charges && invoice.additional_charges > 0 ? (
                <div className="flex justify-between">
                  <span>Other Charges:</span>
                  <span className="font-mono">+ {formatPKR(invoice.additional_charges)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-extrabold border-t border-gray-400 pt-1 text-black">
                <span>Grand Total:</span>
                <span className="font-mono">{formatPKR(invoice.grand_total)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Amount Paid:</span>
                <span className="font-mono font-bold">{formatPKR(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-1 text-red-600">
                <span>Balance Due:</span>
                <span className="font-mono">{formatPKR(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signatures */}
          <div className="pt-6 border-t border-gray-300 grid grid-cols-2 gap-4 text-[10px] text-gray-600">
            <div>
              <p className="font-bold text-gray-800">Terms & Conditions:</p>
              <p>1. Payment due upon delivery or per wholesale credit terms.</p>
              <p>2. Goods once sold are not refundable without original bill.</p>
            </div>
            <div className="flex justify-end items-end gap-12 pt-8">
              <div className="text-center border-t border-gray-400 px-4">Customer Signature</div>
              <div className="text-center border-t border-gray-400 px-4">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
