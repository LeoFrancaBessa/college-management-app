import { useEffect, useState } from 'react'
import { useUpdateItem } from '../../api/items'
import { ApiError } from '../../api/client'
import type { ItemFeatures, ChecklistItem } from '../../api/types'
import { Button } from '../ui/Button'

export function ChecklistEditor({ itemId, features, value }: { itemId: number; features: ItemFeatures; value?: ChecklistItem[] | null }) {
  const [items, setItems] = useState<ChecklistItem[]>(value ?? [])
  const [newText, setNewText] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const update = useUpdateItem(itemId)

  useEffect(() => {
    setItems(value ?? [])
  }, [JSON.stringify(value)])

  const sync = async (next: ChecklistItem[]) => {
    setError('')
    setFieldErrors({})
    const newFeatures = { ...features, checklist: next }
    try {
      await update.mutateAsync({ features: newFeatures } as any)
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.detail)
        if (e.fields) setFieldErrors(e.fields)
      } else {
        setError(e?.detail ?? e?.message ?? 'Erro ao salvar checklist')
      }
    }
  }

  const handleToggle = async (idx: number) => {
    const next = items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    setItems(next)
    await sync(next)
  }

  const handleRemove = async (idx: number) => {
    const next = items.filter((_, i) => i !== idx)
    setItems(next)
    await sync(next)
  }

  const handleAdd = async () => {
    const t = newText.trim()
    if (!t) {
      setError('Texto é obrigatório')
      return
    }
    if (t.length > 500) {
      setError('Texto deve ter no máximo 500 caracteres')
      return
    }
    const next = [...items, { text: t, done: false }]
    setItems(next)
    setNewText('')
    await sync(next)
  }

  const handleTextChange = (idx: number, text: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, text } : it)))
  }

  const handleTextBlur = async (idx: number) => {
    const t = items[idx]?.text.trim() ?? ''
    if (!t) {
      setError('Texto não pode ser vazio')
      return
    }
    if (t.length > 500) {
      setError('Texto deve ter no máximo 500 caracteres')
      return
    }
    const next = items.map((it, i) => (i === idx ? { ...it, text: t } : it))
    setItems(next)
    await sync(next)
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-gray-500">Nenhum item — adicione abaixo.</p>}
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => handleToggle(idx)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <input
              value={it.text}
              onChange={(e) => handleTextChange(idx, e.target.value)}
              onBlur={() => handleTextBlur(idx)}
              maxLength={500}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              onClick={() => handleRemove(idx)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-red-600 hover:bg-red-50 rounded-lg px-2"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Novo item (1..500)"
          maxLength={500}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <Button onClick={handleAdd} disabled={update.isPending}>
          Adicionar
        </Button>
      </div>
      {fieldErrors.text && <p className="text-xs text-red-600">{fieldErrors.text}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
