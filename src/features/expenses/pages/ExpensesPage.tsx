import { useState } from 'react'
import { Plus, Search, DollarSign, Calendar, Tag, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useExpenses, useDeleteExpense } from '../queries'
import { ExpenseModal } from '../components/ExpenseModal'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { PageHeader } from '@/components/common/PageHeader'
import { formatPKR, formatDate } from '@/lib/format'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import type { Expense } from '../api'

export function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  const { data: expenses = [], isLoading, error } = useExpenses(search)
  const deleteExpenseMutation = useDeleteExpense()

  const totalExpenseAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return
    try {
      await deleteExpenseMutation.mutateAsync(expenseToDelete.id)
      toast.success(`Expense ${expenseToDelete.expense_no} deleted successfully!`)
      setExpenseToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete expense')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.EXPENSES_VIEW}>
      <div className="space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Business Expenses"
          titleUrdu="دکان کے اخراجات"
          description="Record shop utilities, rent, freight, salaries, and daily petty cash outflows."
          descriptionUrdu="دکان اور گودام کے اخراجات، کرایہ، بل، کرایہ گاڑی اور روزمرہ کے متفرق خرچے"
          action={
            <button
              onClick={() => {
                setSelectedExpense(null)
                setIsModalOpen(true)
              }}
              className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Record New Expense
            </button>
          }
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Filtered Expenses</p>
              <h3 className="text-xl font-bold text-foreground">{formatPKR(totalExpenseAmount)}</h3>
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expense Entries</p>
              <h3 className="text-xl font-bold text-foreground">{expenses.length}</h3>
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Period</p>
              <h3 className="text-xl font-bold text-foreground">Current Month</h3>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by expense #, category, description, or paid to..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading expense records...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">Failed to load expenses: {(error as any).message}</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No expense entries found matching your query.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Expense #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Particulars / Description</th>
                    <th className="px-4 py-3">Paid To</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((exp: any) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">{exp.expense_no}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(exp.expense_date)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                          {exp.category?.name || 'Expense'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{exp.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{exp.paid_to || 'N/A'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {exp.account?.name || 'Cash'} ({exp.payment_method})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-500">{formatPKR(exp.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedExpense(exp)
                              setIsModalOpen(true)
                            }}
                            title="Edit Expense"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(exp)}
                            title="Delete Expense"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Expense Modal */}
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedExpense(null)
          }}
          expenseToEdit={selectedExpense}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(expenseToDelete)}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={handleDeleteExpense}
          isPending={deleteExpenseMutation.isPending}
          title="Delete Expense Record"
          message="Are you sure you want to delete this expense record? This will permanently remove the voucher entry from accounting ledgers."
          itemName={expenseToDelete ? `${expenseToDelete.expense_no} - Rs. ${expenseToDelete.amount}` : undefined}
        />
      </div>
    </RequirePermission>
  )
}
