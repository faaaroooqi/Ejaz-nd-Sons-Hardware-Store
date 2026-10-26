import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Settings = Database['public']['Tables']['settings']['Row']

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await (supabase as any)
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    // Return default settings if query fails
    return {
      id: 1,
      business_name: 'Ejaz and sons hardware store',
      business_tagline: 'Quality Hardware & Wholesale Tools',
      business_address: 'Main Wholesale Market, Pakistan',
      business_city: 'Karachi',
      business_phone: '+92 300 0000000',
      business_phone_alt: null,
      business_email: 'info@ejazandsons.pk',
      business_ntn: 'NTN-1234567-8',
      logo_path: null,
      currency_code: 'PKR',
      currency_symbol: 'Rs.',
      number_grouping: 'lakh',
      date_format: 'DD/MM/YYYY',
      timezone: 'Asia/Karachi',
      fiscal_year_start_month: 7,
      allow_negative_stock: false,
      credit_limit_mode: 'warn',
      books_locked_until: null,
      backdate_limit_days: 7,
      invoice_terms: 'Payment due within 15 days. Goods once sold will not be returned without original bill.',
      invoice_footer: 'Thank you for your business! - Ejaz and sons hardware store',
      default_print_format: 'a4',
      show_previous_balance_on_invoice: true,
      updated_at: new Date().toISOString(),
      updated_by: null,
    } as Settings
  }

  return data as Settings
}

export async function updateSettings(payload: Partial<Settings>): Promise<Settings> {
  const { data, error } = await (supabase as any).rpc('admin_update_settings', {
    p_changes: payload,
  })

  if (error) {
    const { data: direct, error: directErr } = await (supabase as any)
      .from('settings')
      .update(payload)
      .eq('id', 1)
      .select()
      .single()

    if (directErr) throw directErr
    return direct as Settings
  }

  return data as Settings
}
