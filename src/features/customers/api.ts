import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerBalance = Database['public']['Tables']['customer_balances']['Row']

export interface CustomerWithBalance extends Customer {
  balance?: CustomerBalance
}

export interface CustomerStatementRow {
  entry_id: string
  entry_date: string
  entry_type: string
  description: string
  reference_no: string
  debit: number
  credit: number
  running_balance: number
  sale_id?: string | null
  invoice_no?: string | null
  bill_number?: number | null
  bilty_number?: string | null
  laborer_name?: string | null
  sale_status?: string | null
  bill_total?: number | null
}

export interface CustomerStatement {
  customer: Customer
  from?: string | null
  to?: string | null
  search?: string | null
  opening_balance: number
  total_debit: number
  total_credit: number
  closing_balance: number
  current_balance: number
  cached_balance: number
  balance_matches_cache: boolean
  rows: CustomerStatementRow[]
}

export async function fetchCustomers(search?: string): Promise<CustomerWithBalance[]> {
  let query = (supabase as any)
    .from('customers')
    .select(`
      *,
      balance:customer_balances(*)
    `)
    .order('name')

  if (search && search.trim().length > 0) {
    query = query.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,code.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((c: any) => ({
    ...c,
    balance: Array.isArray(c.balance) ? c.balance[0] : c.balance,
  })) as CustomerWithBalance[]
}

export async function fetchCustomerStatement(
  customerId: string,
  from?: string | null,
  to?: string | null,
  search?: string | null
): Promise<CustomerStatement> {
  const { data, error } = await (supabase as any).rpc('get_customer_statement', {
    p_customer_id: customerId,
    p_from: from || null,
    p_to: to || null,
    p_search: search || null,
  })
  if (error) throw error
  return data as CustomerStatement
}

export async function createCustomer(payload: {
  name: string
  business_name?: string
  phone: string
  alt_phone?: string
  address?: string
  city?: string
  area?: string
  price_tier?: 'default' | 'wholesale' | 'retail'
  credit_limit?: number
  opening_balance?: number
}): Promise<Customer> {
  const code = `C-${Math.floor(10000 + Math.random() * 90000)}`

  const { data, error } = await (supabase as any)
    .from('customers')
    .insert({
      code,
      name: payload.name.trim(),
      business_name: payload.business_name?.trim() || null,
      phone: payload.phone.trim(),
      alt_phone: payload.alt_phone?.trim() || null,
      address: payload.address?.trim() || null,
      city: payload.city?.trim() || 'Karachi',
      area: payload.area?.trim() || null,
      price_tier: payload.price_tier || 'default',
      credit_limit: payload.credit_limit || 0,
    })
    .select()
    .single()

  if (error) throw error

  if (payload.opening_balance && payload.opening_balance !== 0) {
    const { error: opnErr } = await (supabase as any).rpc('post_customer_opening_balance', {
      p_customer_id: data.id,
      p_amount: payload.opening_balance,
    })
    if (opnErr) {
      console.error('Failed to post opening balance via RPC:', opnErr)
    }
  }

  return data as Customer
}

export async function updateCustomer(
  id: string,
  payload: {
    name?: string
    business_name?: string
    phone?: string
    alt_phone?: string
    address?: string
    city?: string
    area?: string
    price_tier?: 'default' | 'wholesale' | 'retail'
    credit_limit?: number
    is_active?: boolean
  }
): Promise<Customer> {
  const { data, error } = await (supabase as any)
    .from('customers')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.business_name !== undefined ? { business_name: payload.business_name.trim() || null } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone.trim() } : {}),
      ...(payload.alt_phone !== undefined ? { alt_phone: payload.alt_phone.trim() || null } : {}),
      ...(payload.address !== undefined ? { address: payload.address.trim() || null } : {}),
      ...(payload.city !== undefined ? { city: payload.city.trim() || 'Karachi' } : {}),
      ...(payload.area !== undefined ? { area: payload.area.trim() || null } : {}),
      ...(payload.price_tier !== undefined ? { price_tier: payload.price_tier } : {}),
      ...(payload.credit_limit !== undefined ? { credit_limit: payload.credit_limit } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; message: string; action: string }> {
  const { data, error } = await (supabase as any).rpc('delete_customer', { p_customer_id: id })
  if (error) {
    try {
      const { error: directErr } = await (supabase as any).from('customers').delete().eq('id', id)
      if (directErr) {
        const { error: archiveErr } = await (supabase as any)
          .from('customers')
          .update({ is_active: false })
          .eq('id', id)
        if (archiveErr) throw archiveErr
        return { success: true, action: 'archived', message: 'Customer has transactions. Account deactivated/archived.' }
      }
      return { success: true, action: 'deleted', message: 'Customer deleted successfully.' }
    } catch (e: any) {
      throw e
    }
  }
  return data
}
