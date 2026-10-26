import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchSales, fetchSaleById, postSaleInvoice, updateSale, cancelSale, type FetchSalesParams } from './api'

export function useSales(params?: string | FetchSalesParams) {
  const queryParams = typeof params === 'string' ? { search: params } : params
  return useQuery({
    queryKey: queryKeys.sales(queryParams as Record<string, unknown>),
    queryFn: () => fetchSales(params),
  })
}

export function useSaleDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.saleDetail(id || ''),
    queryFn: () => (id ? fetchSaleById(id) : null),
    enabled: Boolean(id),
  })
}

export function usePostSaleInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postSaleInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-ledger'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
    },
  })
}

export function useUpdateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateSale>[1] }) =>
      updateSale(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useCancelSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelSale(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-ledger'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
    },
  })
}
