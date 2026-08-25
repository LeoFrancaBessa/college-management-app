import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useItem, useUpdateItem, useCreateItem, useArchiveItem, useDeleteItem, useItems } from '../api/items'
import { useCourse } from '../api/courses'
import { usePeriod } from '../api/periods'
import { useItemTypes } from '../api/itemTypes'
import { useTags, useSetItemTags } from '../api/tags'
import { Card } from '../components/ui/Card'
import { SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FeatureSection } from '../components/item/FeatureSection'
import { GradeFields } from '../components/item/GradeFields'
import { ChecklistEditor } from '../components/item/ChecklistEditor'
import { NotesEditor } from '../components/item/NotesEditor'
import { RecurrenceFields } from '../components/item/RecurrenceFields'
import { AttachmentList } from '../components/item/AttachmentList'
import { fmtDate } from '../lib/formatDate'
import { ApiError, apiFetch } from '../api/client'
import { useQueryClient } from '@tanstack/react-query'

function SubBoardSection({ itemId, hasBoard, boardId }: { itemId: number; hasBoard: boolean; boardId?: number | null }) {
  const qc = useQueryClient()
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState('')
  const handleEnable = async () => {
    setError('')
    setEnabling(true)
    try {
      await apiFetch(`/api/v1/items/${itemId}/board`, { method: 'POST' })
      qc.invalidateQueries({ queryKey: ['item', itemId] })
    } catch (e: any) {
      setError(e?.detail ?? e?.message ?? 'Erro ao ativar board')
    } finally {
      setEnabling(false)
    }
  }
  if (!hasBoard) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Board não ativado neste item — organize os filhos em colunas.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={handleEnable} disabled={enabling}>
          {enabling ? 'Ativando...' : 'Ativar Sub-Board'}
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {boardId ? (
        <div className="text-sm text-gray-500">Board #{boardId} — BoardView em breve (Task 7).</div>
      ) : (
        <div className="text-sm text-gray-500">Sub-Board ativo — BoardView em breve.</div>
      )}
    </div>
  )
}

export default function ItemDetail() {
  const { itemId } = useParams()
  const id = Number(itemId)
  const valid = Number.isFinite(id) && id > 0
  const { data: item, isLoading, error } = useItem(valid ? id : 0)
  const courseId = item?.course_id
  const { data: course } = useCourse(courseId ?? 0)
  const periodId = course?.period_id
  const { data: period } = usePeriod(periodId ?? 0)
  const { data: itemTypes } = useItemTypes()
  const { data: allTags } = useTags()
  const { data: children } = useItems(valid ? { parent_id: id } : {})
  const navigate = useNavigate()
  const qc = useQueryClient()

  const update = useUpdateItem(valid ? id : 0)
  const archive = useArchiveItem()
  const del = useDeleteItem()
  const createChild = useCreateItem()
  const setItemTags = useSetItemTags(valid ? id : 0)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleError, setTitleError] = useState('')
  const [typeDraft, setTypeDraft] = useState('')
  const [typeError, setTypeError] = useState('')
  const [dateDraft, setDateDraft] = useState('')
  const [dateError, setDateError] = useState('')
  const [showCreateType, setShowCreateType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeError, setNewTypeError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [featureError, setFeatureError] = useState('')
  const [attachmentsEnabled, setAttachmentsEnabled] = useState(false)
  const [childTitle, setChildTitle] = useState('')
  const [childTypeId, setChildTypeId] = useState('')
  const [childError, setChildError] = useState('')
  const [tagError, setTagError] = useState('')

  if (!valid) {
    return <EmptyState title="Item não encontrado" description="ID inválido." action={<Link to="/" className="text-sm text-primary hover:underline">Voltar ao Dashboard</Link>} />
  }
  if (isLoading) return <SkeletonList count={2} />
  if (error || !item) {
    const is404 = error instanceof ApiError && error.status === 404
    return (
      <EmptyState
        title={is404 ? 'Item não encontrado' : 'Erro ao carregar item'}
        description={is404 ? 'Verifique o link ou volte à cadeira.' : (error as any)?.detail ?? (error as Error)?.message}
        action={
          <div className="flex gap-2 justify-center">
            {item?.course_id ? <Link to={`/cadeiras/${item.course_id}`} className="text-sm text-primary hover:underline min-h-[44px] flex items-center px-3">Voltar à cadeira</Link> : null}
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 min-h-[44px] flex items-center px-3">Dashboard</Link>
          </div>
        }
      />
    )
  }

  const features = (item.features ?? {}) as any
  const gradeEnabled = features.grade != null
  const checklistEnabled = features.checklist != null
  const notesEnabled = features.notes != null
  const recurrenceEnabled = features.recurrence != null
  const hasBoard = !!item.board || item.board_id != null

  const startEditTitle = () => {
    setTitleDraft(item.title)
    setTitleError('')
    setEditingTitle(true)
  }
  const handleSaveTitle = async () => {
    setTitleError('')
    if (!titleDraft.trim()) { setTitleError('Título é obrigatório'); return }
    try {
      await update.mutateAsync({ title: titleDraft.trim() } as any)
      setEditingTitle(false)
    } catch (e: any) {
      if (e instanceof ApiError) setTitleError(e.detail)
      else setTitleError(e?.detail ?? e?.message ?? 'Erro ao salvar')
    }
  }
  const handleChangeType = async (val: string) => {
    setTypeDraft(val)
    setTypeError('')
    if (!val) return
    try {
      await update.mutateAsync({ item_type_id: Number(val) } as any)
    } catch (e: any) {
      if (e instanceof ApiError) setTypeError(e.detail)
      else setTypeError(e?.detail ?? e?.message ?? 'Erro ao alterar tipo')
    }
  }
  const handleCreateType = async () => {
    setNewTypeError('')
    const name = newTypeName.trim()
    if (!name) { setNewTypeError('Nome é obrigatório'); return }
    try {
      const created = await apiFetch<{ id: number; name: string }>('/api/v1/item-types', { method: 'POST', body: JSON.stringify({ name }) })
      qc.invalidateQueries({ queryKey: ['itemTypes'] })
      setNewTypeName('')
      setShowCreateType(false)
      setTypeDraft(String(created.id))
      await update.mutateAsync({ item_type_id: created.id } as any)
    } catch (e: any) {
      if (e instanceof ApiError) setNewTypeError(e.detail)
      else setNewTypeError(e?.detail ?? e?.message ?? 'Erro ao criar tipo')
    }
  }
  const handleSaveDate = async (val: string) => {
    setDateError('')
    setDateDraft(val)
    try {
      await update.mutateAsync({ due_date: val ? new Date(val).toISOString() : null } as any)
    } catch (e: any) {
      if (e instanceof ApiError) setDateError(e.detail)
      else setDateError(e?.detail ?? e?.message ?? 'Erro ao salvar data')
    }
  }
  const handleArchive = async () => {
    try { await archive.mutateAsync(id); setConfirmArchive(false) } catch { /* toast handled elsewhere */ }
  }
  const handleDelete = async () => {
    try { await del.mutateAsync(id); setConfirmDelete(false); navigate(`/cadeiras/${item.course_id}`) } catch { /* handled */ }
  }
  const toggleFeature = async (key: string, enabled: boolean, defaultValue: any) => {
    setFeatureError('')
    try {
      const next = { ...features }
      if (enabled) {
        next[key] = defaultValue
      } else {
        delete next[key]
      }
      await update.mutateAsync({ features: next } as any)
    } catch (e: any) {
      if (e instanceof ApiError) setFeatureError(e.detail)
      else setFeatureError(e?.detail ?? e?.message ?? 'Erro ao alternar feature')
    }
  }
  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setChildError('')
    if (!childTitle.trim()) { setChildError('Título é obrigatório'); return }
    if (!childTypeId) { setChildError('Tipo é obrigatório'); return }
    try {
      await createChild.mutateAsync({ title: childTitle.trim(), item_type_id: Number(childTypeId), parent_id: id } as any)
      setChildTitle(''); setChildTypeId('')
    } catch (err: any) {
      setChildError(err?.detail ?? err?.message ?? 'Erro ao criar filho')
    }
  }
  const toggleTag = async (tagId: number) => {
    setTagError('')
    const current = (item.tags ?? []).map((t) => t.id)
    const next = current.includes(tagId) ? current.filter((x) => x !== tagId) : [...current, tagId]
    try {
      await setItemTags.mutateAsync(next)
    } catch (e: any) {
      if (e instanceof ApiError) setTagError(e.detail)
      else setTagError(e?.detail ?? e?.message ?? 'Erro ao atualizar tags')
    }
  }

  // init drafts from item when not editing
  const displayTypeId = typeDraft || String(item.item_type_id)
  const displayDate = dateDraft || (item.due_date ? item.due_date.slice(0, 10) : '')

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
        <Link to="/" className="hover:text-gray-900">Dashboard</Link>
        {period ? (
          <>
            <span className="text-gray-300">/</span>
            <Link to={`/periodos/${period.id}`} className="hover:text-gray-900">{period.name}</Link>
          </>
        ) : course ? (
          <>
            <span className="text-gray-300">/</span>
            <Link to={`/periodos/${course.period_id}`} className="hover:text-gray-900">Período #{course.period_id}</Link>
          </>
        ) : null}
        {course ? (
          <>
            <span className="text-gray-300">/</span>
            <Link to={`/cadeiras/${course.id}`} className="hover:text-gray-900">{course.name}</Link>
          </>
        ) : (
          <>
            <span className="text-gray-300">/</span>
            <span>Cadeira #{item.course_id}</span>
          </>
        )}
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">{item.title}</span>
      </nav>

      <Link to={`/cadeiras/${item.course_id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 min-h-[44px]">← Voltar à cadeira</Link>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {!editingTitle ? (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{item.title}</h1>
                <button onClick={startEditTitle} className="text-sm text-primary hover:underline min-h-[44px] px-2">Editar</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="Título" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <Button onClick={handleSaveTitle} disabled={update.isPending}>Salvar</Button>
                  <Button variant="ghost" onClick={() => setEditingTitle(false)}>Cancelar</Button>
                </div>
                {titleError && <p className="text-sm text-red-600">{titleError}</p>}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <select value={displayTypeId} onChange={(e) => handleChangeType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white">
                {itemTypes?.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
              </select>
              {!showCreateType ? (
                <button onClick={() => setShowCreateType(true)} className="text-sm text-primary hover:underline min-h-[44px] px-2">criar tipo</button>
              ) : (
                <div className="flex items-center gap-2">
                  <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Novo tipo" className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <Button onClick={handleCreateType}>Criar</Button>
                  <Button variant="ghost" onClick={() => { setShowCreateType(false); setNewTypeName(''); setNewTypeError('') }}>Cancelar</Button>
                </div>
              )}
            </div>
            {typeError && <p className="text-sm text-red-600 mt-1">{typeError}</p>}
            {newTypeError && <p className="text-sm text-red-600 mt-1">{newTypeError}</p>}
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Data de entrega</label>
              <input type="date" value={displayDate} onChange={(e) => handleSaveDate(e.target.value)} className="mt-1 w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
              {dateError && <p className="text-sm text-red-600 mt-1">{dateError}</p>}
              <p className="text-sm text-gray-500 mt-1">Atual: {fmtDate(item.due_date)}</p>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {item.item_type && <Badge active>{item.item_type.name}</Badge>}
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{item.status}</span>
              {item.tags?.map((t) => (
                <span key={t.id} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600" style={t.color ? { backgroundColor: t.color + '22', color: t.color } : undefined}>{t.name}</span>
              ))}
            </div>
            {item.parent_id != null && <p className="text-xs text-gray-500 mt-2">Filho de #{item.parent_id} — <Link to={`/itens/${item.parent_id}`} className="text-primary hover:underline">ver pai</Link></p>}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button variant="ghost" onClick={() => setConfirmArchive(true)} className="min-h-[44px]">Arquivar</Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)} className="min-h-[44px]">Excluir</Button>
          </div>
        </div>
      </Card>

      {featureError && <p className="text-sm text-red-600">{featureError}</p>}

      <FeatureSection title="Nota" enabled={gradeEnabled} onToggle={(v) => toggleFeature('grade', v, { score: 0, max_score: 10, weight: 1 })}>
        <GradeFields itemId={id} features={features} value={features.grade} />
      </FeatureSection>

      <FeatureSection title="Checklist" enabled={checklistEnabled} onToggle={(v) => toggleFeature('checklist', v, [])}>
        <ChecklistEditor itemId={id} features={features} value={features.checklist} />
      </FeatureSection>

      <FeatureSection title="Anotações" enabled={notesEnabled} onToggle={(v) => toggleFeature('notes', v, '')}>
        <NotesEditor itemId={id} features={features} value={features.notes} />
      </FeatureSection>

      <FeatureSection title="Recorrência" enabled={recurrenceEnabled} onToggle={(v) => toggleFeature('recurrence', v, { frequency: 'weekly', interval: 1, count: 5 })}>
        <RecurrenceFields itemId={id} features={features} value={features.recurrence} />
      </FeatureSection>

      <FeatureSection title="Anexos" enabled={attachmentsEnabled} onToggle={setAttachmentsEnabled}>
        <AttachmentList itemId={id} />
      </FeatureSection>

      <FeatureSection title="Sub-Board" enabled={hasBoard} onToggle={async (v) => {
        if (v && !hasBoard) {
          setFeatureError('')
          try {
            await apiFetch(`/api/v1/items/${id}/board`, { method: 'POST' })
            qc.invalidateQueries({ queryKey: ['item', id] })
          } catch (e: any) {
            setFeatureError(e?.detail ?? e?.message ?? 'Erro ao ativar board')
          }
        }
      }}>
        <SubBoardSection itemId={id} hasBoard={hasBoard} boardId={item.board_id ?? item.board?.id} />
      </FeatureSection>

      <Card>
        <h3 className="font-medium text-gray-900">Filhos</h3>
        <form onSubmit={handleCreateChild} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={childTitle} onChange={(e) => setChildTitle(e.target.value)} placeholder="Título do filho" className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <select value={childTypeId} onChange={(e) => setChildTypeId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white">
              <option value="">Selecione tipo</option>
              {itemTypes?.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
            </select>
          </div>
          {childError && <p className="text-sm text-red-600">{childError}</p>}
          <Button type="submit" disabled={createChild.isPending}>{createChild.isPending ? 'Criando...' : 'Criar filho'}</Button>
        </form>
        <div className="mt-4 space-y-2">
          {!children?.length ? (
            <p className="text-sm text-gray-500">Nenhum filho.</p>
          ) : (
            children.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">{ch.title}</span>
                  <span className="text-xs text-gray-500 ml-2">{ch.item_type?.name ?? ''}</span>
                  {ch.due_date && <span className="text-xs text-gray-500 ml-2">{fmtDate(ch.due_date)}</span>}
                </div>
                <Link to={`/itens/${ch.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2 shrink-0">ver detalhes</Link>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-medium text-gray-900">Tags</h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {allTags?.length ? allTags.map((t) => {
            const selected = (item.tags ?? []).some((x) => x.id === t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={`text-xs px-3 py-2 rounded-full border min-h-[44px] ${selected ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200'}`}
                style={selected && t.color ? { backgroundColor: t.color, borderColor: t.color } : t.color ? { borderColor: t.color, color: t.color } : undefined}
              >
                {t.name}
              </button>
            )
          }) : <p className="text-sm text-gray-500">Nenhuma tag cadastrada.</p>}
        </div>
        {tagError && <p className="text-sm text-red-600 mt-2">{tagError}</p>}
      </Card>

      <ConfirmDialog open={confirmArchive} title="Arquivar item" description="Arquivar este item?" confirmLabel="Arquivar" onConfirm={handleArchive} onClose={() => setConfirmArchive(false)} />
      <ConfirmDialog open={confirmDelete} title="Excluir item" description="Excluir este item removerá também seus filhos (cascata). Esta ação não pode ser desfeita." confirmLabel="Excluir" onConfirm={handleDelete} onClose={() => setConfirmDelete(false)} />
    </div>
  )
}
