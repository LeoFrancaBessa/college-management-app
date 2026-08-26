import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrash, useRestore } from '../api/trash'
import { doExport, useImport } from '../api/export'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { fmtDate } from '../lib/formatDate'

export default function TrashPage() {
  const { data: items, isLoading, error } = useTrash()
  const restore = useRestore()
  const toast = useToast()
  const importMut = useImport()
  const [exporting, setExporting] = useState(false)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  const handleRestore = async (id: number) => {
    setRestoringId(id)
    try {
      await restore.mutateAsync(id)
      toast('Item restaurado', 'success')
    } catch (e: any) {
      toast(e?.detail ?? e?.message ?? 'Erro ao restaurar', 'error')
    } finally {
      setRestoringId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await doExport()
      toast('Exportado com sucesso', 'success')
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao exportar', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Lixeira</h1>
        <p className="text-sm text-gray-500 mt-1">
          Itens excluídos via IA (soft delete). Restaure quando precisar.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Retenção 30 dias — expiração automática</p>
        <p className="text-xs text-amber-700 mt-1">
          Itens na lixeira são removidos automaticamente após 30 dias. Restaure antes desse prazo se precisar recuperá-los.
        </p>
      </div>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{(error as any)?.detail ?? (error as Error).message}</p>
        </Card>
      ) : !items?.length ? (
        <EmptyState
          title="Lixeira vazia"
          description="Nenhum item na lixeira. Itens excluídos via IA aparecem aqui."
          action={
            <Link to="/" className="text-sm text-primary underline min-h-[44px] inline-flex items-center">
              Voltar ao Dashboard
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{it.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {it.due_date ? fmtDate(it.due_date) : 'Sem data'}
                  {it.item_type?.name ? ` · ${it.item_type.name}` : ''}
                  {it.board_id ? ` · board #${it.board_id}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/itens/${it.id}`}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 min-h-[44px] inline-flex items-center"
                >
                  Ver
                </Link>
                <Button
                  onClick={() => handleRestore(it.id)}
                  disabled={restoringId === it.id || restore.isPending}
                  className="min-h-[44px]"
                >
                  {restoringId === it.id ? 'Restaurando…' : 'Restaurar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Backup</h2>
        <p className="text-xs text-gray-500 mt-1">Exporte todos os dados em JSON ou restaure a partir de um dump.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Button onClick={handleExport} disabled={exporting} className="min-h-[44px]">
            {exporting ? 'Exportando…' : 'Exportar JSON'}
          </Button>
          <label className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition min-h-[44px] cursor-pointer">
            {importMut.isPending ? 'Importando…' : 'Importar JSON'}
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} disabled={importMut.isPending} />
          </label>
        </div>
        {importMut.isPending && <p className="text-xs text-gray-500 mt-2">Importando…</p>}
      </Card>
    </div>
  )
}
