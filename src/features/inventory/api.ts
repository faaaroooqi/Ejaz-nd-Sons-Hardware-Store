import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type StockLevel = Database['public']['Tables']['stock_levels']['Row']
export type StockMovement = Database['public']['Tables']['stock_movements']['Row']

export interface StockLevelWithVariant extends StockLevel {
  variant: Database['public']['Tables']['product_variants']['Row'] & {
    product: Database['public']['Tables']['products']['Row'] & {
      unit: Database['public']['Tables']['units']['Row']
      category: Database['public']['Tables']['categories']['Row']
    }
  }
}

export async function fetchStockLevels(): Promise<StockLevelWithVariant[]> {
  const { data, error } = await (supabase as any)
    .from('stock_levels')
    .select(`
      *,
      variant:product_variants(
        *,
        product:products(
          *,
          unit:units(*),
          category:categories(*)
        )
      )
    `)
    .order('last_movement_at', { ascending: false })

  if (error) throw error
  return (data || []) as StockLevelWithVariant[]
}

export async function fetchStockMovements(variantId?: string): Promise<StockMovement[]> {
  let query = (supabase as any)
    .from('stock_movements')
    .select(`
      *,
      variant:product_variants(sku, variant_name, product:products(name))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (variantId) {
    query = query.eq('variant_id', variantId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as StockMovement[]
}

export async function postStockAdjustment(payload: {
  reason: 'count_correction' | 'damage' | 'loss_theft' | 'found' | 'internal_use' | 'other'
  notes?: string
  adjustment_date?: string
  items: {
    variant_id: string
    qty_change: number
    counted_qty?: number
  }[]
}): Promise<{ id: string; adjustment_no: string; adjustment_date: string; reason: string }> {
  const { data, error } = await (supabase as any).rpc('post_stock_adjustment', { p_payload: payload })
  if (error) throw error
  return data
}
