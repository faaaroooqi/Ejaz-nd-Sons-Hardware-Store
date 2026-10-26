import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type SalesReturn = Database['public']['Tables']['sales_returns']['Row']
export type PurchaseReturn = Database['public']['Tables']['purchase_returns']['Row']

export async function fetchSalesReturns(search?: string): Promise<SalesReturn[]> {
  let query = (supabase as any)
    .from('sales_returns')
    .select(`
      *,
      customer:customers(name, phone)
    `)
    .order('return_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search && search.trim().length > 0) {
    query = query.or(`return_no.ilike.%${search.trim()}%,customer_name_snapshot.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as SalesReturn[]
}

export async function fetchPurchaseReturns(search?: string): Promise<PurchaseReturn[]> {
  let query = (supabase as any)
    .from('purchase_returns')
    .select(`
      *,
      supplier:suppliers(name, company_name)
    `)
    .order('return_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search && search.trim().length > 0) {
    query = query.or(`return_no.ilike.%${search.trim()}%,supplier_name_snapshot.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as PurchaseReturn[]
}

export async function createSalesReturn(payload: {
  sale_id: string
  return_date?: string
  refund_amount?: number
  payment_account_id?: string
  notes?: string
  items: {
    sale_item_id?: string
    variant_id: string
    quantity: number
    rate: number
  }[]
}): Promise<SalesReturn> {
  const { data, error } = await (supabase as any).rpc('post_sales_return', {
    p_payload: payload,
  })

  if (error) {
    const returnNo = `SR-${Math.floor(10000 + Math.random() * 90000)}`
    const today = payload.return_date || new Date().toISOString().split('T')[0]

    // Fetch sale for customer info
    const { data: sale } = await (supabase as any)
      .from('sales')
      .select('customer_id, customer_name_snapshot')
      .eq('id', payload.sale_id)
      .single()

    let subtotal = 0
    for (const item of payload.items) {
      subtotal += item.quantity * item.rate
    }

    const { data: direct, error: directErr } = await (supabase as any)
      .from('sales_returns')
      .insert({
        return_no: returnNo,
        return_date: today,
        sale_id: payload.sale_id,
        customer_id: sale?.customer_id || '00000000-0000-0000-0000-000000000001',
        customer_name_snapshot: sale?.customer_name_snapshot || 'Customer',
        subtotal,
        refund_amount: payload.refund_amount || 0,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (directErr) throw directErr
    return direct as SalesReturn
  }

  return data as SalesReturn
}

export async function createPurchaseReturn(payload: {
  purchase_id: string
  return_date?: string
  refund_amount?: number
  payment_account_id?: string
  notes?: string
  items: {
    purchase_item_id?: string
    variant_id: string
    quantity: number
    unit_cost: number
  }[]
}): Promise<PurchaseReturn> {
  const { data, error } = await (supabase as any).rpc('post_purchase_return', {
    p_payload: payload,
  })

  if (error) {
    const returnNo = `PR-${Math.floor(10000 + Math.random() * 90000)}`
    const today = payload.return_date || new Date().toISOString().split('T')[0]

    const { data: pur } = await (supabase as any)
      .from('purchases')
      .select('supplier_id, supplier_name_snapshot')
      .eq('id', payload.purchase_id)
      .single()

    let subtotal = 0
    for (const item of payload.items) {
      subtotal += item.quantity * item.unit_cost
    }

    const { data: direct, error: directErr } = await (supabase as any)
      .from('purchase_returns')
      .insert({
        return_no: returnNo,
        return_date: today,
        purchase_id: payload.purchase_id,
        supplier_id: pur?.supplier_id,
        supplier_name_snapshot: pur?.supplier_name_snapshot || 'Supplier',
        subtotal,
        refund_amount: payload.refund_amount || 0,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (directErr) throw directErr
    return direct as PurchaseReturn
  }

  return data as PurchaseReturn
}
