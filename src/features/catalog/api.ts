import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Category = Database['public']['Tables']['categories']['Row']
export type Subcategory = Database['public']['Tables']['subcategories']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Unit = Database['public']['Tables']['units']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductVariant = Database['public']['Tables']['product_variants']['Row'] & {
  stock?: { quantity_on_hand: number } | null
}

export interface ProductWithVariants extends Product {
  category: Category
  subcategory: Subcategory | null
  brand: Brand | null
  unit: Unit
  variants: ProductVariant[]
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await (supabase as any)
    .from('categories')
    .select('*')
    .order('sort_order')
    .order('name')
  if (error) throw error
  return (data || []) as Category[]
}

export async function createCategory(payload: { name: string; description?: string }): Promise<Category> {
  const { data, error } = await (supabase as any)
    .from('categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await (supabase as any)
    .from('brands')
    .select('*')
    .order('name')
  if (error) throw error
  return (data || []) as Brand[]
}

export async function createBrand(payload: { name: string; description?: string }): Promise<Brand> {
  const { data, error } = await (supabase as any)
    .from('brands')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Brand
}

export async function fetchUnits(): Promise<Unit[]> {
  const { data, error } = await (supabase as any)
    .from('units')
    .select('*')
    .order('name')
  if (error) throw error
  return (data || []) as Unit[]
}

export async function fetchProducts(search?: string): Promise<ProductWithVariants[]> {
  let query = (supabase as any)
    .from('products')
    .select(`
      *,
      category:categories(*),
      subcategory:subcategories!products_subcategory_id_fkey(*),
      brand:brands(*),
      unit:units(*),
      variants:product_variants(*, stock:stock_levels(quantity_on_hand))
    `)
    .order('name')

  if (search && search.trim().length > 0) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as ProductWithVariants[]
}

export async function getOrCreateCategory(name: string): Promise<Category> {
  const trimmed = name.trim()
  const { data: existingList, error: fetchErr } = await (supabase as any)
    .from('categories')
    .select('*')
    .ilike('name', trimmed)

  if (!fetchErr && existingList && existingList.length > 0) {
    return existingList[0] as Category
  }

  const { data, error } = await (supabase as any)
    .from('categories')
    .insert({ name: trimmed })
    .select()
    .single()

  if (error) {
    const { data: retry } = await (supabase as any)
      .from('categories')
      .select('*')
      .ilike('name', trimmed)
      .maybeSingle()
    if (retry) return retry as Category
    if (error.code === '42501' || error.status === 403) {
      throw new Error(
        `Permission Denied (403): Cannot create category "${trimmed}". Your account in Supabase currently has the 'Sales' role instead of 'Admin' (requires 'catalog.manage' permission). Please run the admin role fix script in your Supabase SQL editor.`
      )
    }
    throw error
  }
  return data as Category
}

export async function getOrCreateBrand(name: string): Promise<Brand> {
  const trimmed = name.trim()
  const { data: existingList, error: fetchErr } = await (supabase as any)
    .from('brands')
    .select('*')
    .ilike('name', trimmed)

  if (!fetchErr && existingList && existingList.length > 0) {
    return existingList[0] as Brand
  }

  const { data, error } = await (supabase as any)
    .from('brands')
    .insert({ name: trimmed })
    .select()
    .single()

  if (error) {
    const { data: retry } = await (supabase as any)
      .from('brands')
      .select('*')
      .ilike('name', trimmed)
      .maybeSingle()
    if (retry) return retry as Brand
    if (error.code === '42501' || error.status === 403) {
      throw new Error(
        `Permission Denied (403): Cannot create brand "${trimmed}". Your account in Supabase currently has the 'Sales' role instead of 'Admin' (requires 'catalog.manage' permission). Please run the admin role fix script in your Supabase SQL editor.`
      )
    }
    throw error
  }
  return data as Brand
}

export async function createProductWithVariant(payload: {
  name: string
  category_id?: string
  category_name?: string
  subcategory_id?: string | null
  brand_id?: string | null
  brand_name?: string | null
  unit_id: string
  model?: string | null
  description?: string | null
  sku: string
  default_rate: number
  wholesale_rate: number
  retail_rate: number
  min_stock_level: number
}): Promise<void> {
  let categoryId = payload.category_id

  if (payload.category_name && payload.category_name.trim().length > 0) {
    const cat = await getOrCreateCategory(payload.category_name)
    categoryId = cat.id
  }

  if (!categoryId) {
    throw new Error('Category is required.')
  }

  let brandId = payload.brand_id
  if (payload.brand_name && payload.brand_name.trim().length > 0) {
    const brand = await getOrCreateBrand(payload.brand_name)
    brandId = brand.id
  }

  const { data: product, error: prodErr } = await (supabase as any)
    .from('products')
    .insert({
      name: payload.name,
      category_id: categoryId,
      subcategory_id: payload.subcategory_id || null,
      brand_id: brandId || null,
      unit_id: payload.unit_id,
      model: payload.model || null,
      description: payload.description || null,
      has_variants: false,
    })
    .select()
    .single()

  if (prodErr) {
    if (prodErr.code === '42501' || prodErr.status === 403) {
      throw new Error(
        `Permission Denied (403): Cannot create product. Your account in Supabase currently has the 'Sales' role instead of 'Admin' (requires 'catalog.manage' permission). Please run the admin role fix script in your Supabase SQL editor.`
      )
    }
    throw prodErr
  }

  // Normalize and clean SKU
  const cleanSku = (payload.sku || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 30)

  if (cleanSku.length < 3) {
    // Clean up created product if SKU is too short
    await (supabase as any).from('products').delete().eq('id', product.id)
    throw new Error('SKU code must be at least 3 characters long (letters, numbers, hyphens only).')
  }

  const { error: varErr } = await (supabase as any).from('product_variants').insert({
    product_id: product.id,
    sku: cleanSku,
    variant_name: 'Default',
    default_rate: payload.default_rate,
    wholesale_rate: payload.wholesale_rate,
    retail_rate: payload.retail_rate,
    min_stock_level: payload.min_stock_level,
    is_default: true,
  })

  if (varErr) {
    // Rollback orphaned product
    try {
      await (supabase as any).from('products').delete().eq('id', product.id)
    } catch {
      // Ignore rollback failure
    }

    if (varErr.code === '23505') {
      throw new Error(`SKU "${cleanSku}" is already taken by another product. Please choose a unique SKU.`)
    }
    if (varErr.code === '23514') {
      throw new Error(
        `Invalid SKU code "${cleanSku}". SKU must be 3-30 characters using only letters, numbers, hyphens (-) or underscores (_).`
      )
    }
    throw varErr
  }
}

export async function updateProductWithVariant(payload: {
  productId: string
  variantId?: string
  name: string
  category_id?: string
  category_name?: string
  subcategory_id?: string | null
  brand_id?: string | null
  brand_name?: string | null
  unit_id: string
  model?: string | null
  description?: string | null
  sku: string
  default_rate: number
  wholesale_rate: number
  retail_rate: number
  min_stock_level: number
  is_active?: boolean
}): Promise<void> {
  let categoryId = payload.category_id

  if (payload.category_name && payload.category_name.trim().length > 0) {
    const cat = await getOrCreateCategory(payload.category_name)
    categoryId = cat.id
  }

  let brandId = payload.brand_id
  if (payload.brand_name && payload.brand_name.trim().length > 0) {
    const brand = await getOrCreateBrand(payload.brand_name)
    brandId = brand.id
  }

  // 1. Update master product
  const { error: prodErr } = await (supabase as any)
    .from('products')
    .update({
      name: payload.name.trim(),
      ...(categoryId ? { category_id: categoryId } : {}),
      subcategory_id: payload.subcategory_id || null,
      brand_id: brandId || null,
      unit_id: payload.unit_id,
      model: payload.model || null,
      description: payload.description || null,
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.productId)

  if (prodErr) throw prodErr

  // 2. Update default product variant
  const cleanSku = (payload.sku || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 30)

  let variantQuery = (supabase as any).from('product_variants').update({
    sku: cleanSku,
    default_rate: payload.default_rate,
    wholesale_rate: payload.wholesale_rate,
    retail_rate: payload.retail_rate,
    min_stock_level: payload.min_stock_level,
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
    updated_at: new Date().toISOString(),
  })

  if (payload.variantId) {
    variantQuery = variantQuery.eq('id', payload.variantId)
  } else {
    variantQuery = variantQuery.eq('product_id', payload.productId)
  }

  const { error: varErr } = await variantQuery
  if (varErr) throw varErr
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; message: string; action: string }> {
  const { data, error } = await (supabase as any).rpc('delete_product', { p_product_id: productId })
  if (error) {
    try {
      const { error: directErr } = await (supabase as any).from('products').delete().eq('id', productId)
      if (directErr) {
        await (supabase as any).from('products').update({ is_active: false }).eq('id', productId)
        await (supabase as any).from('product_variants').update({ is_active: false }).eq('product_id', productId)
        return { success: true, action: 'archived', message: 'Product has transaction records. Item deactivated/archived.' }
      }
      return { success: true, action: 'deleted', message: 'Product deleted successfully.' }
    } catch (e: any) {
      throw e
    }
  }
  return data
}


