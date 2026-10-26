import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPurchases, postPurchaseEntry, updatePurchase, cancelPurchase } from './api'

export function usePurchases(search?: string) {
  return useQuery({
    queryKey: queryKeys.purchases({ search }),
    queryFn: () => fetchPurchases(search),
  })
}

export function usePostPurchaseEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postPurchaseEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier-ledger'] })
    },
  })
}

export function useUpdatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updatePurchase>[1] }) =>
      updatePurchase(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
    },
  })
}

export function useCancelPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelPurchase(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

