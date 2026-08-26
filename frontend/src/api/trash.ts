import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Item } from './types'

export function useTrash(p: { course_id?: number } = {}) {
  return useQuery({ queryKey: ['trash', p], queryFn: () => apiFetch<Item[]>(`/api/v1/trash${buildQuery(p as any)}`) })
}

export function useRestore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch<Item>(`/api/v1/trash/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}
