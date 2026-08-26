import { useEffect, useState } from 'react'
import { useUpdateItem } from '../../api/items'
import { ApiError } from '../../api/client'
import type { ItemFeatures, Grade } from '../../api/types'
import { Button } from '../ui/Button'

export function GradeFields({ itemId, features, value }: { itemId: number; features: ItemFeatures; value?: Grade | null }) {
  const [score, setScore] = useState(value?.score != null ? String(value.score) : '')
  const [maxScore, setMaxScore] = useState(value?.max_score != null ? String(value.max_score) : '10')
  const [weight, setWeight] = useState(value?.weight != null ? String(value.weight) : '1')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const update = useUpdateItem(itemId)

  useEffect(() => {
    setScore(value?.score != null ? String(value.score) : '')
    setMaxScore(value?.max_score != null ? String(value.max_score) : '10')
    setWeight(value?.weight != null ? String(value.weight) : '1')
  }, [value?.score, value?.max_score, value?.weight])

  const handleSave = async () => {
    setError('')
    setFieldErrors({})
    const s = score.trim() === '' ? NaN : Number(score)
    const m = maxScore.trim() === '' ? NaN : Number(maxScore)
    const w = weight.trim() === '' ? NaN : Number(weight)
    if (Number.isNaN(s) || Number.isNaN(m) || Number.isNaN(w)) {
      setError('Preencha nota, nota máxima e peso com números válidos')
      return
    }
    const grade = { score: s, max_score: m, weight: w }
    const newFeatures = { ...features, grade }
    try {
      await update.mutateAsync({ features: newFeatures } as any)
      setError('')
      setFieldErrors({})
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.detail)
        if (e.fields) setFieldErrors(e.fields)
      } else {
        setError(e?.detail ?? e?.message ?? 'Erro ao salvar nota')
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Nota</label>
          <input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="ex: 8,5"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          {fieldErrors.score && <p className="text-xs text-red-600 mt-1">{fieldErrors.score}</p>}
          {fieldErrors['grade.score'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['grade.score']}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Nota máxima</label>
          <input
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="10"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          {fieldErrors.max_score && <p className="text-xs text-red-600 mt-1">{fieldErrors.max_score}</p>}
          {fieldErrors['grade.max_score'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['grade.max_score']}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Peso</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="1"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          {fieldErrors.weight && <p className="text-xs text-red-600 mt-1">{fieldErrors.weight}</p>}
          {fieldErrors['grade.weight'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['grade.weight']}</p>}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleSave} disabled={update.isPending}>
        {update.isPending ? 'Salvando...' : 'Salvar nota'}
      </Button>
    </div>
  )
}
