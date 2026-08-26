import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePeriods, useCreatePeriod } from '../api/periods'
import { useCourses } from '../api/courses'
import { useHomepage } from '../api/schedule'
import { doExport, useImport } from '../api/export'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { fmtDate } from '../lib/formatDate'

function HomepageSection() {
  const { data: homepage, isLoading, error } = useHomepage()
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const hoje = useMemo(() => (homepage ?? []).filter((it) => (it.due_date ?? '').slice(0, 10) === todayISO), [homepage, todayISO])
  const proximos = useMemo(() => (homepage ?? []).filter((it) => (it.due_date ?? '').slice(0, 10) !== todayISO), [homepage, todayISO])

  if (isLoading) {
    return (
      <Card>
        <h2 className="font-semibold text-gray-900">Hoje / Próximos 7 dias</h2>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <h2 className="font-semibold text-gray-900">Hoje / Próximos 7 dias</h2>
        <p className="text-sm text-red-600 mt-2">{(error as any)?.detail ?? (error as Error).message}</p>
      </Card>
    )
  }
  if (!homepage?.length) {
    return (
      <Card>
        <h2 className="font-semibold text-gray-900">Hoje / Próximos 7 dias</h2>
        <p className="text-sm text-gray-500 mt-1">Nenhum item nos próximos 7 dias.</p>
        <Link to="/cronograma" className="inline-flex mt-3 text-sm text-primary hover:underline min-h-[44px] items-center">Ver cronograma</Link>
      </Card>
    )
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Hoje / Próximos 7 dias</h2>
        <Link to="/cronograma" className="text-sm text-primary hover:underline min-h-[44px] flex items-center px-2">Ver cronograma</Link>
      </div>
      <div className="mt-4 space-y-4">
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Hoje</h3>
          {hoje.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">Nenhum item para hoje.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {hoje.map((it) => (
                <li key={`${it.id}-${it.due_date}`} className="flex items-center justify-between gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{it.title}</p>
                    <p className="text-xs text-gray-500">{fmtDate(it.due_date)} {it.item_type?.name ? `· ${it.item_type.name}` : ''}</p>
                  </div>
                  <Link to={`/itens/${it.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2 shrink-0">ver</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Próximos 7 dias</h3>
          {proximos.length === 0 ? (
            <p className="text-sm text-gray-500 mt-1">Nenhum item nos próximos 7 dias.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {proximos.map((it) => (
                <li key={`${it.id}-${it.due_date}`} className="flex items-center justify-between gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{it.title}</p>
                    <p className="text-xs text-gray-500">{fmtDate(it.due_date)} {it.item_type?.name ? `· ${it.item_type.name}` : ''}</p>
                  </div>
                  <Link to={`/itens/${it.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2 shrink-0">ver</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { data: periods, isLoading: lp } = usePeriods()
  const { data: courses, isLoading: lc } = useCourses()
  const createPeriod = useCreatePeriod()
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [periodName, setPeriodName] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [error, setError] = useState('')
  const toast = useToast()
  const importMut = useImport()
  const [exporting, setExporting] = useState(false)

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!periodName.trim()) { setError('Nome é obrigatório'); return }
    try {
      await createPeriod.mutateAsync({
        name: periodName.trim(),
        start_date: periodStart || null,
        end_date: periodEnd || null,
      } as any)
      setPeriodName('')
      setPeriodStart('')
      setPeriodEnd('')
      setShowNewPeriod(false)
    } catch (err: any) {
      setError(err?.detail ?? err?.message ?? 'Erro ao criar período')
    }
  }

  return (
    <div className="space-y-6">
      <HomepageSection />

      {/* Periods section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Períodos</h2>
          <Button onClick={() => setShowNewPeriod((v) => !v)}>
            {showNewPeriod ? 'Cancelar' : 'Novo Período'}
          </Button>
        </div>

        {showNewPeriod && (
          <Card className="mb-4">
            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="Ex: 2026.1"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Início</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fim</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={createPeriod.isPending} className="w-full sm:w-auto">
                {createPeriod.isPending ? 'Criando...' : 'Criar período'}
              </Button>
            </form>
          </Card>
        )}

        {lp ? (
          <SkeletonList count={2} />
        ) : !periods?.length ? (
          <EmptyState
            title="Nenhum período ainda"
            description="Crie seu primeiro período para organizar suas cadeiras."
            action={<Button onClick={() => setShowNewPeriod(true)}>Novo Período</Button>}
          />
        ) : (
          <div className="space-y-3">
            {periods.map((p) => (
              <Link key={p.id} to={`/periodos/${p.id}`} className="block">
                <Card className="hover:border-primary-100 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{p.status}</span>
                  </div>
                  {(p.start_date || p.end_date) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {[p.start_date, p.end_date].filter(Boolean).join(' — ') || ''}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Courses shortcut */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Cadeiras</h2>
          <Link to="/periodos/1" className="text-sm text-gray-500 hover:text-gray-900 min-h-[44px] flex items-center">
            Ver períodos
          </Link>
        </div>
        {lc ? (
          <SkeletonList count={2} />
        ) : !courses?.length ? (
          <EmptyState
            title="Nenhuma cadeira ainda"
            description="Crie uma cadeira dentro de um período."
          />
        ) : (
          <div className="space-y-3">
            {courses.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/cadeiras/${c.id}`} className="block">
                <Card className="hover:border-primary-100 transition">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Export / Import (RF-40) — spec allows Dashboard or TrashPage; expose in both for discoverability */}
      <section>
        <Card>
          <h2 className="text-sm font-semibold text-gray-900">Backup</h2>
          <p className="text-xs text-gray-500 mt-1">Exporte todos os dados em JSON ou restaure a partir de um dump (RF-40).</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={async () => {
                setExporting(true)
                try {
                  await doExport()
                  toast('Exportado com sucesso', 'success')
                } catch (e: any) {
                  toast(e?.message ?? 'Erro ao exportar', 'error')
                } finally {
                  setExporting(false)
                }
              }}
              disabled={exporting}
              className="min-h-[44px]"
            >
              {exporting ? 'Exportando…' : 'Exportar JSON'}
            </Button>
            <label className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition min-h-[44px] cursor-pointer">
              {importMut.isPending ? 'Importando…' : 'Importar JSON'}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const res = await importMut.mutateAsync(file)
                    const imported = (res as any)?.imported
                    const summary = imported ? Object.entries(imported).map(([k, v]) => `${k}: ${v}`).join(', ') : ''
                    toast(`Import concluído${summary ? ` — ${summary}` : ''}`, 'success')
                  } catch (err: any) {
                    toast(err?.detail ?? err?.message ?? 'Erro ao importar', 'error')
                  } finally {
                    e.target.value = ''
                  }
                }}
                disabled={importMut.isPending}
              />
            </label>
          </div>
        </Card>
      </section>
    </div>
  )
}
