import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSalesReturns, fetchPurchaseReturns, createSalesReturn, createPurchaseReturn } from './api'
import { QUERY_KEYS } from '@/lib/query-keys'

export function useSalesReturns(search?: string) {
  return useQuery({
    queryKey: ['sales-returns', search],
    queryFn: () => fetchSalesReturns(search),
  })
}

export function usePurchaseReturns(search?: string) {
  return useQuery({
    queryKey: ['purchase-returns', search],
    queryFn: () => fetchPurchaseReturns(search),
  })
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSalesReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-returns'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVENTORY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPurchaseReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASES })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVENTORY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}
