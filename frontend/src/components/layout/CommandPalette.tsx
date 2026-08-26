import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAIInterpret, type AIResult } from '../../api/ai'

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<AIResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mut = useAIInterpret()

  // Focus input when opened
  useEffect(() => {
    if (open) {
      // focus next tick after mount
      const id = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(id)
    }
  }, [open])

  // Esc closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || mut.isPending) return
    setErrorMsg(null)
    mut.mutate(trimmed, {
      onSuccess: (res) => {
        setResult(res)
        setErrorMsg(null)
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          setErrorMsg(err.detail || 'Erro ao interpretar comando.')
        } else if (err instanceof Error) {
          setErrorMsg(err.message)
        } else {
          setErrorMsg('Erro de rede. Tente novamente.')
        }
      },
    })
  }

  const handleRetry = () => {
    handleSubmit()
  }

  if (!open) return null

  const created = result?.created_items ?? []
  const edited = result?.updated_items ?? result?.edited_items ?? []
  const trashedCount =
    result?.deleted_item_ids?.length ?? result?.trashed_items?.length ?? 0
  const hasSuccessItems = created.length > 0 || edited.length > 0

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Assistente IA"
    >
      <div
        className="bg-white rounded-xl p-6 max-w-lg w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Assistente IA</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600 p-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Descreva o que quer criar, editar ou excluir em linguagem natural…"
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            autoComplete="off"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">
              Atalho: Ctrl+K / Cmd+K · Esc fecha
            </span>
            <button
              type="submit"
              disabled={!text.trim() || mut.isPending}
              className="ml-auto inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-primary text-white hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary transition"
            >
              {mut.isPending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>

        {/* Loading */}
        {mut.isPending && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin" aria-hidden />
            interpretando…
          </div>
        )}

        {/* Network / Gemini error */}
        {errorMsg && !mut.isPending && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
            <p className="text-sm text-red-700">{errorMsg}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800 min-h-[44px]"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Result feedback */}
        {result && !mut.isPending && !errorMsg && (
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-lg px-3 py-3 text-sm ${
                result.understood
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
            >
              {result.message}
              {!result.understood && (
                <p className="mt-1 text-xs opacity-80">
                  Mantivemos seu texto — refine e envie novamente.
                </p>
              )}
            </div>

            {result.understood && hasSuccessItems && (
              <ul className="space-y-1">
                {created.map((it) => (
                  <li key={`c-${it.id}`}>
                    <Link
                      to={`/itens/${it.id}`}
                      onClick={onClose}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="truncate font-medium text-gray-900">{it.title}</span>
                      <span className="ml-2 text-xs text-primary shrink-0">criado →</span>
                    </Link>
                  </li>
                ))}
                {edited.map((it) => (
                  <li key={`e-${it.id}`}>
                    <Link
                      to={`/itens/${it.id}`}
                      onClick={onClose}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="truncate font-medium text-gray-900">{it.title}</span>
                      <span className="ml-2 text-xs text-gray-500 shrink-0">atualizado →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {result.understood && trashedCount > 0 && (
              <p className="text-sm text-gray-600">
                {trashedCount} item(ns) movido(s) para a lixeira.{' '}
                <Link to="/lixeira" onClick={onClose} className="text-primary underline">
                  Ver lixeira
                </Link>
              </p>
            )}

            {result.understood && !hasSuccessItems && trashedCount === 0 && (
              <p className="text-xs text-gray-500">
                Nenhum item listado — confira a mensagem acima.
              </p>
            )}
          </div>
        )}

        {!result && !mut.isPending && !errorMsg && (
          <p className="mt-4 text-xs text-gray-400">
            Ex.: “Prova de Cálculo 3 dia 27/08” ou “mude a prova de Cálculo para 28/08”
          </p>
        )}
      </div>
    </div>
  )
}
