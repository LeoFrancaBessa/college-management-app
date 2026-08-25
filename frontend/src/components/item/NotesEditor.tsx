import { useEffect, useState } from 'react'
import { useUpdateItem } from '../../api/items'
import { ApiError } from '../../api/client'
import type { ItemFeatures } from '../../api/types'
import { Button } from '../ui/Button'

export function NotesEditor({ itemId, features, value }: { itemId: number; features: ItemFeatures; value?: string | null }) {
  const [text, setText] = useState(value ?? '')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const update = useUpdateItem(itemId)

  useEffect(() => {
    setText(value ?? '')
  }, [value])

  const handleSave = async () => {
    setError('')
    setFieldErrors({})
    const newFeatures = { ...features, notes: text }
    try {
      await update.mutateAsync({ features: newFeatures } as any)
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.detail)
        if (e.fields) setFieldErrors(e.fields)
      } else {
        setError(e?.detail ?? e?.message ?? 'Erro ao salvar anotações')
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Editar' : 'Preview'}
        </Button>
      </div>
      {showPreview ? (
        <pre className="whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 min-h-[100px]">
          {text || '(vazio)'}
        </pre>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anotações em markdown..."
          rows={6}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      )}
      {fieldErrors.notes && <p className="text-xs text-red-600">{fieldErrors.notes}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!showPreview && (
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? 'Salvando...' : 'Salvar anotações'}
        </Button>
      )}
    </div>
  )
}
