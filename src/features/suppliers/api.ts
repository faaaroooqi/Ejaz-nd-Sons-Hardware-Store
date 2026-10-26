import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type SupplierBalance = Database['public']['Tables']['supplier_balances']['Row']

export interface SupplierWithBalance extends Supplier {
  balance?: SupplierBalance
}

export async function fetchSuppliers(search?: string): Promise<SupplierWithBalance[]> {
  let query = (supabase as any)
    .from('suppliers')
    .select(`
      *,
      balance:supplier_balances(*)
    `)
    .order('name')

  if (search && search.trim().length > 0) {
    query = query.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,company_name.ilike.%${search.trim()}%,code.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((s: any) => ({
    ...s,
    balance: Array.isArray(s.balance) ? s.balance[0] : s.balance,
  })) as SupplierWithBalance[]
}

export async function createSupplier(payload: {
  name: string
  company_name?: string
  phone: string
  alt_phone?: string
  ntn?: string
  address?: string
  city?: string
  opening_balance?: number
}): Promise<Supplier> {
  const code = `S-${Math.floor(10000 + Math.random() * 90000)}`

  const { data, error } = await (supabase as any)
    .from('suppliers')
    .insert({
      code,
      name: payload.name.trim(),
      company_name: payload.company_name?.trim() || null,
      phone: payload.phone.trim(),
      alt_phone: payload.alt_phone?.trim() || null,
      ntn: payload.ntn?.trim() || null,
      address: payload.address?.trim() || null,
      city: payload.city?.trim() || 'Karachi',
    })
    .select()
    .single()

  if (error) throw error

  if (payload.opening_balance && payload.opening_balance > 0) {
    const today = new Date().toISOString().split('T')[0]
    await (supabase as any).from('supplier_ledger_entries').insert({
      supplier_id: data.id,
      entry_date: today,
      entry_type: 'opening_balance',
      description: 'Opening Payable Balance',
      reference_no: 'OPN-BAL',
      debit: 0,
      credit: payload.opening_balance,
      source_type: 'opening',
    })
  }

  return data as Supplier
}

export async function updateSupplier(
  id: string,
  payload: {
    name?: string
    company_name?: string
    phone?: string
    alt_phone?: string
    ntn?: string
    address?: string
    city?: string
    is_active?: boolean
  }
): Promise<Supplier> {
  const { data, error } = await (supabase as any)
    .from('suppliers')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.company_name !== undefined ? { company_name: payload.company_name.trim() || null } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone.trim() } : {}),
      ...(payload.alt_phone !== undefined ? { alt_phone: payload.alt_phone.trim() || null } : {}),
      ...(payload.ntn !== undefined ? { ntn: payload.ntn.trim() || null } : {}),
      ...(payload.address !== undefined ? { address: payload.address.trim() || null } : {}),
      ...(payload.city !== undefined ? { city: payload.city.trim() || 'Karachi' } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Supplier
}

export async function deleteSupplier(id: string): Promise<{ success: boolean; message: string; action: string }> {
  const { data, error } = await (supabase as any).rpc('delete_supplier', { p_supplier_id: id })
  if (error) {
    try {
      const { error: directErr } = await (supabase as any).from('suppliers').delete().eq('id', id)
      if (directErr) {
        const { error: archiveErr } = await (supabase as any)
          .from('suppliers')
          .update({ is_active: false })
          .eq('id', id)
        if (archiveErr) throw archiveErr
        return { success: true, action: 'archived', message: 'Supplier has purchase records. Account deactivated/archived.' }
      }
      return { success: true, action: 'deleted', message: 'Supplier deleted successfully.' }
    } catch (e: any) {
      throw e
    }
  }
  return data
}

