import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchStockLevels, fetchStockMovements, postStockAdjustment } from './api'

export function useStockLevels() {
  return useQuery({
    queryKey: queryKeys.stockLevels(),
    queryFn: fetchStockLevels,
  })
}

export function useStockMovements(variantId?: string) {
  return useQuery({
    queryKey: queryKeys.stockMovements({ variantId }),
    queryFn: () => fetchStockMovements(variantId),
  })
}

export function usePostStockAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postStockAdjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
