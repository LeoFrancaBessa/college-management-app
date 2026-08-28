import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Badge } from '../components/ui/Badge'
import { useCourse, useUpdateCourse, useArchiveCourse, useDeleteCourse } from '../api/courses'
import { useItems, useCreateItem, useUpdateItem, useArchiveItem, useDeleteItem, useMoveItem } from '../api/items'
import { useItemTypes } from '../api/itemTypes'
import { useSchedule } from '../api/schedule'
import { fmtDate } from '../lib/formatDate'
import { ApiError } from '../api/client'

const BoardView = lazy(() => import('../components/board/BoardView'))
const ScheduleCalendar = lazy(() => import('../components/schedule/ScheduleCalendar'))

function CronogramaTab({ courseId }: { courseId: number }) {
  const navigate = useNavigate()
  const { data, isLoading, error } = useSchedule({ course_id: courseId })
  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (error) return <EmptyState title="Erro ao carregar cronograma" description={(error as any)?.detail ?? (error as Error).message} />
  const events = (data ?? []).map((item) => ({ id: String(item.id), title: item.title, start: item.due_date }))
  if (!events.length) return <Card><EmptyState title="Nenhum item no cronograma" description="Itens com data de entrega desta cadeira aparecerão aqui." /></Card>
  return (
    <Card>
      <ScheduleCalendar events={events} onEventClick={(id) => navigate(`/itens/${id}`)} onDateClick={() => {}} />
    </Card>
  )
}

function BoardTab({ courseId }: { courseId: number }) {
  const { data: course, isLoading, error } = useCourse(courseId)
  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (error) return <EmptyState title="Erro ao carregar cadeira" description={(error as any)?.detail ?? (error as Error).message} />
  if (!course) return <EmptyState title="Cadeira não encontrada" />
  if (!course.board) return <EmptyState title="Board não configurado" description="Esta cadeira ainda não possui board." />
  return <BoardView boardId={course.board.id} />
}

function ChildrenRow({ parentId }: { parentId: number }) {
  const { data: children, isLoading } = useItems({ parent_id: parentId })
  if (isLoading) return <div className="pl-6 py-2"><Skeleton className="h-4 w-32" /></div>
  if (!children?.length) return null
  return (
    <div className="pl-6 mt-2 space-y-2 border-l-2 border-gray-100 ml-2">
      {children.map((ch) => (
        <Link key={ch.id} to={`/itens/${ch.id}`} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate">{ch.title}</span>
            <span className="text-xs text-gray-500 ml-2">{ch.item_type?.name ?? ''}</span>
            {ch.due_date && <span className="text-xs text-gray-500 ml-2">{fmtDate(ch.due_date)}</span>}
          </div>
          <span aria-hidden className="text-gray-400 shrink-0 ml-2">›</span>
        </Link>
      ))}
    </div>
  )
}

function ItemRow({ item, allItems, boardColumns, itemTypes }: { item: import('../api/types').Item; allItems: import('../api/types').Item[]; boardColumns: import('../api/types').BoardColumn[]; itemTypes: import('../api/types').ItemType[] }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTypeId, setEditTypeId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState('')
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveParentId, setMoveParentId] = useState<string>('')
  const [moveError, setMoveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const update = useUpdateItem(item.id)
  const move = useMoveItem(item.id)
  const archive = useArchiveItem()
  const del = useDeleteItem()

  useEffect(() => {
    if (!menuOpen) return

    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const openEdit = () => {
    setEditName(item.title)
    setEditTypeId(String(item.item_type_id))
    setEditDate(item.due_date ? item.due_date.slice(0, 10) : '')
    setEditError('')
    setMenuOpen(false)
    setEditOpen(true)
  }

  const handleEditSave = async (event: React.FormEvent) => {
    event.preventDefault()
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
    } catch (error: any) {
      setEditError(error?.detail ?? error?.message ?? 'Erro ao salvar')
    }
  }

  const handleMove = async () => {
    setMoveError('')
    const pid = moveParentId === '' ? null : Number(moveParentId)
    if (moveParentId !== '' && Number.isNaN(pid)) { setMoveError('ID inválido'); return }
    try {
      await move.mutateAsync({ parent_id: pid })
      setMoveOpen(false)
      setMoveError('')
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 400) setMoveError(e.detail)
      else setMoveError(e?.detail ?? e?.message ?? 'Erro ao mover')
    }
  }

  const handleArchive = async () => {
    try { await archive.mutateAsync(item.id) } catch { /* handled */ }
    setMenuOpen(false)
  }
  const handleDelete = async () => {
    try { await del.mutateAsync(item.id); setConfirmDelete(false) } catch { /* handled */ }
  }

  const moveCandidates = allItems.filter((x) => x.id !== item.id)
  const boardColumn = item.board_column_id == null ? undefined : boardColumns.find((column) => column.id === item.board_column_id)

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/itens/${item.id}`)}
          className="min-w-0 flex-1 text-left cursor-pointer rounded-lg -m-1 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{item.title}</span>
            {item.item_type && <Badge>{item.item_type.name}</Badge>}
            {boardColumn && !boardColumn.is_system && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-gray-700">{boardColumn.name}</span>}
            {item.tags?.map((t) => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" style={t.color ? { backgroundColor: t.color + '22', color: t.color } : undefined}>{t.name}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{item.due_date ? fmtDate(item.due_date) : 'sem data'}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setExpanded((v) => !v) } }}
              className="text-xs text-gray-500 hover:text-gray-900 min-h-[44px] px-2 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {expanded ? 'ocultar filhos' : 'ver filhos'}
            </span>
          </div>
        </button>
        <div ref={menuRef} className="relative shrink-0">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }} aria-label="menu" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">•••</button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-2 space-y-1">
              <button onClick={openEdit} className="w-full text-left text-sm px-3 py-2 min-h-[44px] hover:bg-gray-50 rounded-lg">Editar</button>
              {!moveOpen ? (
                <button onClick={() => setMoveOpen(true)} className="w-full text-left text-sm px-3 py-2 min-h-[44px] hover:bg-gray-50 rounded-lg">Mover para...</button>
              ) : (
                <div className="px-2 py-1 space-y-2">
                  <select value={moveParentId} onChange={(e) => setMoveParentId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                    <option value="">(raiz — sem pai)</option>
                    {moveCandidates.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.title} #{c.id}</option>
                    ))}
                  </select>
                  {moveError && <p className="text-xs text-red-600">{moveError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={handleMove} disabled={move.isPending} className="flex-1">Mover</Button>
                    <Button variant="ghost" onClick={() => { setMoveOpen(false); setMoveError('') }} className="flex-1">Cancelar</Button>
                  </div>
                </div>
              )}
              <button onClick={handleArchive} disabled={archive.isPending} className="w-full text-left text-sm px-3 py-2 min-h-[44px] hover:bg-gray-50 rounded-lg">Arquivar</button>
              <button onClick={() => setConfirmDelete(true)} className="w-full text-left text-sm px-3 py-2 min-h-[44px] hover:bg-red-50 text-red-600 rounded-lg">Excluir</button>
              <button onClick={() => setMenuOpen(false)} className="w-full text-left text-sm px-3 py-2 min-h-[44px] hover:bg-gray-50 rounded-lg text-gray-500">Fechar</button>
            </div>
          )}
        </div>
      </div>
      {expanded && <ChildrenRow parentId={item.id} />}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Editar item" onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Editar item</h3>
            <form onSubmit={handleEditSave} className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Título</label>
                <input value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select value={editTypeId} onChange={(event) => setEditTypeId(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                  {itemTypes.map((type) => <option key={type.id} value={String(type.id)}>{type.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data de entrega</label>
                <input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" />
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
      <ConfirmDialog open={confirmDelete} title="Excluir item" description="Excluir este item removerá também seus filhos (cascata). Esta ação não pode ser desfeita." confirmLabel="Excluir" onConfirm={handleDelete} onClose={() => setConfirmDelete(false)} />
    </div>
  )
}

function ListaTab({ courseId }: { courseId: number }) {
  const { data: items, isLoading, error } = useItems({ course_id: courseId })
  const { data: course } = useCourse(courseId)
  const { data: itemTypes } = useItemTypes()
  const create = useCreateItem()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [itemTypeId, setItemTypeId] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
  const [formError, setFormError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!title.trim()) { setFormError('Título é obrigatório'); return }
    if (!itemTypeId) { setFormError('Tipo é obrigatório'); return }
    try {
      await create.mutateAsync({ title: title.trim(), item_type_id: Number(itemTypeId), course_id: courseId, due_date: dueDate ? new Date(dueDate).toISOString() : null } as any)
      setTitle(''); setItemTypeId(''); setDueDate(''); setShowForm(false)
    } catch (err: any) {
      setFormError(err?.detail ?? err?.message ?? 'Erro ao criar item')
    }
  }

  if (isLoading) return <SkeletonList count={3} />
  if (error) return <EmptyState title="Erro ao carregar itens" description={(error as any)?.detail ?? (error as Error).message} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Itens</h3>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancelar' : 'Novo item'}</Button>
      </div>
      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Título</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do item" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select value={itemTypeId} onChange={(e) => setItemTypeId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                  <option value="">Selecione</option>
                  {itemTypes?.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data de entrega</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Criando...' : 'Criar item'}</Button>
          </form>
        </Card>
      )}
      {!items?.length ? (
        <EmptyState
          title="Nenhum item nesta cadeira"
          description="Crie o primeiro item acima ou use Ctrl+K / Cmd+K para o assistente IA."
          action={<Button onClick={() => setShowForm(true)}>Criar item</Button>}
        />
      ) : (
        <Card>
          {items.map((it) => <ItemRow key={it.id} item={it} allItems={items} boardColumns={course?.board?.columns ?? []} itemTypes={itemTypes ?? []} />)}
        </Card>
      )}
    </div>
  )
}

export default function CourseDetail(){
  const {courseId}=useParams(); const [sp,setSp]=useSearchParams(); const tab=sp.get('tab')??'lista'
  const id = Number(courseId)
  const navigate = useNavigate()
  const { data: course, isLoading: lc } = useCourse(Number.isFinite(id) && id>0 ? id : 0)
  const update = useUpdateCourse(Number.isFinite(id) && id>0 ? id : 0)
  const archive = useArchiveCourse()
  const del = useDeleteCourse()

  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editError, setEditError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (course && editOpen) {
      setEditName(course.name)
      setEditDesc(course.description ?? '')
      setEditError('')
    }
  }, [course, editOpen])

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

  const openEdit = () => {
    if (!course) return
    setEditName(course.name)
    setEditDesc(course.description ?? '')
    setEditError('')
    setMenuOpen(false)
    setEditOpen(true)
  }

  const handleEditSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setEditError('')
    if (!editName.trim()) { setEditError('Nome é obrigatório'); return }
    try {
      await update.mutateAsync({ name: editName.trim(), description: editDesc.trim() || null } as any)
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
      navigate(course ? `/periodos/${course.period_id}` : '/')
    } catch (e: any) {
      setSaveError(e?.detail ?? e?.message ?? 'Erro ao excluir')
    }
  }

  const isArchived = course?.status === 'archived'

  return <div className="space-y-4">
    <div>
      {lc ? <Skeleton className="h-6 w-40" /> : course ? (
        <Link to={`/periodos/${course.period_id}`} className="text-sm text-gray-500 hover:text-gray-900">← Voltar ao período</Link>
      ) : null}
    </div>

    {lc ? <Skeleton className="h-24 w-full" /> : course ? (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 truncate">{course.name}</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 shrink-0">{course.status}</span>
            </div>
            {course.description ? (
              <p className="text-sm text-gray-600 mt-2 break-words">{course.description}</p>
            ) : (
              <p className="text-sm text-gray-400 mt-2">Sem descrição</p>
            )}
            {saveError && <p className="text-sm text-red-600 mt-3">{saveError}</p>}
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Ações da cadeira"
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
                  {isArchived ? 'Arquivada' : 'Arquivar'}
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
    ) : null}

    <Tabs value={tab} onValueChange={v=> setSp({tab:v})} tabs={[{value:'lista',label:'Lista'},{value:'board',label:'Board'},{value:'cronograma',label:'Cronograma'}]} />
    {tab==='lista' && (Number.isFinite(id) && id>0 ? <ListaTab courseId={id} /> : <EmptyState title="Cadeira não encontrada" />)}
    {tab==='board' && (Number.isFinite(id) && id>0 ? (
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <BoardTab courseId={id} />
      </Suspense>
    ) : <EmptyState title="Cadeira não encontrada" />)}
    {tab==='cronograma' && (Number.isFinite(id) && id>0 ? (
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CronogramaTab courseId={id} />
      </Suspense>
    ) : <EmptyState title="Cadeira não encontrada" />)}

    {editOpen && (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Editar cadeira"
        onClick={() => setEditOpen(false)}
      >
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900">Editar cadeira</h3>
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
            <div>
              <label className="text-sm font-medium text-gray-700">Descrição</label>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição (opcional)"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
      title="Arquivar cadeira"
      description="A cadeira será arquivada junto com seus itens?"
      confirmLabel="Arquivar"
      onConfirm={handleArchive}
      onClose={() => setConfirmArchive(false)}
    />
    <ConfirmDialog
      open={confirmDelete}
      title="Excluir cadeira"
      description="Esta ação não pode ser desfeita. Itens vinculados também serão removidos."
      confirmLabel="Excluir"
      onConfirm={handleDelete}
      onClose={() => setConfirmDelete(false)}
    />
  </div>
}
