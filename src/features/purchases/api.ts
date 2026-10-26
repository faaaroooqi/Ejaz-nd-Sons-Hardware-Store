import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Purchase = Database['public']['Tables']['purchases']['Row']

export async function fetchPurchases(search?: string): Promise<Purchase[]> {
  let query = (supabase as any)
    .from('purchases')
    .select(`
      *,
      supplier:suppliers(name, company_name)
    `)
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search && search.trim().length > 0) {
    query = query.or(`bill_no.ilike.%${search.trim()}%,supplier_name_snapshot.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Purchase[]
}

export async function postPurchaseEntry(payload: {
  supplier_id: string
  purchase_date?: string
  supplier_invoice_no?: string
  discount_amount?: number
  additional_charges?: number
  freight_charges?: number
  other_charges?: number
  amount_paid?: number
  notes?: string
  items: {
    variant_id: string
    quantity: number
    purchase_rate?: number
    unit_cost?: number
    discount_amount?: number
  }[]
}): Promise<{ id: string; bill_no: string; purchase_no: string; grand_total: number; balance_due: number }> {
  // Map items to match RPC expectations
  const normalizedPayload = {
    ...payload,
    freight_charges: payload.freight_charges ?? payload.additional_charges ?? 0,
    items: payload.items.map((it) => ({
      variant_id: it.variant_id,
      quantity: it.quantity,
      unit_cost: it.unit_cost ?? it.purchase_rate ?? 0,
      discount_amount: it.discount_amount ?? 0,
    })),
  }

  const { data, error } = await (supabase as any).rpc('post_purchase', { p_payload: normalizedPayload })
  if (error) throw error

  return {
    ...data,
    bill_no: data?.bill_no || data?.purchase_no || '',
    purchase_no: data?.bill_no || data?.purchase_no || '',
  }
}

export async function updatePurchase(id: string, payload: { notes?: string }): Promise<void> {
  const { error } = await (supabase as any)
    .from('purchases')
    .update({
      notes: payload.notes,
    })
    .eq('id', id)
  if (error) throw error
}

export async function cancelPurchase(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await (supabase as any).rpc('cancel_purchase', {
    p_purchase_id: id,
    p_reason: reason || 'Cancelled by Admin',
  })
  if (error) {
    const { error: directErr } = await (supabase as any)
      .from('purchases')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || 'Cancelled by Admin',
      })
      .eq('id', id)
    if (directErr) throw directErr
    return { success: true, message: 'Purchase cancelled successfully.' }
  }
  return data
}

