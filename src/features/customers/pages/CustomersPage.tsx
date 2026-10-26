import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, Users, Phone, MapPin, ArrowDownLeft, Pencil, Trash2, FileText, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { useCustomers, useDeleteCustomer } from '../queries'
import { CustomerModal } from '../components/CustomerModal'
import { CustomerStatementModal } from '../components/CustomerStatementModal'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import type { CustomerWithBalance } from '../api'

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<CustomerWithBalance | null>(null)
  const [statementCustomer, setStatementCustomer] = useState<CustomerWithBalance | null>(null)
  const [isStatementOpen, setIsStatementOpen] = useState(false)

  const { data: customers = [], isLoading } = useCustomers(searchTerm)
  const deleteCustomerMutation = useDeleteCustomer()

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    try {
      const res = await deleteCustomerMutation.mutateAsync(customerToDelete.id)
      toast.success(res?.message || `Customer ${customerToDelete.name} deleted/archived successfully!`)
      setCustomerToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Customers & Khata"
          titleUrdu="کسٹمرز اور کھاتہ"
          description="Manage customer accounts, running ledger balances (Lena), and credit limits"
          descriptionUrdu="گاہکوں کے کھاتے، بقایا جات (لینا)، ادھار کی حد اور مکمل کھاتہ اسٹیٹمنٹ"
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
                  setSelectedCustomer(null)
                  setIsModalOpen(true)
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Customer</span>
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
              placeholder="Search by customer name, phone, shop name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">No Customers Found</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add your first customer to start recording sales and khata ledgers</p>
              <button
                onClick={() => {
                  setSelectedCustomer(null)
                  setIsModalOpen(true)
                }}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span>Add Customer</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code / Party Name</th>
                    <th className="py-3 px-4">Phone & City</th>
                    <th className="py-3 px-4">Price Tier</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4 text-right">Khata Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {customers.map((c) => {
                    const balanceVal = Number(c.balance?.current_balance || 0)
                    const isReceivable = balanceVal > 0
                    const isAdvance = balanceVal < 0

                    return (
                      <tr key={c.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                              {c.code}
                            </span>
                            <div className="font-bold text-foreground">{c.name}</div>
                            {c.is_active === false && (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                                Inactive
                              </span>
                            )}
                          </div>
                          {c.business_name && (
                            <div className="text-[10px] text-muted-foreground pl-11">{c.business_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{c.phone}</span>
                          </div>
                          {c.city && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>{c.city}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary capitalize">
                            {c.price_tier} Rate
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-medium text-foreground">
                          {formatCurrency(c.credit_limit)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric font-black">
                          <span
                            className={
                              isReceivable
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isAdvance
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-muted-foreground'
                            }
                          >
                            {formatCurrency(Math.abs(balanceVal))}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isReceivable ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              <ArrowDownLeft className="h-3 w-3" />
                              <span>Receivable (Lena)</span>
                            </span>
                          ) : isAdvance ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              <span>Advance (We owe)</span>
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
                                setStatementCustomer(c)
                                setIsStatementOpen(true)
                              }}
                              title="View Customer Khata Statement"
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Khata</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(c)
                                setIsModalOpen(true)
                              }}
                              title="Edit Customer"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setCustomerToDelete(c)}
                              title="Delete Customer"
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

        {/* Add / Edit Customer Modal */}
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedCustomer(null)
          }}
          customerToEdit={selectedCustomer}
        />

        {/* Customer Khata Statement Modal */}
        <CustomerStatementModal
          isOpen={isStatementOpen}
          onClose={() => {
            setIsStatementOpen(false)
            setStatementCustomer(null)
          }}
          customer={statementCustomer}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(customerToDelete)}
          onClose={() => setCustomerToDelete(null)}
          onConfirm={handleDeleteCustomer}
          title="Delete / Archive Customer"
          message={`Are you sure you want to delete customer "${customerToDelete?.name}"? If they have existing invoices or ledgers, they will be archived instead of deleted.`}
          isPending={deleteCustomerMutation.isPending}
        />
      </div>
    </RequirePermission>
  )
}
