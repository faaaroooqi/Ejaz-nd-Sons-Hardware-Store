import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, Building2, Phone, MapPin, ArrowUpRight, Pencil, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { useSuppliers, useDeleteSupplier } from '../queries'
import { SupplierModal } from '../components/SupplierModal'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import type { SupplierWithBalance } from '../api'

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithBalance | null>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierWithBalance | null>(null)

  const { data: suppliers = [], isLoading } = useSuppliers(searchTerm)
  const deleteSupplierMutation = useDeleteSupplier()

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return
    try {
      const res = await deleteSupplierMutation.mutateAsync(supplierToDelete.id)
      toast.success(res?.message || `Supplier ${supplierToDelete.name} deleted/archived successfully!`)
      setSupplierToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.SUPPLIERS_VIEW}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Suppliers & Khata"
          titleUrdu="سپلائرز کھاتہ"
          description="Manage supplier accounts, running ledger balances (Dena), and purchase history"
          descriptionUrdu="سپلائرز کے کھاتے، واجب الادا رقم (دینا) اور خریداری کی مکمل تفصیلات"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate('/khata-import')}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
              >
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Import Old Khata (پرانا کھاتہ)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedSupplier(null)
                  setIsModalOpen(true)
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Supplier</span>
              </button>
            </div>
          }
        />

        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by supplier name, company, phone or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Supplier Directory Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">No Suppliers Found</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add your first supplier to record purchases and stock entries</p>
              <button
                onClick={() => {
                  setSelectedSupplier(null)
                  setIsModalOpen(true)
                }}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span>Add Supplier</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code / Supplier Name</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Phone & City</th>
                    <th className="py-3 px-4 text-right">Payable Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map((s) => {
                    const balanceVal = Number(s.balance?.current_balance || 0)
                    const isPayable = balanceVal > 0

                    return (
                      <tr key={s.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                              {s.code}
                            </span>
                            <div className="font-bold text-foreground">{s.name}</div>
                            {s.is_active === false && (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {s.company_name || 'Individual Supplier'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{s.phone}</span>
                          </div>
                          {s.city && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>{s.city}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-black">
                          <span className={isPayable ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                            {formatCurrency(balanceVal)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPayable ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              <ArrowUpRight className="h-3 w-3" />
                              <span>Payable (Dena)</span>
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Clear (Rs. 0)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSupplier(s)
                                setIsModalOpen(true)
                              }}
                              title="Edit Supplier"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setSupplierToDelete(s)}
                              title="Delete Supplier"
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

        {/* Add / Edit Supplier Modal */}
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedSupplier(null)
          }}
          supplierToEdit={selectedSupplier}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(supplierToDelete)}
          onClose={() => setSupplierToDelete(null)}
          onConfirm={handleDeleteSupplier}
          isPending={deleteSupplierMutation.isPending}
          title="Delete Supplier Account"
          message="Are you sure you want to delete this supplier? If there are existing purchase orders or payables ledger entries, the system will safely deactivate and archive the account to protect historical bookkeeping."
          itemName={supplierToDelete ? `${supplierToDelete.name} (${supplierToDelete.code})` : undefined}
        />
      </div>
    </RequirePermission>
  )
}
