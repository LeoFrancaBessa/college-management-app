import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Item } from './types'

export type AIResult = {
  understood: boolean
  message: string
  created_items?: Item[]
  updated_items?: Item[]
  // aliases tolerados — backend atual usa updated_items/deleted_item_ids,
  // spec/design menciona edited_items/trashed_items
  edited_items?: Item[]
  trashed_items?: Item[]
  deleted_item_ids?: number[]
}

export function useAIInterpret() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => apiFetch<AIResult>('/api/v1/ai/interpret', { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: (res) => {
      if (res.understood) {
        qc.invalidateQueries({ queryKey: ['items'] })
        qc.invalidateQueries({ queryKey: ['schedule'] })
        qc.invalidateQueries({ queryKey: ['homepage'] })
        qc.invalidateQueries({ queryKey: ['trash'] })
      }
    },
  })
}
