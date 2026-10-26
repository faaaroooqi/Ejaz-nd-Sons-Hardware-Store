import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleItem = Database['public']['Tables']['sale_items']['Row']

export interface SaleWithDetails extends Sale {
  customer?: Database['public']['Tables']['customers']['Row'] | null
  items: (SaleItem & {
    variant?: {
      sku: string
      product?: {
        name: string
        code: string
        unit?: { code: string; name: string } | null
      } | null
    } | null
  })[]
}

export interface FetchSalesParams {
  search?: string
  customerId?: string
  from?: string
  to?: string
}

export async function fetchSales(params?: string | FetchSalesParams): Promise<Sale[]> {
  const search = typeof params === 'string' ? params : params?.search
  const customerId = typeof params === 'object' ? params?.customerId : undefined
  const from = typeof params === 'object' ? params?.from : undefined
  const to = typeof params === 'object' ? params?.to : undefined

  if (search || customerId || from || to) {
    const { data, error } = await (supabase as any).rpc('search_sales', {
      p_search: search?.trim() || null,
      p_customer_id: customerId || null,
      p_from: from || null,
      p_to: to || null,
    })
    if (error) throw error
    return (data || []) as Sale[]
  }

  const { data, error } = await (supabase as any)
    .from('sales')
    .select('*')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Sale[]
}

export async function fetchSaleById(id: string): Promise<SaleWithDetails> {
  const { data: sale, error: saleErr } = await (supabase as any)
    .from('sales')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', id)
    .single()
  if (saleErr) throw saleErr

  const { data: items, error: itemsErr } = await (supabase as any)
    .from('sale_items')
    .select(`
      *,
      variant:product_variants(
        sku,
        product:products(name, code, unit:units(code, name))
      )
    `)
    .eq('sale_id', id)
  if (itemsErr) throw itemsErr

  return { ...sale, items: items || [] } as SaleWithDetails
}

export async function postSaleInvoice(payload: {
  sale_date?: string
  customer_id?: string | null
  bilty_number?: string | null
  laborer_name?: string | null
  discount_amount?: number
  additional_charges?: number
  amount_paid?: number
  notes?: string
  client_request_id?: string
  items: {
    variant_id: string
    quantity: number
    rate: number
    discount_amount?: number
  }[]
}): Promise<{ id: string; invoice_no: string; bill_number?: number; grand_total: number; balance_due: number }> {
  const { data, error } = await (supabase as any).rpc('post_sale', { p_payload: payload })
  if (error) throw error
  return data
}

export async function updateSale(id: string, payload: { notes?: string }): Promise<void> {
  const { error } = await (supabase as any)
    .from('sales')
    .update({
      notes: payload.notes,
    })
    .eq('id', id)
  if (error) throw error
}

export async function cancelSale(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await (supabase as any).rpc('cancel_sale', {
    p_sale_id: id,
    p_reason: reason || 'Cancelled by Admin',
  })
  if (error) throw error
  return data
}
