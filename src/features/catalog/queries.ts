import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchCategories,
  createCategory,
  fetchBrands,
  createBrand,
  fetchUnits,
  fetchProducts,
  createProductWithVariant,
  updateProductWithVariant,
  deleteProduct,
} from './api'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.categories() })
    },
  })
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands(),
    queryFn: fetchBrands,
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
    },
  })
}

export function useUnits() {
  return useQuery({
    queryKey: queryKeys.units,
    queryFn: fetchUnits,
  })
}

export function useProducts(search?: string) {
  return useQuery({
    queryKey: queryKeys.products({ search }),
    queryFn: () => fetchProducts(search),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProductWithVariant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['variants'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: queryKeys.categories() })
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProductWithVariant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['variants'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: queryKeys.categories() })
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['variants'] })
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
    },
  })
}

