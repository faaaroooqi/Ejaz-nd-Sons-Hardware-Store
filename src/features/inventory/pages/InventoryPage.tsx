import React, { useState } from 'react'
import { Boxes, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { formatQuantity, formatDateTime } from '@/lib/format'
import { useStockLevels, useStockMovements } from '../queries'
import { StockAdjustmentModal } from '../components/StockAdjustmentModal'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'levels' | 'movements'>('levels')
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined)
  const { data: stockLevels = [], isLoading: isLoadingLevels } = useStockLevels()
  const { data: movements = [], isLoading: isLoadingMovements } = useStockMovements()

  return (
    <RequirePermission permission={PERMISSIONS.INVENTORY_VIEW}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Inventory & Stock Movements"
          titleUrdu="گودام کا اسٹاک"
          description="Perpetual stock levels, low-stock alerts, and immutable stock movement log"
          descriptionUrdu="موجودہ اسٹاک کی تعداد، کم مال کے الرٹس اور مال کی آمد و روانگی کا کھاتہ"
          action={
            <button
              onClick={() => {
                setSelectedVariantId(undefined)
                setIsAdjModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Stock Adjustment</span>
            </button>
          }
        />

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('levels')}
            className={`border-b-2 py-2.5 px-4 text-xs font-bold transition-all ${
              activeTab === 'levels'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Stock Levels ({stockLevels.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`border-b-2 py-2.5 px-4 text-xs font-bold transition-all ${
              activeTab === 'movements'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Movement History Ledger
          </button>
        </div>

        {/* Stock Levels View */}
        {activeTab === 'levels' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {isLoadingLevels ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : stockLevels.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Boxes className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-foreground">No Stock Levels</h3>
                <p className="mt-1 text-xs text-muted-foreground">Stock levels will update automatically when purchases or opening stock are recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Item SKU / Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Current Stock</th>
                      <th className="py-3 px-4 text-right">Min Level</th>
                      <th className="py-3 px-4 text-center">Stock Health</th>
                      <th className="py-3 px-4 text-right">Last Movement</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stockLevels.map((item: any) => {
                      const qty = Number(item.quantity_on_hand)
                      const minLevel = Number(item.variant?.min_stock_level || 0)
                      const isLow = qty <= minLevel

                      return (
                        <tr key={item.variant_id} className="transition-colors hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                                {item.variant?.sku}
                              </span>
                              <div className="font-bold text-foreground">{item.variant?.product?.name}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {item.variant?.product?.category?.name || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-black text-sm text-foreground">
                            {formatQuantity(qty, item.variant?.product?.unit?.allow_decimal)} {item.variant?.product?.unit?.code}
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-medium text-muted-foreground">
                            {minLevel}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Low Stock</span>
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                Adequate
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground text-[11px]">
                            {formatDateTime(item.last_movement_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedVariantId(item.variant_id)
                                setIsAdjModalOpen(true)
                              }}
                              title="Adjust Stock Quantity"
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-muted transition-colors"
                            >
                              <SlidersHorizontal className="h-3 w-3 text-primary" />
                              <span>Adjust</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stock Movements Log View */}
        {activeTab === 'movements' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {isLoadingMovements ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No stock movements recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Item SKU</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                      <th className="py-3 px-4">Source Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((m: any) => {
                      const qty = Number(m.quantity)
                      const isInbound = qty > 0

                      return (
                        <tr key={m.id} className="transition-colors hover:bg-muted/30">
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                            {formatDateTime(m.created_at)}
                          </td>
                          <td className="py-3 px-4 font-bold text-foreground">
                            {m.variant?.sku || 'SKU'} - {m.variant?.product?.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-foreground">
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-black">
                            <span className={isInbound ? 'text-emerald-600' : 'text-rose-600'}>
                              {isInbound ? '+' : ''}{qty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-semibold text-foreground">
                            {m.balance_after}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-[11px]">
                            {m.source_type} ({m.source_id ? m.source_id.slice(0, 8) : '-'})
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stock Adjustment Modal */}
        <StockAdjustmentModal
          isOpen={isAdjModalOpen}
          initialVariantId={selectedVariantId}
          onClose={() => {
            setIsAdjModalOpen(false)
            setSelectedVariantId(undefined)
          }}
        />
      </div>
    </RequirePermission>
  )
}

