import React, { useState, useEffect } from 'react'
import { X, Building2, Pencil, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateSupplier, useUpdateSupplier } from '../queries'
import type { Supplier } from '../api'

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  supplierToEdit?: Supplier | null
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, onClose, supplierToEdit }) => {
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [ntn, setNtn] = useState('')
  const [city, setCity] = useState('Karachi')
  const [address, setAddress] = useState('')
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0)
  const [isActive, setIsActive] = useState(true)

  const isEditing = Boolean(supplierToEdit)

  useEffect(() => {
    if (isOpen) {
      if (supplierToEdit) {
        setName(supplierToEdit.name || '')
        setCompanyName(supplierToEdit.company_name || '')
        setPhone(supplierToEdit.phone || '')
        setAltPhone(supplierToEdit.alt_phone || '')
        setNtn(supplierToEdit.ntn || '')
        setCity(supplierToEdit.city || 'Karachi')
        setAddress(supplierToEdit.address || '')
        setIsActive(supplierToEdit.is_active ?? true)
      } else {
        setName('')
        setCompanyName('')
        setPhone('')
        setAltPhone('')
        setNtn('')
        setCity('Karachi')
        setAddress('')
        setOpeningBalance(0)
        setIsActive(true)
      }
    }
  }, [isOpen, supplierToEdit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast.error('Supplier Name and Phone number are required.')
      return
    }

    try {
      if (isEditing && supplierToEdit) {
        await updateSupplier.mutateAsync({
          id: supplierToEdit.id,
          payload: {
            name: name.trim(),
            company_name: companyName.trim() || undefined,
            phone: phone.trim(),
            alt_phone: altPhone.trim() || undefined,
            ntn: ntn.trim() || undefined,
            address: address.trim() || undefined,
            city: city.trim() || 'Karachi',
            is_active: isActive,
          },
        })
        toast.success(`Supplier "${name}" updated successfully!`)
      } else {
        await createSupplier.mutateAsync({
          name: name.trim(),
          company_name: companyName.trim() || undefined,
          phone: phone.trim(),
          alt_phone: altPhone.trim() || undefined,
          ntn: ntn.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || 'Karachi',
          opening_balance: Number(openingBalance) || 0,
        })
        toast.success(`Supplier "${name}" added successfully!`)
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save supplier'
      toast.error(msg)
    }
  }

  const isPending = createSupplier.isPending || updateSupplier.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {isEditing ? <Pencil className="h-4 w-4" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? `Edit Supplier (${supplierToEdit?.code})` : 'Add Supplier / Vendor'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? 'Update vendor company information and contact details' : 'Register manufacturer or distributor for purchases and Khata'}
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
              <label className="block text-xs font-semibold text-foreground">Contact Person / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Mehmood"
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
                placeholder="e.g. 0321-9876543"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Alt Phone</label>
              <input
                type="text"
                placeholder="e.g. 0300-1122334"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Company / Mill Name</label>
              <input
                type="text"
                placeholder="e.g. Master Pipe Industries"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">NTN (Tax Number)</label>
              <input
                type="text"
                placeholder="e.g. 1234567-8"
                value={ntn}
                onChange={(e) => setNtn(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">City</label>
              <input
                type="text"
                placeholder="e.g. Lahore / Karachi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">Address / Godown</label>
            <input
              type="text"
              placeholder="e.g. Plot 45, Sector 12, Industrial Area"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-foreground">Opening Payable Balance (Rs.)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0 (Positive = We owe supplier)"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs font-numeric font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Positive amount creates initial Payable (Dena) credit balance.</p>
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
                <span>Active Supplier (uncheck to disable/archive)</span>
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
              <span>{isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
