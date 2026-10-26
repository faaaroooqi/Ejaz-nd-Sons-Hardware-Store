import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { X, Plus, Receipt, Calendar, CreditCard, Building, User, FileText, CheckCircle2 } from 'lucide-react'
import { useCreateExpense, useUpdateExpense, useExpenseCategories, usePaymentAccounts, useCreateExpenseCategory } from '../queries'
import type { Expense } from '../api'

const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Date is required'),
  category_id: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bank', 'online', 'cheque', 'other']),
  payment_account_id: z.string().min(1, 'Payment account is required'),
  paid_to: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expenseToEdit?: Expense | null
}

export function ExpenseModal({ isOpen, onClose, expenseToEdit }: ExpenseModalProps) {
  const { data: categories = [] } = useExpenseCategories()
  const { data: accounts = [] } = usePaymentAccounts()
  const createExpenseMutation = useCreateExpense()
  const updateExpenseMutation = useUpdateExpense()
  const createCategoryMutation = useCreateExpenseCategory()

  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const isEditing = Boolean(expenseToEdit)
  const todayStr = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: todayStr,
      payment_method: 'cash',
      description: '',
      amount: undefined,
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setValue('expense_date', expenseToEdit.expense_date)
        setValue('category_id', expenseToEdit.category_id)
        setValue('amount', Number(expenseToEdit.amount))
        setValue('payment_method', expenseToEdit.payment_method as any)
        setValue('payment_account_id', expenseToEdit.payment_account_id)
        setValue('paid_to', expenseToEdit.paid_to || '')
        setValue('description', expenseToEdit.description)
      } else {
        reset({
          expense_date: todayStr,
          payment_method: 'cash',
          category_id: categories[0]?.id || '',
          payment_account_id: accounts[0]?.id || '',
          description: '',
          amount: undefined,
          paid_to: '',
        })
      }
      setShowNewCat(false)
      setNewCatName('')
    }
  }, [isOpen, expenseToEdit, setValue, reset, todayStr, categories, accounts])

  if (!isOpen) return null

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      if (isEditing && expenseToEdit) {
        await updateExpenseMutation.mutateAsync({
          id: expenseToEdit.id,
          expense_date: values.expense_date,
          category_id: values.category_id,
          amount: values.amount,
          payment_method: values.payment_method,
          payment_account_id: values.payment_account_id,
          paid_to: values.paid_to?.trim() || undefined,
          description: values.description.trim(),
        })
        toast.success(`Expense ${expenseToEdit.expense_no} updated successfully!`)
      } else {
        await createExpenseMutation.mutateAsync({
          expense_date: values.expense_date,
          category_id: values.category_id,
          amount: values.amount,
          payment_method: values.payment_method,
          payment_account_id: values.payment_account_id,
          paid_to: values.paid_to?.trim() || undefined,
          description: values.description.trim(),
        })
        toast.success('Expense recorded successfully!')
      }
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to process expense')
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    try {
      const created = await createCategoryMutation.mutateAsync({ name: newCatName.trim() })
      toast.success(`Category "${created.name}" created!`)
      setValue('category_id', created.id)
      setNewCatName('')
      setShowNewCat(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to add category')
    }
  }

  const isPending = createExpenseMutation.isPending || updateExpenseMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {isEditing ? `Edit Expense Entry (${expenseToEdit?.expense_no})` : 'Record New Expense'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? 'Modify particulars, amount, or recipient' : 'Log shop operational expenses, utility bills, or staff wages'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          {/* Row 1: Amount & Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Amount (PKR) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                  Rs.
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5,000"
                  {...register('amount')}
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-10 pr-4 text-sm font-numeric font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-[11px] font-medium text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Expense Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                {...register('expense_date')}
                className="w-full rounded-xl border border-input bg-background/50 py-2.5 px-3.5 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
              {errors.expense_date && (
                <p className="mt-1 text-[11px] font-medium text-destructive">{errors.expense_date.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Category with Quick-Add */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">
                Expense Category <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewCat(!showNewCat)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>{showNewCat ? 'Cancel' : 'New Category'}</span>
              </button>
            </div>

            {showNewCat && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 animate-in fade-in zoom-in-95">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Generator Fuel / Refreshments)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-card py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={createCategoryMutation.isPending || !newCatName.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  {createCategoryMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}

            <select
              required
              {...register('category_id')}
              className="w-full rounded-xl border border-input bg-background/50 py-2.5 px-3.5 text-xs font-medium text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">-- Select Expense Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-[11px] font-medium text-destructive">{errors.category_id.message}</p>
            )}
          </div>

          {/* Row 3: Payment Method & Payment Account */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Payment Method <span className="text-destructive">*</span>
              </label>
              <select
                {...register('payment_method')}
                className="w-full rounded-xl border border-input bg-background/50 py-2.5 px-3.5 text-xs font-medium text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="cash">Cash in Hand</option>
                <option value="bank">Bank Transfer</option>
                <option value="online">Online / Mobile Wallet</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                Payment Account <span className="text-destructive">*</span>
              </label>
              <select
                required
                {...register('payment_account_id')}
                className="w-full rounded-xl border border-input bg-background/50 py-2.5 px-3.5 text-xs font-medium text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">-- Select Account --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.account_type})
                  </option>
                ))}
              </select>
              {errors.payment_account_id && (
                <p className="mt-1 text-[11px] font-medium text-destructive">{errors.payment_account_id.message}</p>
              )}
            </div>
          </div>

          {/* Row 4: Paid To */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Paid To (Recipient / Beneficiary)
            </label>
            <input
              type="text"
              placeholder="e.g. K-Electric / Shop Landlord / Staff Member / Transport Company"
              {...register('paid_to')}
              className="w-full rounded-xl border border-input bg-background/50 py-2.5 px-3.5 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Row 5: Description / Particulars */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Particulars / Description <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Provide bill reference, invoice details or justification..."
              {...register('description')}
              className="w-full rounded-xl border border-input bg-background/50 py-2 px-3.5 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {errors.description && (
              <p className="mt-1 text-[11px] font-medium text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isPending ? 'Processing...' : isEditing ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
