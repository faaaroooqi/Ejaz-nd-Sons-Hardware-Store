import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Trash2, ShoppingBag, Search, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { calculateInvoiceTotals } from '@/lib/finance'
import { useProducts } from '@/features/catalog/queries'
import { useSuppliers } from '@/features/suppliers/queries'
import { usePostPurchaseEntry } from '../queries'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PageHeader } from '@/components/common/PageHeader'
import { PERMISSIONS } from '@/lib/permissions'
import { parseAppError } from '@/lib/errors'

interface LineItem {
  variant_id: string
  product_name: string
  sku: string
  unit_code: string
  purchase_rate: number
  quantity: number
  discount: number
}

export const NewPurchasePage: React.FC = () => {
  const navigate = useNavigate()
  const postPurchase = usePostPurchaseEntry()
  const { data: products = [] } = useProducts()
  const { data: suppliers = [] } = useSuppliers()

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [supplierInvNo, setSupplierInvNo] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])
  const [discountAmount, setDiscountAmount] = useState<number | ''>(0)
  const [additionalCharges, setAdditionalCharges] = useState<number | ''>(0)
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const calcResults = calculateInvoiceTotals(
    lines.map((l) => ({
      quantity: l.quantity,
      rate: l.purchase_rate,
      discount: l.discount,
      discountType: 'amount',
    })),
    discountAmount || 0,
    'amount',
    additionalCharges || 0
  )

  const handleAddProduct = (variantId: string) => {
    const prod = products.find((p) => p.variants.some((v) => v.id === variantId))
    const variant = prod?.variants.find((v) => v.id === variantId)
    if (!prod || !variant) return

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
          purchase_rate: Number(variant.default_rate) * 0.85, // Default estimated cost
          quantity: 10,
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
    if (!selectedSupplierId) {
      toast.error('Select a supplier for this purchase entry.')
      return
    }
    if (lines.length === 0) {
      toast.error('Add at least one item to the purchase entry.')
      return
    }

    try {
      const result = await postPurchase.mutateAsync({
        supplier_id: selectedSupplierId,
        supplier_invoice_no: supplierInvNo.trim() || undefined,
        discount_amount: Number(discountAmount) || 0,
        additional_charges: Number(additionalCharges) || 0,
        amount_paid: Number(amountPaid) || 0,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          variant_id: l.variant_id,
          quantity: l.quantity,
          purchase_rate: l.purchase_rate,
          discount_amount: l.discount,
        })),
      })

      toast.success(`Purchase Entry ${result.bill_no || result.purchase_no} recorded! Stock & weighted average cost updated.`)
      navigate('/purchases')
    } catch (err: unknown) {
      const appErr = parseAppError(err)
      toast.error(appErr.message)
    }
  }

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
    <RequirePermission permission={PERMISSIONS.PURCHASES_CREATE}>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="New Purchase Entry (Stock In)"
          titleUrdu="نیا پرچیز بل"
          description="Record stock received from supplier with freight & weighted average cost calculation"
          descriptionUrdu="سپلائر سے مال کی وصولی درج کریں، خریداری ریٹ اور سپلائر بقایا جات"
        />

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <label className="block text-xs font-bold text-foreground">Search Item SKU to Purchase</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type product name or SKU code..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

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
                          <span className="font-numeric font-bold text-foreground">{formatCurrency(v.default_rate)}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/50 p-3 text-xs font-bold text-foreground">
                Purchase Order Lines ({lines.length})
              </div>

              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-xs font-medium text-muted-foreground">No items added to purchase order yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {lines.map((line, idx) => {
                    const lineNet = calcResults.lineTotals[idx] || 0

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
                            <label className="text-[10px] text-muted-foreground">Purchase Cost Rate (Rs.)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.purchase_rate}
                              onChange={(e) => handleLineChange(idx, 'purchase_rate', Math.max(0, Number(e.target.value)))}
                              className="mt-0.5 w-full rounded-lg border border-input bg-background py-1 px-2 font-numeric text-xs font-bold text-foreground"
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

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground">Select Supplier *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.company_name || 'Vendor'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground">Supplier Invoice / Bilty #</label>
                <input
                  type="text"
                  placeholder="e.g. BILL-98742"
                  value={supplierInvNo}
                  onChange={(e) => setSupplierInvNo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background/50 py-1.5 px-3 text-xs font-mono text-foreground"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2">Purchase Summary</h3>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-numeric font-bold">{formatCurrency(calcResults.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Discount Received (Rs.)</span>
                <input
                  type="number"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 rounded-lg border border-input bg-background py-1 px-2 text-right font-numeric text-xs"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Freight / Loading (Rs.)</span>
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
                <label className="block text-[11px] font-semibold text-foreground">Amount Paid to Supplier (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0 (Unpaid posts to Payable Dena)"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-input bg-background py-2 px-3 text-xs font-numeric font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-foreground">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Received at Shop 1 Godown"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={postPurchase.isPending || lines.length === 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 disabled:opacity-50"
              >
                {postPurchase.isPending ? (
                  'Posting Purchase...'
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Post Purchase Order</span>
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
