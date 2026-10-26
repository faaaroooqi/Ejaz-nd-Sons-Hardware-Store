import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type PaymentAccount = Database['public']['Tables']['payment_accounts']['Row']

export async function fetchExpenses(search?: string): Promise<Expense[]> {
  let query = (supabase as any)
    .from('expenses')
    .select(`
      *,
      category:expense_categories(name),
      account:payment_accounts(name)
    `)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search && search.trim().length > 0) {
    query = query.or(`expense_no.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,paid_to.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Expense[]
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await (supabase as any)
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data || []) as ExpenseCategory[]
}

export async function fetchPaymentAccounts(): Promise<PaymentAccount[]> {
  const { data, error } = await (supabase as any)
    .from('payment_accounts')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data || []) as PaymentAccount[]
}

export async function createExpense(payload: {
  expense_date: string
  category_id: string
  amount: number
  payment_method: string
  payment_account_id: string
  paid_to?: string
  description: string
}): Promise<Expense> {
  const { data, error } = await (supabase as any).rpc('post_expense', {
    p_payload: payload,
  })

  if (error) {
    // Fallback if RPC isn't deployed yet on target DB instance
    const expenseNo = `EXP-${Math.floor(10000 + Math.random() * 90000)}`
    const { data: direct, error: directErr } = await (supabase as any)
      .from('expenses')
      .insert({
        expense_no: expenseNo,
        expense_date: payload.expense_date,
        category_id: payload.category_id,
        amount: payload.amount,
        payment_method: payload.payment_method,
        payment_account_id: payload.payment_account_id,
        paid_to: payload.paid_to || null,
        description: payload.description,
      })
      .select()
      .single()

    if (directErr) throw directErr
    return direct as Expense
  }

  return data as Expense
}

export async function createExpenseCategory(payload: { name: string; description?: string }): Promise<ExpenseCategory> {
  const { data, error } = await (supabase as any)
    .from('expense_categories')
    .insert({
      name: payload.name,
      description: payload.description || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ExpenseCategory
}

export async function updateExpense(payload: {
  id: string
  expense_date?: string
  category_id?: string
  amount?: number
  payment_method?: string
  payment_account_id?: string
  paid_to?: string
  description?: string
}): Promise<void> {
  const { error } = await (supabase as any).rpc('update_expense', { p_payload: payload })
  if (error) {
    const { error: directErr } = await (supabase as any)
      .from('expenses')
      .update({
        expense_date: payload.expense_date,
        category_id: payload.category_id,
        amount: payload.amount,
        payment_method: payload.payment_method,
        payment_account_id: payload.payment_account_id,
        paid_to: payload.paid_to || null,
        description: payload.description,
      })
      .eq('id', payload.id)
    if (directErr) throw directErr
  }
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await (supabase as any).rpc('delete_expense', { p_expense_id: id })
  if (error) {
    const { error: directErr } = await (supabase as any).from('expenses').delete().eq('id', id)
    if (directErr) throw directErr
  }
}

