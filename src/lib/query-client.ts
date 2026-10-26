import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 or 403 permission errors
        if (typeof error === 'object' && error !== null) {
          const err = error as { code?: string }
          if (err.code === 'PERMISSION_DENIED' || err.code === '42501') return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
