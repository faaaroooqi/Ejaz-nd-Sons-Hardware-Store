import React, { useState, useEffect } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useStockLevels, usePostStockAdjustment } from '../queries'
import { useProducts } from '@/features/catalog/queries'
import { parseAppError } from '@/lib/errors'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  initialVariantId?: string
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, initialVariantId }) => {
  const { data: stockLevels = [] } = useStockLevels()
  const { data: products = [] } = useProducts()
  const postAdjustment = usePostStockAdjustment()

  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [qtyChange, setQtyChange] = useState<number | ''>(0)
  const [reason, setReason] = useState<'count_correction' | 'damage' | 'loss_theft' | 'found' | 'internal_use' | 'other'>('count_correction')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedVariantId(initialVariantId || '')
      setQtyChange(0)
      setNotes('')
      setReason('count_correction')
    }
  }, [isOpen, initialVariantId])

  if (!isOpen) return null

  // Flatten all variants from catalog products with their live stock
  const allVariants = products.length > 0
    ? products.flatMap((p) =>
        p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          productName: p.name,
          unitCode: p.unit?.code || 'pcs',
          currentStock: v.stock?.quantity_on_hand ?? 0,
        }))
      )
    : stockLevels.map((item: any) => ({
        id: item.variant_id,
        sku: item.variant?.sku || 'SKU',
        productName: item.variant?.product?.name || 'Item',
        unitCode: item.variant?.product?.unit?.code || 'pcs',
        currentStock: item.quantity_on_hand || 0,
      }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariantId || qtyChange === '' || qtyChange === 0) {
      toast.error('Select an item SKU and enter non-zero stock change quantity.')
      return
    }

    try {
      const result = await postAdjustment.mutateAsync({
        reason,
        notes: notes.trim() || undefined,
        items: [
          {
            variant_id: selectedVariantId,
            qty_change: Number(qtyChange),
          },
        ],
      })
      toast.success(`Stock adjustment ${result?.adjustment_no || ''} recorded successfully!`)
      onClose()
    } catch (err: unknown) {
      const appErr = parseAppError(err)
      toast.error(appErr.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Stock Adjustment</h2>
              <p className="text-xs text-muted-foreground">Adjust physical stock count with immutable movement audit</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground">Select Product SKU *</label>
            <select
              required
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select SKU --</option>
              {allVariants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productName} ({item.sku}) - Current: {item.currentStock} {item.unitCode}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground">Quantity Change (+/-) *</label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="e.g. +10 or -2"
                value={qtyChange}
                onChange={(e) => setQtyChange(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs font-numeric font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Positive = Stock In / Found. Negative = Damage / Loss.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="count_correction">Count Correction</option>
                <option value="damage">Damage / Broken</option>
                <option value="loss_theft">Loss / Theft</option>
                <option value="found">Found Extra</option>
                <option value="internal_use">Internal Shop Use</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">Adjustment Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Physical stock verification count on Shelf 3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={postAdjustment.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              {postAdjustment.isPending ? 'Posting...' : 'Post Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
