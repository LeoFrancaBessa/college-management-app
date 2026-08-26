import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { usePeriod, useUpdatePeriod, useArchivePeriod, useDeletePeriod } from '../api/periods'
import { useCourses, useCreateCourse, useCourseAverage } from '../api/courses'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

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

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [startDraft, setStartDraft] = useState('')
  const [endDraft, setEndDraft] = useState('')
  const [saveError, setSaveError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [courseError, setCourseError] = useState('')

  useEffect(() => {
    if (period) {
      setNameDraft(period.name)
      setStartDraft(period.start_date ?? '')
      setEndDraft(period.end_date ?? '')
    }
  }, [period])

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

  const handleSaveName = async () => {
    setSaveError('')
    if (!nameDraft.trim()) { setSaveError('Nome é obrigatório'); return }
    try {
      await update.mutateAsync({ name: nameDraft.trim() } as any)
      setEditingName(false)
    } catch (e: any) {
      setSaveError(e?.detail ?? e?.message ?? 'Erro ao salvar')
    }
  }

  const handleSaveDates = async () => {
    setSaveError('')
    try {
      await update.mutateAsync({ start_date: startDraft || null, end_date: endDraft || null } as any)
    } catch (e: any) {
      setSaveError(e?.detail ?? e?.message ?? 'Erro ao salvar datas')
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
    } catch (e: any) {
      setCourseError(e?.detail ?? e?.message ?? 'Erro ao criar cadeira')
    }
  }

  const isArchived = period.status === 'archived'

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <Button onClick={handleSaveName} disabled={update.isPending}>Salvar</Button>
                <Button variant="ghost" onClick={() => { setEditingName(false); setNameDraft(period.name) }}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900 truncate">{period.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-sm px-3 py-2 rounded-lg border border-gray-200 min-h-[44px] hover:bg-gray-50"
                >
                  Editar
                </button>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{period.status}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Início</label>
                <input
                  type="date"
                  value={startDraft}
                  onChange={(e) => setStartDraft(e.target.value)}
                  onBlur={handleSaveDates}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fim</label>
                <input
                  type="date"
                  value={endDraft}
                  onChange={(e) => setEndDraft(e.target.value)}
                  onBlur={handleSaveDates}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {saveError && <p className="text-sm text-red-600 mt-2">{saveError}</p>}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={() => setConfirmArchive(true)} disabled={isArchived || archive.isPending} className="min-h-[44px]">
            {isArchived ? 'Arquivado' : 'Arquivar'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} className="min-h-[44px]">
            Excluir
          </Button>
        </div>
      </Card>

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

      {/* Courses list */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Cadeiras deste período</h2>

        <Card className="mb-4">
          <h3 className="font-medium text-gray-900 mb-3">Nova cadeira</h3>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            <input
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="Nome da cadeira"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={newCourseDesc}
              onChange={(e) => setNewCourseDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {courseError && <p className="text-sm text-red-600">{courseError}</p>}
            <Button type="submit" disabled={createCourse.isPending}>
              {createCourse.isPending ? 'Criando...' : 'Criar cadeira'}
            </Button>
          </form>
        </Card>

        {lc ? (
          <SkeletonList count={2} />
        ) : !courses?.length ? (
          <EmptyState title="Nenhuma cadeira neste período" description="Crie a primeira cadeira acima ou use Ctrl+K / Cmd+K." />
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
      </section>
    </div>
  )
}
