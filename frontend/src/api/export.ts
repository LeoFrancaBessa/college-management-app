import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BASE, apiFetch } from './client'

export async function doExport() {
  const res = await fetch(`${BASE}/api/v1/export`, { credentials: 'include' })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: any) => d.msg).join('; ')
    } catch {
      // ignore parse error, keep HTTP status
    }
    throw new Error(detail)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'college-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function useImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text()
      let payload: unknown
      try {
        payload = JSON.parse(text)
      } catch {
        throw new Error('Arquivo JSON inválido')
      }
      return apiFetch<{ detail: string; imported: Record<string, number> }>('/api/v1/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periods'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['item'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['boards'] })
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['homepage'] })
      qc.invalidateQueries({ queryKey: ['trash'] })
      qc.invalidateQueries({ queryKey: ['itemTypes'] })
    },
  })
}
