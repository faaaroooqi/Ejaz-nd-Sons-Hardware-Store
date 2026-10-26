import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchExpenses, fetchExpenseCategories, fetchPaymentAccounts, createExpense, createExpenseCategory, updateExpense, deleteExpense } from './api'
import { QUERY_KEYS } from '@/lib/query-keys'

export function useExpenses(search?: string) {
  return useQuery({
    queryKey: ['expenses', search],
    queryFn: () => fetchExpenses(search),
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  })
}

export function usePaymentAccounts() {
  return useQuery({
    queryKey: ['payment-accounts'],
    queryFn: fetchPaymentAccounts,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
    },
  })
}

