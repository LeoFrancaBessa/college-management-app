import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useItem, useUpdateItem, useCreateItem, useArchiveItem, useDeleteItem, useItems } from '../api/items'
import { useCourse } from '../api/courses'
import { usePeriod } from '../api/periods'
import { useItemTypes } from '../api/itemTypes'
import { useTags, useSetItemTags } from '../api/tags'
import { Card } from '../components/ui/Card'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
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

const BoardView = lazy(() => import('../components/board/BoardView'))

function SubBoardSection({ hasBoard, boardId }: { hasBoard: boolean; boardId?: number | null }) {
  if (!hasBoard) {
    return <p className="text-sm text-gray-500">Board não ativado neste item — ative pelo toggle acima para organizar os filhos em colunas.</p>
  }
  if (!boardId) {
    return <p className="text-sm text-gray-500">Board ativo — carregando…</p>
  }
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <BoardView boardId={boardId} />
    </Suspense>
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
  const { data: children } = useItems({ parent_id: id }, { enabled: valid })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const update = useUpdateItem(valid ? id : 0)
  const archive = useArchiveItem()
  const del = useDeleteItem()
  const createChild = useCreateItem()
  const setItemTags = useSetItemTags(valid ? id : 0)

  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTypeId, setEditTypeId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState('')
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
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (item && editOpen) {
      setEditName(item.title)
      setEditTypeId(String(item.item_type_id))
      setEditDate(item.due_date ? item.due_date.slice(0, 10) : '')
      setEditError('')
      setNewTypeError('')
      setShowCreateType(false)
    }
  }, [item, editOpen])

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

  const openEdit = () => {
    if (!item) return
    setEditName(item.title)
    setEditTypeId(String(item.item_type_id))
    setEditDate(item.due_date ? item.due_date.slice(0, 10) : '')
    setEditError('')
    setNewTypeError('')
    setShowCreateType(false)
    setMenuOpen(false)
    setEditOpen(true)
  }

  const handleEditSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setEditError('')
    if (!editName.trim()) { setEditError('Título é obrigatório'); return }
    if (!editTypeId) { setEditError('Tipo é obrigatório'); return }
    try {
      await update.mutateAsync({
        title: editName.trim(),
        item_type_id: Number(editTypeId),
        due_date: editDate ? new Date(editDate).toISOString() : null,
      } as any)
      setEditOpen(false)
    } catch (err: any) {
      if (err instanceof ApiError) setEditError(err.detail)
      else setEditError(err?.detail ?? err?.message ?? 'Erro ao salvar')
    }
  }

  const handleCreateTypeInModal = async () => {
    setNewTypeError('')
    const name = newTypeName.trim()
    if (!name) { setNewTypeError('Nome é obrigatório'); return }
    try {
      const created = await apiFetch<{ id: number; name: string }>('/api/v1/item-types', { method: 'POST', body: JSON.stringify({ name }) })
      qc.invalidateQueries({ queryKey: ['itemTypes'] })
      setNewTypeName('')
      setShowCreateType(false)
      setEditTypeId(String(created.id))
    } catch (e: any) {
      if (e instanceof ApiError) setNewTypeError(e.detail)
      else setNewTypeError(e?.detail ?? e?.message ?? 'Erro ao criar tipo')
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

  const isArchived = item.status === 'archived'

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

      {/* Header — somente leitura; ações no menu ⋮ */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 break-words">{item.title}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium capitalize shrink-0">{item.status}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Tipo</p>
                <p className="text-sm text-gray-900 mt-1">{item.item_type?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Data de entrega</p>
                <p className="text-sm text-gray-900 mt-1">{fmtDate(item.due_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {item.item_type && <Badge active>{item.item_type.name}</Badge>}
              {item.tags?.map((t) => (
                <span key={t.id} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium" style={t.color ? { backgroundColor: t.color + '22', color: t.color } : undefined}>{t.name}</span>
              ))}
            </div>
            {item.parent_id != null && <p className="text-xs text-gray-500">Filho de #{item.parent_id} — <Link to={`/itens/${item.parent_id}`} className="text-primary hover:underline">ver pai</Link></p>}
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Ações do item"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
            >
              <span aria-hidden className="text-lg leading-none">⋮</span>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                <button role="menuitem" onClick={openEdit} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center">Editar</button>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setConfirmArchive(true) }}
                  disabled={isArchived}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center"
                >
                  {isArchived ? 'Arquivado' : 'Arquivar'}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button role="menuitem" onClick={() => { setMenuOpen(false); setConfirmDelete(true) }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px] flex items-center">Excluir</button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de edição */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Editar item" onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Editar item</h3>
            <form onSubmit={handleEditSave} className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Título</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select value={editTypeId} onChange={(e) => setEditTypeId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                  {itemTypes?.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
                {!showCreateType ? (
                  <button type="button" onClick={() => setShowCreateType(true)} className="mt-2 text-sm text-primary hover:underline min-h-[44px] px-1">criar tipo</button>
                ) : (
                  <span className="mt-2 flex items-center gap-2 flex-wrap">
                    <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Novo tipo" className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm flex-1 min-w-[120px]" />
                    <Button type="button" onClick={handleCreateTypeInModal}>Criar</Button>
                    <Button type="button" variant="ghost" onClick={() => { setShowCreateType(false); setNewTypeName(''); setNewTypeError('') }}>Cancelar</Button>
                  </span>
                )}
                {newTypeError && <p className="text-sm text-red-600 mt-1">{newTypeError}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data de entrega</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition">Cancelar</button>
                <button type="submit" disabled={update.isPending} className="px-4 py-2 min-h-[44px] bg-primary text-white rounded-lg text-sm font-medium hover:brightness-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition">{update.isPending ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        setFeatureError('')
        try {
          if (v && !hasBoard) {
            await apiFetch(`/api/v1/items/${id}/board`, { method: 'POST' })
          } else if (!v && hasBoard) {
            await apiFetch(`/api/v1/items/${id}/board`, { method: 'DELETE' })
          } else {
            return
          }
          qc.invalidateQueries({ queryKey: ['item', id] })
          qc.invalidateQueries({ queryKey: ['items'] })
          qc.invalidateQueries({ queryKey: ['boards'] })
        } catch (e: any) {
          setFeatureError(e?.detail ?? e?.message ?? (v ? 'Erro ao ativar board' : 'Erro ao desativar board'))
        }
      }}>
        <SubBoardSection hasBoard={hasBoard} boardId={item.board_id ?? item.board?.id} />
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
