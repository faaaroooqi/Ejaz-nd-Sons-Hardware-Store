import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchKhataImports,
  fetchKhataImportDetails,
  postKhataImport,
  undoKhataImport,
  scanKhataPage,
} from './api'
import type { buildPostPayload } from './lib'

export function useKhataImports() {
  return useQuery({
    queryKey: queryKeys.khataImports(),
    queryFn: fetchKhataImports,
  })
}

export function useKhataImportDetails(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.khataImportDetail(id) : ['khata-imports', 'none'],
    queryFn: () => (id ? fetchKhataImportDetails(id) : null),
    enabled: Boolean(id),
  })
}

export function useScanKhata() {
  return useMutation({
    mutationFn: scanKhataPage,
  })
}

export function usePostKhataImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      force = false,
    }: {
      payload: ReturnType<typeof buildPostPayload>
      force?: boolean
    }) => postKhataImport(payload, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['khata-imports'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
      qc.invalidateQueries({ queryKey: ['supplier-statement'] })
      qc.invalidateQueries({ queryKey: ['customer-ledger'] })
      qc.invalidateQueries({ queryKey: ['supplier-ledger'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUndoKhataImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      importId,
      reason,
    }: {
      importId: string
      reason?: string
    }) => undoKhataImport(importId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['khata-imports'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['customer-statement'] })
      qc.invalidateQueries({ queryKey: ['supplier-statement'] })
      qc.invalidateQueries({ queryKey: ['customer-ledger'] })
      qc.invalidateQueries({ queryKey: ['supplier-ledger'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
