import { useQuery } from '@tanstack/react-query'
import { fetchFinancialSummary } from './api'

export function useFinancialSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['financial-summary', startDate, endDate],
    queryFn: () => fetchFinancialSummary(startDate, endDate),
  })
}
