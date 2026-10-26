import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Settings as SettingsIcon, Building, ShieldCheck, Printer, Save } from 'lucide-react'
import { useSettings, useUpdateSettings } from '../queries'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PageHeader } from '@/components/common/PageHeader'
import { PERMISSIONS } from '@/lib/permissions'

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (settings) {
      reset(settings)
    }
  }, [settings, reset])

  const onSubmit = async (values: any) => {
    try {
      await updateMutation.mutateAsync(values)
      toast.success('System settings saved successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings')
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading settings...</div>
  }

  return (
    <RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Top Header */}
        <PageHeader
          title="System & Business Settings"
          titleUrdu="سسٹم اور شاپ سیٹنگز"
          description="Configure business profile, invoice terms, period locking, backdate controls, and print settings."
          descriptionUrdu="دکان کا نام، رابطہ، بل پر پرنٹ ہونے والے اصول اور کھاتہ بند کرنے کی تاریخیں"
          icon={SettingsIcon}
          action={
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
            >
              <Save className="h-4 w-4" /> {updateMutation.isPending ? 'Saving...' : 'Save All Settings'}
            </button>
          }
        />

        {/* Section 1: Business Profile */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Building className="h-4 w-4 text-primary" /> Ejaz and sons hardware store Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Business Name</label>
              <input type="text" {...register('business_name')} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tagline / Slogan</label>
              <input type="text" {...register('business_tagline')} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone Number</label>
              <input type="text" {...register('business_phone')} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">NTN Number (Tax Reg)</label>
              <input type="text" {...register('business_ntn')} className="input w-full" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Business Address</label>
              <input type="text" {...register('business_address')} className="input w-full" />
            </div>
          </div>
        </div>

        {/* Section 2: Inventory & Ledger Controls */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="h-4 w-4 text-primary" /> Inventory & Financial Guards
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
              <div>
                <span className="block text-xs font-bold text-foreground">Allow Negative Stock</span>
                <span className="block text-[11px] text-muted-foreground">Allow selling items even when quantity is 0</span>
              </div>
              <input type="checkbox" {...register('allow_negative_stock')} className="h-5 w-5 accent-primary" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Customer Credit Limit Enforcement</label>
              <select {...register('credit_limit_mode')} className="input w-full">
                <option value="warn">Warn Only (Show alert on sale creation)</option>
                <option value="block">Block Sale (Prevent invoice posting)</option>
                <option value="off">Off (Disable credit limit checks)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Books Locked Until Date</label>
              <input type="date" {...register('books_locked_until')} className="input w-full" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Prevents posting or editing documents on or before this date.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Backdate Posting Limit (Days)</label>
              <input type="number" {...register('backdate_limit_days')} className="input w-full" />
            </div>
          </div>
        </div>

        {/* Section 3: Invoice Terms & Formatting */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Printer className="h-4 w-4 text-primary" /> Printable Invoice Terms & Preferences
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice Terms & Conditions</label>
              <textarea rows={3} {...register('invoice_terms')} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice Footer Note</label>
              <input type="text" {...register('invoice_footer')} className="input w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Number Formatting System</label>
                <select {...register('number_grouping')} className="input w-full">
                  <option value="lakh">Pakistani Lakh / Crore (e.g. Rs. 1,50,000)</option>
                  <option value="international">International Standard (e.g. Rs. 150,000)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border self-end">
                <div>
                  <span className="block text-xs font-bold text-foreground">Show Khata Balance on Invoice</span>
                  <span className="block text-[11px] text-muted-foreground">Print customer previous dues on invoice</span>
                </div>
                <input type="checkbox" {...register('show_previous_balance_on_invoice')} className="h-5 w-5 accent-primary" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </RequirePermission>
  )
}
