import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { usePeriod, useUpdatePeriod, useArchivePeriod, useDeletePeriod } from '../api/periods'
import { useCourses, useCreateCourse, useCourseAverage } from '../api/courses'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { fmtDate } from '../lib/formatDate'

function CourseAverageBadge({ courseId }: { courseId: number }) {
  const { data, isLoading } = useCourseAverage(courseId)
  if (isLoading) return <Skeleton className="h-4 w-16" />
  if (!data || data.average == null) return <span className="text-sm text-gray-500">sem notas</span>
  return <span className="text-sm text-gray-700">média {Number(data.average).toFixed(2)}</span>
}

export default function PeriodDetail() {
  const { periodId } = useParams()
  const id = Number(periodId)
  const navigate = useNavigate()
  const { data: period, isLoading, error } = usePeriod(id)
  const { data: courses, isLoading: lc } = useCourses({ period_id: id })
  const update = useUpdatePeriod(id)
  const archive = useArchivePeriod()
  const del = useDeletePeriod()
  const createCourse = useCreateCourse()

  const [saveError, setSaveError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editError, setEditError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const [createCourseOpen, setCreateCourseOpen] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [courseError, setCourseError] = useState('')

  useEffect(() => {
    if (period && editOpen) {
      setEditName(period.name)
      setEditStart(period.start_date ?? '')
      setEditEnd(period.end_date ?? '')
      setEditError('')
    }
  }, [period, editOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc) }
  }, [menuOpen])

  if (isLoading) return <SkeletonList count={3} />
  if (error || !period) {
    return (
      <EmptyState
        title="Período não encontrado"
        description="Verifique o link ou volte ao Dashboard."
        action={<Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>}
      />
    )
  }

  const openEdit = () => {
    if (!period) return
    setEditName(period.name)
    setEditStart(period.start_date ?? '')
    setEditEnd(period.end_date ?? '')
    setEditError('')
    setMenuOpen(false)
    setEditOpen(true)
  }

  const handleEditSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setEditError('')
    if (!editName.trim()) { setEditError('Nome é obrigatório'); return }
    try {
      await update.mutateAsync({ name: editName.trim(), start_date: editStart || null, end_date: editEnd || null } as any)
      setEditOpen(false)
    } catch (err: any) {
      setEditError(err?.detail ?? err?.message ?? 'Erro ao salvar')
    }
  }

  const handleArchive = async () => {
    try {
      await archive.mutateAsync(id)
      setConfirmArchive(false)
    } catch (e: any) {
      setSaveError(e?.detail ?? e?.message ?? 'Erro ao arquivar')
    }
  }

  const handleDelete = async () => {
    try {
      await del.mutateAsync(id)
      navigate('/')
    } catch (e: any) {
      setSaveError(e?.detail ?? e?.message ?? 'Erro ao excluir')
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setCourseError('')
    if (!newCourseName.trim()) { setCourseError('Nome é obrigatório'); return }
    try {
      await createCourse.mutateAsync({ period_id: id, name: newCourseName.trim(), description: newCourseDesc.trim() || null } as any)
      setNewCourseName('')
      setNewCourseDesc('')
      setCreateCourseOpen(false)
    } catch (e: any) {
      setCourseError(e?.detail ?? e?.message ?? 'Erro ao criar cadeira')
    }
  }

  const isArchived = period.status === 'archived'

  return (
    <div className="space-y-6">
      {/* Header — somente leitura; ações no menu ⋮ */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 truncate">{period.name}</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 shrink-0">{period.status}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Início</p>
                <p className="text-sm text-gray-900 mt-1">{fmtDate(period.start_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Fim</p>
                <p className="text-sm text-gray-900 mt-1">{fmtDate(period.end_date)}</p>
              </div>
            </div>
            {saveError && <p className="text-sm text-red-600 mt-3">{saveError}</p>}
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Ações do período"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
            >
              <span aria-hidden className="text-lg leading-none">⋮</span>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                <button role="menuitem" onClick={openEdit} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center">
                  Editar
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setConfirmArchive(true) }}
                  disabled={isArchived}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center"
                >
                  {isArchived ? 'Arquivado' : 'Arquivar'}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px] flex items-center"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de edição */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Editar período"
          onClick={() => setEditOpen(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Editar período</h3>
            <form onSubmit={handleEditSave} className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Início</label>
                  <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fim</label>
                  <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition">
                  Cancelar
                </button>
                <button type="submit" disabled={update.isPending} className="px-4 py-2 min-h-[44px] bg-primary text-white rounded-lg text-sm font-medium hover:brightness-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition">
                  {update.isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive}
        title="Arquivar período"
        description="O período será arquivado. Você poderá restaurá-lo depois."
        confirmLabel="Arquivar"
        onConfirm={handleArchive}
        onClose={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir período"
        description="Esta ação não pode ser desfeita. Cadeiras e itens vinculados também serão removidos."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />

      {/* Courses list — listagem primeiro, criação via modal */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Cadeiras deste período</h2>

        {lc ? (
          <SkeletonList count={2} />
        ) : !courses?.length ? (
          <EmptyState title="Nenhuma cadeira neste período" description="Crie a primeira cadeira com o botão abaixo ou use Ctrl+K / Cmd+K." />
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <Link key={c.id} to={`/cadeiras/${c.id}`} className="block">
                <Card className="hover:border-primary-100 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.name}</p>
                      {c.description && <p className="text-sm text-gray-500 truncate">{c.description}</p>}
                    </div>
                    <CourseAverageBadge courseId={c.id} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Button
          onClick={() => { setCourseError(''); setCreateCourseOpen(true) }}
          className="mt-4 w-full sm:w-auto"
        >
          Nova Cadeira
        </Button>
      </section>

      {/* Modal Nova Cadeira */}
      {createCourseOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Nova cadeira"
          onClick={() => setCreateCourseOpen(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Nova cadeira</h3>
            <form onSubmit={handleCreateCourse} className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="Nome da cadeira"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <input
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {courseError && <p className="text-sm text-red-600">{courseError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCreateCourseOpen(false)} className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition">
                  Cancelar
                </button>
                <button type="submit" disabled={createCourse.isPending} className="px-4 py-2 min-h-[44px] bg-primary text-white rounded-lg text-sm font-medium hover:brightness-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition">
                  {createCourse.isPending ? 'Criando…' : 'Criar cadeira'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
