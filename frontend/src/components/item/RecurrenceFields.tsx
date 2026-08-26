import { useEffect, useState } from 'react'
import { useUpdateItem } from '../../api/items'
import { ApiError } from '../../api/client'
import type { ItemFeatures, Recurrence } from '../../api/types'
import { Button } from '../ui/Button'

const FREQUENCIES: Recurrence['frequency'][] = ['daily', 'weekly', 'monthly', 'yearly']
const FREQUENCY_LABELS: Record<Recurrence['frequency'], string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
}
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function RecurrenceFields({ itemId, features, value }: { itemId: number; features: ItemFeatures; value?: Recurrence | null }) {
  const [frequency, setFrequency] = useState<Recurrence['frequency']>(value?.frequency ?? 'weekly')
  const [interval, setInterval] = useState(value?.interval != null ? String(value.interval) : '1')
  const [weekdays, setWeekdays] = useState<number[]>(value?.weekdays ?? [])
  const [until, setUntil] = useState(value?.until ? value.until.slice(0, 10) : '')
  const [count, setCount] = useState(value?.count != null ? String(value.count) : '')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const update = useUpdateItem(itemId)

  useEffect(() => {
    setFrequency(value?.frequency ?? 'weekly')
    setInterval(value?.interval != null ? String(value.interval) : '1')
    setWeekdays(value?.weekdays ?? [])
    setUntil(value?.until ? value.until.slice(0, 10) : '')
    setCount(value?.count != null ? String(value.count) : '')
  }, [JSON.stringify(value)])

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  const handleSave = async () => {
    setError('')
    setFieldErrors({})
    const iv = Number(interval)
    if (!Number.isFinite(iv) || iv < 1) {
      setError('Intervalo deve ser inteiro ≥ 1')
      return
    }
    const hasUntil = until.trim() !== ''
    const hasCount = count.trim() !== ''
    if (hasUntil && hasCount) {
      setError('Use apenas um: data limite ou quantidade de ocorrências — não ambos')
      return
    }
    if (!hasUntil && !hasCount) {
      setError('Informe a data limite ou a quantidade de ocorrências')
      return
    }
    const rec: any = { frequency, interval: iv }
    if (frequency === 'weekly' && weekdays.length > 0) rec.weekdays = weekdays
    if (hasUntil) rec.until = `${until}T00:00:00.000Z`
    else {
      const c = Number(count)
      if (!Number.isFinite(c) || c < 1) {
        setError('Quantidade deve ser inteira ≥ 1')
        return
      }
      rec.count = c
    }
    const newFeatures = { ...features, recurrence: rec }
    try {
      await update.mutateAsync({ features: newFeatures } as any)
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.detail)
        if (e.fields) setFieldErrors(e.fields)
      } else {
        setError(e?.detail ?? e?.message ?? 'Erro ao salvar recorrência')
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Requer data de entrega preenchida no item — aparecerá no cronograma</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Frequência</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Recurrence['frequency'])}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Intervalo</label>
          <input
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="1"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>
      {frequency === 'weekly' && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Dias da semana (apenas semanal)</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, idx) => (
              <label key={idx} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={weekdays.includes(idx)} onChange={() => toggleWeekday(idx)} /> {label}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Até (data limite)</label>
          <input
            type="date"
            value={until}
            onChange={(e) => {
              setUntil(e.target.value)
              if (e.target.value) setCount('')
            }}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Quantidade (nº de ocorrências)</label>
          <input
            value={count}
            onChange={(e) => {
              setCount(e.target.value)
              if (e.target.value) setUntil('')
            }}
            placeholder="ex: 10"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">Informe exatamente um: data limite OU quantidade</p>
      {Object.entries(fieldErrors).map(([k, v]) => (
        <p key={k} className="text-xs text-red-600">
          {k}: {v}
        </p>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleSave} disabled={update.isPending}>
        {update.isPending ? 'Salvando...' : 'Salvar recorrência'}
      </Button>
    </div>
  )
}
