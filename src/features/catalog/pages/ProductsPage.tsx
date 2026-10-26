import React, { useState } from 'react'
import { Plus, Search, Package, Layers, Tag, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { useProducts, useDeleteProduct } from '../queries'
import { ProductFormModal } from '../components/ProductFormModal'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import type { ProductWithVariants } from '../api'

export const ProductsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)
  const [productToDelete, setProductToDelete] = useState<ProductWithVariants | null>(null)

  const { data: products = [], isLoading } = useProducts(searchTerm)
  const deleteProductMutation = useDeleteProduct()

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      const res = await deleteProductMutation.mutateAsync(productToDelete.id)
      toast.success(res?.message || `Product ${productToDelete.name} deleted/archived successfully!`)
      setProductToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.CATALOG_VIEW}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Products & SKUs"
          titleUrdu="آئٹمز اور ریٹس"
          description="Manage hardware item catalog, variants, and wholesale/retail price rates"
          descriptionUrdu="ہارڈویئر آئٹمز کی لسٹ، سائز و اقسام اور ہول سیل و ریٹیل ریٹ مقرر کریں"
          action={
            <button
              onClick={() => {
                setSelectedProduct(null)
                setIsModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product SKU</span>
            </button>
          }
        />

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by product name, SKU, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Product List Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">No Products Found</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add your first hardware product SKU to start managing inventory</p>
              <button
                onClick={() => {
                  setSelectedProduct(null)
                  setIsModalOpen(true)
                }}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item Name / Model</th>
                    <th className="py-3 px-4">SKU Code</th>
                    <th className="py-3 px-4">Category / Brand</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Default Rate</th>
                    <th className="py-3 px-4 text-right">Wholesale Rate</th>
                    <th className="py-3 px-4 text-right">Retail Rate</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Min Stock</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const defaultVariant = p.variants.find((v) => v.is_default) || p.variants[0]
                    const currentStock = defaultVariant?.stock?.quantity_on_hand ?? 0
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{p.name}</span>
                            {p.is_active === false && (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                                Archived
                              </span>
                            )}
                          </div>
                          {p.model && <div className="text-[10px] text-muted-foreground">{p.model}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                            {defaultVariant?.sku || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{p.category?.name || 'Unassigned'}</span>
                          </div>
                          {p.brand && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <Tag className="h-3 w-3" />
                              <span>{p.brand.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{p.unit?.name} ({p.unit?.code})</td>
                        <td className="py-3 px-4 text-right font-numeric font-bold text-foreground">
                          {formatCurrency(defaultVariant?.default_rate || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-medium text-foreground">
                          {formatCurrency(defaultVariant?.wholesale_rate || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-medium text-foreground">
                          {formatCurrency(defaultVariant?.retail_rate || 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-numeric font-medium">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            currentStock > 0
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : currentStock === 0
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {currentStock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-numeric font-medium text-muted-foreground">
                          {defaultVariant?.min_stock_level || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedProduct(p)
                                setIsModalOpen(true)
                              }}
                              title="Edit Product"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              title="Delete Product"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

        {/* Add / Edit Product Modal */}
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedProduct(null)
          }}
          productToEdit={selectedProduct}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(productToDelete)}
          onClose={() => setProductToDelete(null)}
          onConfirm={handleDeleteProduct}
          isPending={deleteProductMutation.isPending}
          title="Delete Product SKU"
          message="Are you sure you want to delete this hardware product? If this SKU has transaction records (sales, purchases, movements), the system will safely archive it to preserve audit logs."
          itemName={productToDelete ? `${productToDelete.name} (${productToDelete.variants?.[0]?.sku || ''})` : undefined}
        />
      </div>
    </RequirePermission>
  )
}
