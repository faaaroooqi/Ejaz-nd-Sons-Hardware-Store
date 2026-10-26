import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCustomers, fetchCustomerStatement, createCustomer, updateCustomer, deleteCustomer } from './api'

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: queryKeys.customers({ search }),
    queryFn: () => fetchCustomers(search),
  })
}

export function useCustomerStatement(
  customerId: string | null,
  filters?: { from?: string | null; to?: string | null; search?: string | null }
) {
  return useQuery({
    queryKey: ['customer-statement', customerId, filters?.from, filters?.to, filters?.search],
    queryFn: () => (customerId ? fetchCustomerStatement(customerId, filters?.from, filters?.to, filters?.search) : null),
    enabled: Boolean(customerId),
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
    },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCustomer>[1] }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
    },
  })
}
