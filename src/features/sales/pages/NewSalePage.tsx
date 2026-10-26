import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Trash2, ShoppingCart, Search, CheckCircle2, Truck, HardHat, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { calculateInvoiceTotals } from '@/lib/finance'
import { useProducts } from '@/features/catalog/queries'
import { useCustomers } from '@/features/customers/queries'
import { usePostSaleInvoice } from '../queries'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PageHeader } from '@/components/common/PageHeader'
import { PERMISSIONS } from '@/lib/permissions'
import { parseAppError } from '@/lib/errors'

interface LineItem {
  variant_id: string
  product_name: string
  sku: string
  unit_code: string
  default_rate: number
  rate: number
  quantity: number
  discount: number
}

export const NewSalePage: React.FC = () => {
  const navigate = useNavigate()
  const postSale = usePostSaleInvoice()
  const { data: products = [] } = useProducts()
  const { data: customers = [] } = useCustomers()

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [biltyNumber, setBiltyNumber] = useState('')
  const [laborerName, setLaborerName] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])
  const [invoiceDiscount, setInvoiceDiscount] = useState<number | ''>(0)
  const [additionalCharges, setAdditionalCharges] = useState<number | ''>(0)
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  // Calculate live financial totals using Big.js helper
  const calcResults = calculateInvoiceTotals(
    lines.map((l) => ({
      quantity: l.quantity,
      rate: l.rate,
      discount: l.discount,
      discountType: 'amount',
    })),
    invoiceDiscount || 0,
    'amount',
    additionalCharges || 0
  )

  const handleAddProduct = (variantId: string) => {
    const prod = products.find((p) => p.variants.some((v) => v.id === variantId))
    const variant = prod?.variants.find((v) => v.id === variantId)
    if (!prod || !variant) return

    // Check if item already exists in lines
    const existingIndex = lines.findIndex((l) => l.variant_id === variantId)
    if (existingIndex >= 0) {
      const updated = [...lines]
      updated[existingIndex].quantity += 1
      setLines(updated)
    } else {
      setLines([
        ...lines,
        {
          variant_id: variant.id,
          product_name: prod.name,
          sku: variant.sku,
          unit_code: prod.unit?.code || 'pcs',
          default_rate: Number(variant.default_rate),
          rate: Number(variant.default_rate),
          quantity: 1,
          discount: 0,
        },
      ])
    }
    setProductSearch('')
  }

  const handleLineChange = (index: number, field: keyof LineItem, val: number) => {
    const updated = [...lines]
    ;(updated[index] as any)[field] = val
    setLines(updated)
  }

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lines.length === 0) {
      toast.error('Add at least one hardware product item to the invoice.')
      return
    }

    const paidVal = amountPaid === '' ? calcResults.grandTotal : Number(amountPaid)

    try {
      const result = await postSale.mutateAsync({
        customer_id: selectedCustomerId || null,
        bilty_number: biltyNumber.trim() || null,
        laborer_name: laborerName.trim() || null,
        discount_amount: Number(invoiceDiscount) || 0,
        additional_charges: Number(additionalCharges) || 0,
        amount_paid: paidVal,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          variant_id: l.variant_id,
          quantity: l.quantity,
          rate: l.rate,
          discount_amount: l.discount,
        })),
      })

      const billNumStr = result.bill_number ? `Bill #${result.bill_number}` : result.invoice_no
      toast.success(`Sales ${billNumStr} posted successfully!`)
      navigate('/sales')
    } catch (err: unknown) {
      const appErr = parseAppError(err)
      toast.error(appErr.message)
    }
  }

  // Filter products for dropdown
  const filteredProducts = products.flatMap((p) =>
    p.variants
      .filter(
        (v) =>
          !productSearch ||
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          v.sku.toLowerCase().includes(productSearch.toLowerCase())
      )
      .map((v) => ({ product: p, variant: v }))
  )

  return (
    <RequirePermission permission={PERMISSIONS.SALES_CREATE}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <PageHeader
          title="New Sales Bill (POS)"
          titleUrdu="نیا سیلز بل"
          description="Create cash/credit wholesale sales bill with automatic sequential bill numbering"
          descriptionUrdu="خرید و فروخت کا بل بنائیں - سسٹم کا خودکار اور مستقل بل نمبر جاری ہوگا"
        />

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Line Items Column */}
          <div className="space-y-4 lg:col-span-2">
            {/* Auto Bill Number Info Banner */}
            <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary shadow-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="font-bold">Bill Number (بل نمبر):</span>
                <span className="font-medium text-foreground">
                  Monotonically increasing & auto-assigned upon submission (DB-secured)
                </span>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold">
                Auto-Generated
              </span>
            </div>

            {/* Item Search Selector */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <label className="block text-xs font-bold text-foreground">Search & Add Item SKU</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type product name or SKU code (e.g. Screwdriver, STN-FSD-06)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Search Results Dropdown */}
              {productSearch.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">No matching product found</div>
                  ) : (
                    filteredProducts.slice(0, 8).map(({ product: p, variant: v }) => {
                      const stockQty = v.stock?.quantity_on_hand ?? 0
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleAddProduct(v.id)}
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors hover:bg-muted"
                        >
                          <div>
                            <span className="font-bold text-foreground">{p.name}</span>
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">({v.sku})</span>
                            <span
                              className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                stockQty > 0
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : stockQty === 0
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-rose-500/10 text-rose-600'
                              }`}
                            >
                              Stock: {stockQty} {p.unit?.code || ''}
                            </span>
                          </div>
                          <span className="font-numeric font-bold text-primary">{formatCurrency(v.default_rate)}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/50 p-3 text-xs font-bold text-foreground">
                Invoice Line Items ({lines.length})
              </div>

              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-xs font-medium text-muted-foreground">Invoice is empty. Search above to add items.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {lines.map((line, idx) => {
                    const lineNet = calcResults.lineTotals[idx] || 0
                    const isRateChanged = line.rate !== line.default_rate

                    return (
                      <div key={line.variant_id} className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-foreground">{line.product_name}</span>
                            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {line.sku}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-12 gap-2 text-xs">
                          <div className="col-span-3">
                            <label className="text-[10px] text-muted-foreground">Qty ({line.unit_code})</label>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                              className="mt-0.5 w-full rounded-lg border border-input bg-background py-1 px-2 font-numeric text-xs text-foreground"
                            />
                          </div>

                          <div className="col-span-4">
                            <label className="text-[10px] text-muted-foreground flex items-center justify-between">
                              <span>Actual Rate (Rs.)</span>
                              {isRateChanged && <span className="text-[9px] font-bold text-amber-600">Rate Changed</span>}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.rate}
                              onChange={(e) => handleLineChange(idx, 'rate', Math.max(0, Number(e.target.value)))}
                              className={`mt-0.5 w-full rounded-lg border py-1 px-2 font-numeric text-xs ${
                                isRateChanged ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-700' : 'border-input bg-background'
                              }`}
                            />
                          </div>

                          <div className="col-span-3">
                            <label className="text-[10px] text-muted-foreground">Discount (Rs.)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.discount}
                              onChange={(e) => handleLineChange(idx, 'discount', Math.max(0, Number(e.target.value)))}
                              className="mt-0.5 w-full rounded-lg border border-input bg-background py-1 px-2 font-numeric text-xs text-foreground"
                            />
                          </div>

                          <div className="col-span-2 text-right">
                            <label className="text-[10px] text-muted-foreground">Line Total</label>
                            <div className="mt-1.5 font-numeric font-bold text-xs text-foreground">
                              {formatCurrency(lineNet)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Customer, Delivery Details & Payment Totals */}
          <div className="space-y-4">
            {/* Customer Picker */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <label className="block text-xs font-bold text-foreground">Customer / Khata Account</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Walk-in Cash Customer (Instant Full Pay)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - Bal: Rs. {c.balance?.current_balance || 0}
                  </option>
                ))}
              </select>
            </div>

            {/* Transport & Delivery Fields (Separate Bilty # and Laborer Name) */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                <span>Transport & Delivery Details</span>
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-foreground">
                  Bilty Number (بلٹی نمبر)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BLT-8921 or Goods Transport #"
                  value={biltyNumber}
                  onChange={(e) => setBiltyNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <HardHat className="h-3 w-3 text-muted-foreground" />
                  <span>Laborer / Worker Name (مزدور کا نام)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rafiq, Akram"
                  value={laborerName}
                  onChange={(e) => setLaborerName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Invoice Totals Breakdown */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2">Invoice Summary</h3>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-numeric font-bold">{formatCurrency(calcResults.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Invoice Discount (Rs.)</span>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 rounded-lg border border-input bg-background py-1 px-2 text-right font-numeric text-xs"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Freight / Charges (Rs.)</span>
                <input
                  type="number"
                  step="0.01"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 rounded-lg border border-input bg-background py-1 px-2 text-right font-numeric text-xs"
                />
              </div>

              <div className="border-t border-border pt-2 flex justify-between text-sm font-black">
                <span>Grand Total</span>
                <span className="font-numeric text-primary">{formatCurrency(calcResults.grandTotal)}</span>
              </div>

              <div className="pt-2 border-t border-border">
                <label className="block text-[11px] font-semibold text-foreground">Amount Received Now (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={String(calcResults.grandTotal)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-input bg-background py-2 px-3 text-xs font-numeric font-bold text-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Leave empty for full payment ({formatCurrency(calcResults.grandTotal)}). Unpaid balance will post to customer Khata.
                </p>
              </div>

              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-foreground">Invoice Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Delivered via Gate 2 truck"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={postSale.isPending || lines.length === 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 disabled:opacity-50"
              >
                {postSale.isPending ? (
                  'Posting Invoice...'
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Post & Save Sales Bill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </RequirePermission>
  )
}
