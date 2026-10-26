import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type CustomerPayment = Database['public']['Tables']['customer_payments']['Row']
export type SupplierPayment = Database['public']['Tables']['supplier_payments']['Row']

export async function fetchCustomerPayments(search?: string): Promise<CustomerPayment[]> {
  let query = (supabase as any)
    .from('customer_payments')
    .select(`
      *,
      customer:customers(name, business_name, phone),
      account:payment_accounts(name)
    `)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search && search.trim().length > 0) {
    query = query.or(`receipt_no.ilike.%${search.trim()}%,notes.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as CustomerPayment[]
}

export async function fetchSupplierPayments(search?: string): Promise<SupplierPayment[]> {
  let query = (supabase as any)
    .from('supplier_payments')
    .select(`
      *,
      supplier:suppliers(name, company_name, phone),
      account:payment_accounts(name)
    `)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search && search.trim().length > 0) {
    query = query.or(`voucher_no.ilike.%${search.trim()}%,notes.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as SupplierPayment[]
}

export async function postCustomerPayment(payload: {
  payment_date?: string
  customer_id: string
  amount: number
  payment_method: string
  payment_account_id: string
  cheque_no?: string
  cheque_date?: string
  bank_name?: string
  sale_id?: string
  notes?: string
}): Promise<CustomerPayment> {
  const { data, error } = await (supabase as any).rpc('post_customer_payment', {
    p_payload: payload,
  })

  if (error) {
    // Fallback direct creation
    const receiptNo = `REC-${Math.floor(10000 + Math.random() * 90000)}`
    const today = payload.payment_date || new Date().toISOString().split('T')[0]

    const { data: direct, error: directErr } = await (supabase as any)
      .from('customer_payments')
      .insert({
        receipt_no: receiptNo,
        payment_date: today,
        customer_id: payload.customer_id,
        direction: 'in',
        amount: payload.amount,
        payment_method: payload.payment_method,
        payment_account_id: payload.payment_account_id,
        cheque_no: payload.cheque_no || null,
        cheque_date: payload.cheque_date || null,
        bank_name: payload.bank_name || null,
        sale_id: payload.sale_id || null,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (directErr) throw directErr

    // Customer Khata Ledger credit
    await (supabase as any).from('customer_ledger_entries').insert({
      customer_id: payload.customer_id,
      entry_date: today,
      entry_type: 'payment',
      description: `Receipt Voucher #${receiptNo}`,
      reference_no: receiptNo,
      debit: 0,
      credit: payload.amount,
      source_type: 'payment',
      source_id: direct.id,
    })

    return direct as CustomerPayment
  }

  return data as CustomerPayment
}

export async function postSupplierPayment(payload: {
  payment_date?: string
  supplier_id: string
  amount: number
  payment_method: string
  payment_account_id: string
  cheque_no?: string
  cheque_date?: string
  bank_name?: string
  purchase_id?: string
  notes?: string
}): Promise<SupplierPayment> {
  const { data, error } = await (supabase as any).rpc('post_supplier_payment', {
    p_payload: payload,
  })

  if (error) {
    // Fallback direct creation
    const voucherNo = `PAY-${Math.floor(10000 + Math.random() * 90000)}`
    const today = payload.payment_date || new Date().toISOString().split('T')[0]

    const { data: direct, error: directErr } = await (supabase as any)
      .from('supplier_payments')
      .insert({
        voucher_no: voucherNo,
        payment_date: today,
        supplier_id: payload.supplier_id,
        direction: 'out',
        amount: payload.amount,
        payment_method: payload.payment_method,
        payment_account_id: payload.payment_account_id,
        cheque_no: payload.cheque_no || null,
        cheque_date: payload.cheque_date || null,
        bank_name: payload.bank_name || null,
        purchase_id: payload.purchase_id || null,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (directErr) throw directErr

    // Supplier Khata Ledger debit (reduces Dena)
    await (supabase as any).from('supplier_ledger_entries').insert({
      supplier_id: payload.supplier_id,
      entry_date: today,
      entry_type: 'payment',
      description: `Payment Voucher #${voucherNo}`,
      reference_no: voucherNo,
      debit: payload.amount,
      credit: 0,
      source_type: 'supplier_payment',
      source_id: direct.id,
    })

    return direct as SupplierPayment
  }

  return data as SupplierPayment
}

export async function updateCustomerPayment(id: string, payload: { notes?: string }): Promise<void> {
  const { error } = await (supabase as any).from('customer_payments').update({ notes: payload.notes }).eq('id', id)
  if (error) throw error
}

export async function voidCustomerPayment(id: string, reason?: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('customer_payments')
    .update({
      status: 'cancelled',
      voided_at: new Date().toISOString(),
      void_reason: reason || 'Voided by Admin',
    })
    .eq('id', id)
  if (error) throw error
}

export async function updateSupplierPayment(id: string, payload: { notes?: string }): Promise<void> {
  const { error } = await (supabase as any).from('supplier_payments').update({ notes: payload.notes }).eq('id', id)
  if (error) throw error
}

export async function voidSupplierPayment(id: string, reason?: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('supplier_payments')
    .update({
      status: 'cancelled',
      voided_at: new Date().toISOString(),
      void_reason: reason || 'Voided by Admin',
    })
    .eq('id', id)
  if (error) throw error
}

