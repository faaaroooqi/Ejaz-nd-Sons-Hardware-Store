import React, { useState, useEffect } from 'react'
import { X, UserPlus, Pencil, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateCustomer, useUpdateCustomer } from '../queries'
import type { Customer } from '../api'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customerToEdit?: Customer | null
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customerToEdit }) => {
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [city, setCity] = useState('Karachi')
  const [area, setArea] = useState('')
  const [priceTier, setPriceTier] = useState<'default' | 'wholesale' | 'retail'>('default')
  const [creditLimit, setCreditLimit] = useState<number | ''>(50000)
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0)
  const [isActive, setIsActive] = useState(true)

  const isEditing = Boolean(customerToEdit)

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setName(customerToEdit.name || '')
        setBusinessName(customerToEdit.business_name || '')
        setPhone(customerToEdit.phone || '')
        setAltPhone(customerToEdit.alt_phone || '')
        setCity(customerToEdit.city || 'Karachi')
        setArea(customerToEdit.area || '')
        setPriceTier((customerToEdit.price_tier as any) || 'default')
        setCreditLimit(Number(customerToEdit.credit_limit) || 0)
        setIsActive(customerToEdit.is_active ?? true)
      } else {
        setName('')
        setBusinessName('')
        setPhone('')
        setAltPhone('')
        setCity('Karachi')
        setArea('')
        setPriceTier('default')
        setCreditLimit(50000)
        setOpeningBalance(0)
        setIsActive(true)
      }
    }
  }, [isOpen, customerToEdit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and Phone number are required.')
      return
    }

    try {
      if (isEditing && customerToEdit) {
        await updateCustomer.mutateAsync({
          id: customerToEdit.id,
          payload: {
            name: name.trim(),
            business_name: businessName.trim() || undefined,
            phone: phone.trim(),
            alt_phone: altPhone.trim() || undefined,
            city: city.trim() || 'Karachi',
            area: area.trim() || undefined,
            price_tier: priceTier,
            credit_limit: Number(creditLimit) || 0,
            is_active: isActive,
          },
        })
        toast.success(`Customer "${name}" updated successfully!`)
      } else {
        await createCustomer.mutateAsync({
          name: name.trim(),
          business_name: businessName.trim() || undefined,
          phone: phone.trim(),
          alt_phone: altPhone.trim() || undefined,
          city: city.trim() || 'Karachi',
          area: area.trim() || undefined,
          price_tier: priceTier,
          credit_limit: Number(creditLimit) || 0,
          opening_balance: Number(openingBalance) || 0,
        })
        toast.success(`Customer "${name}" added successfully!`)
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save customer'
      toast.error(msg)
    }
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isEditing ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? `Edit Customer (${customerToEdit?.code})` : 'Add Customer / Party'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? 'Update party contact information, rate tier and credit limit' : 'Register customer for credit sales and Khata ledger'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground">Customer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ahmed Traders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 0300-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Alt Phone (WhatsApp)</label>
              <input
                type="text"
                placeholder="e.g. 0321-7654321"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Business / Shop Name</label>
              <input
                type="text"
                placeholder="e.g. Al-Madina Hardware Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Area / Market</label>
              <input
                type="text"
                placeholder="e.g. Timber Market / Liaquatabad"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">City</label>
              <input
                type="text"
                placeholder="e.g. Karachi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Price Tier</label>
              <select
                value={priceTier}
                onChange={(e) => setPriceTier(e.target.value as 'default' | 'wholesale' | 'retail')}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="default">Default Rate</option>
                <option value="wholesale">Wholesale Rate</option>
                <option value="retail">Retail Rate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Credit Limit (Rs.)</label>
              <input
                type="number"
                step="1000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs font-numeric text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-foreground">Opening Khata Balance (Rs.)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0 (Positive = Customer owes us)"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs font-numeric font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Positive amount creates initial Receivable (Lena) debit balance.</p>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Active Account (uncheck to disable/archive)</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
