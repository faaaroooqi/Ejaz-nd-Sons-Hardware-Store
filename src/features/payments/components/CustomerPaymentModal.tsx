import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { useCustomers } from '@/features/customers/queries'
import { usePaymentAccounts } from '@/features/expenses/queries'
import { useCreateCustomerPayment } from '../queries'

const customerPaymentSchema = z.object({
  payment_date: z.string().min(1, 'Date is required'),
  customer_id: z.string().min(1, 'Customer is required'),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bank', 'online', 'cheque', 'other']),
  payment_account_id: z.string().min(1, 'Payment account is required'),
  cheque_no: z.string().optional(),
  cheque_date: z.string().optional(),
  bank_name: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof customerPaymentSchema>

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultCustomerId?: string
}

export function CustomerPaymentModal({ isOpen, onClose, defaultCustomerId }: Props) {
  const { data: customers = [] } = useCustomers()
  const { data: accounts = [] } = usePaymentAccounts()
  const createPaymentMutation = useCreateCustomerPayment()

  const todayStr = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(customerPaymentSchema),
    defaultValues: {
      payment_date: todayStr,
      customer_id: defaultCustomerId || '',
      payment_method: 'cash',
    },
  })

  const selectedMethod = watch('payment_method')

  if (!isOpen) return null

  const onSubmit = async (values: FormValues) => {
    try {
      await createPaymentMutation.mutateAsync({
        payment_date: values.payment_date,
        customer_id: values.customer_id,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_account_id: values.payment_account_id,
        cheque_no: values.cheque_no,
        cheque_date: values.cheque_date,
        bank_name: values.bank_name,
        notes: values.notes,
      })
      toast.success('Receipt Voucher recorded & customer khata credited!')
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to record receipt voucher')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <h2 className="text-lg font-bold text-foreground">Customer Receipt Voucher (Payment Received)</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Receipt Date</label>
              <input type="date" {...register('payment_date')} className="input w-full" />
              {errors.payment_date && <p className="text-xs text-destructive mt-1">{errors.payment_date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Customer</label>
              <select {...register('customer_id')} className="input w-full">
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ''}
                  </option>
                ))}
              </select>
              {errors.customer_id && <p className="text-xs text-destructive mt-1">{errors.customer_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount Received (PKR)</label>
              <input type="number" step="any" placeholder="e.g. 15000" {...register('amount')} className="input w-full" />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
              <select {...register('payment_method')} className="input w-full">
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer / Online</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Deposit Account</label>
            <select {...register('payment_account_id')} className="input w-full">
              <option value="">Select Payment Account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.account_type})
                </option>
              ))}
            </select>
            {errors.payment_account_id && <p className="text-xs text-destructive mt-1">{errors.payment_account_id.message}</p>}
          </div>

          {selectedMethod === 'cheque' && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
              <p className="text-xs font-bold text-foreground">Cheque Particulars</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Cheque #</label>
                  <input type="text" placeholder="123456" {...register('cheque_no')} className="input w-full text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Bank Name</label>
                  <input type="text" placeholder="Meezan / HBL" {...register('bank_name')} className="input w-full text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Cheque Date</label>
                  <input type="date" {...register('cheque_date')} className="input w-full text-xs" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Remarks / Notes</label>
            <input type="text" placeholder="Receipt details or voucher notes" {...register('notes')} className="input w-full" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={createPaymentMutation.isPending} className="btn btn-primary">
              {createPaymentMutation.isPending ? 'Saving...' : 'Post Receipt Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
