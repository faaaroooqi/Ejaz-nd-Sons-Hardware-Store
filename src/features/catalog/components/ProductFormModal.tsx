import React, { useState, useEffect, useMemo } from 'react'
import { X, PackagePlus, Pencil, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCategories, useBrands, useUnits, useCreateProduct, useUpdateProduct } from '../queries'
import { SuggestiveInput } from '@/components/common/SuggestiveInput'
import { STORAGE_KEYS, getLearnedSuggestions, saveLearnedSuggestion } from '@/lib/suggestion-storage'
import type { ProductWithVariants } from '../api'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  productToEdit?: ProductWithVariants | null
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { data: categories = [] } = useCategories()
  const { data: brands = [] } = useBrands()
  const { data: units = [] } = useUnits()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [unitId, setUnitId] = useState('')
  const [model, setModel] = useState('')
  const [defaultRate, setDefaultRate] = useState<number | ''>(0)
  const [wholesaleRate, setWholesaleRate] = useState<number | ''>(0)
  const [retailRate, setRetailRate] = useState<number | ''>(0)
  const [minStockLevel, setMinStockLevel] = useState<number | ''>(5)

  const isEditing = Boolean(productToEdit)
  const defaultVariant = productToEdit ? (productToEdit.variants.find((v) => v.is_default) || productToEdit.variants[0]) : null

  // Learned history states
  const [learnedCategories, setLearnedCategories] = useState<string[]>([])
  const [learnedBrands, setLearnedBrands] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setLearnedCategories(getLearnedSuggestions(STORAGE_KEYS.CATEGORIES))
      setLearnedBrands(getLearnedSuggestions(STORAGE_KEYS.BRANDS))

      if (productToEdit) {
        setName(productToEdit.name || '')
        setCategoryName(productToEdit.category?.name || '')
        setBrandName(productToEdit.brand?.name || '')
        setUnitId(productToEdit.unit_id || '')
        setModel(productToEdit.model || '')
        const v = productToEdit.variants.find((x) => x.is_default) || productToEdit.variants[0]
        setSku(v?.sku || '')
        setDefaultRate(v ? Number(v.default_rate) : 0)
        setWholesaleRate(v ? Number(v.wholesale_rate) : 0)
        setRetailRate(v ? Number(v.retail_rate) : 0)
        setMinStockLevel(v ? Number(v.min_stock_level) : 5)
      } else {
        resetForm()
      }
    }
  }, [isOpen, productToEdit])

  // Combine DB entries with learned user entries
  const categorySuggestions = useMemo(() => {
    const dbNames = categories.map((c) => c.name)
    return Array.from(new Set([...dbNames, ...learnedCategories]))
  }, [categories, learnedCategories])

  const brandSuggestions = useMemo(() => {
    const dbNames = brands.map((b) => b.name)
    return Array.from(new Set([...dbNames, ...learnedBrands]))
  }, [brands, learnedBrands])

  if (!isOpen) return null

  const resetForm = () => {
    setName('')
    setSku('')
    setCategoryName('')
    setBrandName('')
    setUnitId('')
    setModel('')
    setDefaultRate(0)
    setWholesaleRate(0)
    setRetailRate(0)
    setMinStockLevel(5)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleGenerateSku = () => {
    const raw = (name || categoryName || 'SKU')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4) || 'SKU'
    const rand = Math.floor(100 + Math.random() * 900)
    setSku(`${raw}-${rand}`)
  }

  const handleSkuChange = (val: string) => {
    const sanitized = val
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 30)
    setSku(sanitized)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanSku = sku.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9_-]/g, '')

    if (!name.trim() || !cleanSku || !categoryName.trim() || !unitId) {
      toast.error('Please fill in required fields (Name, SKU, Category, Unit).')
      return
    }

    if (cleanSku.length < 3) {
      toast.error('SKU code must be at least 3 characters (e.g. STN-01).')
      return
    }

    try {
      // Save to local learning storage
      saveLearnedSuggestion(STORAGE_KEYS.CATEGORIES, categoryName)
      if (brandName.trim()) {
        saveLearnedSuggestion(STORAGE_KEYS.BRANDS, brandName)
      }

      if (isEditing && productToEdit) {
        await updateProduct.mutateAsync({
          productId: productToEdit.id,
          variantId: defaultVariant?.id,
          name: name.trim(),
          sku: cleanSku,
          category_name: categoryName.trim(),
          brand_name: brandName.trim() || null,
          unit_id: unitId,
          model: model.trim() || null,
          default_rate: Number(defaultRate) || 0,
          wholesale_rate: Number(wholesaleRate) || Number(defaultRate) || 0,
          retail_rate: Number(retailRate) || Number(defaultRate) || 0,
          min_stock_level: Number(minStockLevel) || 0,
        })
        toast.success(`Product "${name}" updated successfully!`)
      } else {
        await createProduct.mutateAsync({
          name: name.trim(),
          sku: cleanSku,
          category_name: categoryName.trim(),
          brand_name: brandName.trim() || null,
          unit_id: unitId,
          model: model.trim() || null,
          default_rate: Number(defaultRate) || 0,
          wholesale_rate: Number(wholesaleRate) || Number(defaultRate) || 0,
          retail_rate: Number(retailRate) || Number(defaultRate) || 0,
          min_stock_level: Number(minStockLevel) || 0,
        })
        toast.success(`Product "${name}" created successfully with SKU ${cleanSku}`)
      }

      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save product'
      toast.error(msg)
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isEditing ? <Pencil className="h-4 w-4" /> : <PackagePlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? `Edit Product (${productToEdit?.name})` : 'Add Hardware Product / SKU'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? 'Modify master item attributes, category/brand, and selling rates' : 'Create independently trackable item SKU with price rates'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Screwdriver Flat 6 Inch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">SKU / Item Code *</label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Auto Generate
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. STN-FSD-06"
                value={sku}
                onChange={(e) => handleSkuChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs font-mono font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">Only letters, numbers, hyphens (-) and underscores (_).</p>
            </div>

            {/* Smart Category Input with historical learning */}
            <div>
              <SuggestiveInput
                label="Category *"
                required
                placeholder="Type or select category..."
                value={categoryName}
                onChange={setCategoryName}
                suggestions={categorySuggestions}
                helperText="Auto-learns as you type"
              />
            </div>

            {/* Smart Brand Input with historical learning */}
            <div>
              <SuggestiveInput
                label="Brand / Manufacturer"
                placeholder="e.g. Stanley, Bosch (Optional)"
                value={brandName}
                onChange={setBrandName}
                suggestions={brandSuggestions}
                helperText="Auto-learns as you type"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Unit of Measurement *</label>
              <select
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Select Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Model / Specification</label>
              <input
                type="text"
                placeholder="e.g. Heavy Duty, Yellow Grip"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background/50 py-2 px-3 text-xs text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Pricing & Stock Card */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <h4 className="text-xs font-bold text-foreground">Selling Rates & Inventory Control (Rs.)</h4>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground">Default Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-input bg-card py-1.5 px-3 text-xs font-numeric font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground">Wholesale Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={wholesaleRate}
                  onChange={(e) => setWholesaleRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-input bg-card py-1.5 px-3 text-xs font-numeric text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground">Retail Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={retailRate}
                  onChange={(e) => setRetailRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-input bg-card py-1.5 px-3 text-xs font-numeric text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground">Min Stock Alert</label>
                <input
                  type="number"
                  step="1"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-input bg-card py-1.5 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
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
              <span>{isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Product SKU'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
