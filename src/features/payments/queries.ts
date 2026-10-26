import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCustomerPayments,
  fetchSupplierPayments,
  postCustomerPayment,
  postSupplierPayment,
  updateCustomerPayment,
  voidCustomerPayment,
  updateSupplierPayment,
  voidSupplierPayment,
} from './api'
import { QUERY_KEYS } from '@/lib/query-keys'

export function useCustomerPayments(search?: string) {
  return useQuery({
    queryKey: ['customer-payments', search],
    queryFn: () => fetchCustomerPayments(search),
  })
}

export function useSupplierPayments(search?: string) {
  return useQuery({
    queryKey: ['supplier-payments', search],
    queryFn: () => fetchSupplierPayments(search),
  })
}

export function useCreateCustomerPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postCustomerPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

export function useCreateSupplierPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postSupplierPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASES })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

export function useUpdateCustomerPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => updateCustomerPayment(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] })
    },
  })
}

export function useVoidCustomerPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => voidCustomerPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

export function useUpdateSupplierPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => updateSupplierPayment(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] })
    },
  })
}

export function useVoidSupplierPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => voidSupplierPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}


