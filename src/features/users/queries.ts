import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, updateUserProfile } from './api'

export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}
