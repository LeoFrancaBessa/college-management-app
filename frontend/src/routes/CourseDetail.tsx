import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton, SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Badge } from '../components/ui/Badge'
import { useCourse } from '../api/courses'
import { useItems, useCreateItem, useUpdateItem, useArchiveItem, useDeleteItem, useMoveItem, useSetBoardColumn } from '../api/items'
import { useItemTypes } from '../api/itemTypes'
import { fmtDate } from '../lib/formatDate'
import { ApiError } from '../api/client'

function ChildrenRow({ parentId }: { parentId: number }) {
  const { data: children, isLoading } = useItems({ parent_id: parentId })
  if (isLoading) return <div className="pl-6 py-2"><Skeleton className="h-4 w-32" /></div>
  if (!children?.length) return null
  return (
    <div className="pl-6 mt-2 space-y-2 border-l-2 border-gray-100 ml-2">
      {children.map((ch) => (
        <div key={ch.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate">{ch.title}</span>
            <span className="text-xs text-gray-500 ml-2">{ch.item_type?.name ?? ''}</span>
            {ch.due_date && <span className="text-xs text-gray-500 ml-2">{fmtDate(ch.due_date)}</span>}
          </div>
          <Link to={`/itens/${ch.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2">ver detalhes</Link>
        </div>
      ))}
    </div>
  )
}

function ItemRow({ item, allItems }: { item: import('../api/types').Item; allItems: import('../api/types').Item[] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editDateOpen, setEditDateOpen] = useState(false)
  const [dateDraft, setDateDraft] = useState(item.due_date ? item.due_date.slice(0, 10) : '')
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveParentId, setMoveParentId] = useState<string>('')
  const [moveError, setMoveError] = useState('')
  const [boardColDraft, setBoardColDraft] = useState(item.board_column_id ? String(item.board_column_id) : '')
  const [boardColError, setBoardColError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const update = useUpdateItem(item.id)
  const move = useMoveItem(item.id)
  const setCol = useSetBoardColumn(item.id)
  const archive = useArchiveItem()
  const del = useDeleteItem()

  const handleSaveDate = async () => {
    try {
      await update.mutateAsync({ due_date: dateDraft ? new Date(dateDraft).toISOString() : null } as any)
      setEditDateOpen(false)
    } catch {
      // validation errors surfaced via toast or inline; keep open
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

  const handleSetColumn = async () => {
    setBoardColError('')
    const cid = boardColDraft.trim() === '' ? null : Number(boardColDraft)
    if (boardColDraft.trim() !== '' && (cid == null || Number.isNaN(cid))) { setBoardColError('ID inválido'); return }
    try {
      // PUT /board-column with {board_column_id}; passing null clears — but API requires number per brief; allow clearing via null cast
      await setCol.mutateAsync({ board_column_id: cid } as any)
      setBoardColError('')
    } catch (e: any) {
      setBoardColError(e?.detail ?? e?.message ?? 'Erro ao mover coluna')
    }
  }

  const handleArchive = async () => {
    try { await archive.mutateAsync(item.id) } catch { /* handled */ }
    setMenuOpen(false)
  }
  const handleDelete = async () => {
    try { await del.mutateAsync(item.id); setConfirmDelete(false) } catch { /* handled */ }
  }

  // candidates for "mover para..." — all other items except self
  const moveCandidates = allItems.filter((x) => x.id !== item.id)

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{item.title}</span>
            {item.item_type && <Badge>{item.item_type.name}</Badge>}
            {item.board_column_id != null && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-gray-700">col {item.board_column_id}</span>}
            {item.tags?.map((t) => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" style={t.color ? { backgroundColor: t.color + '22', color: t.color } : undefined}>{t.name}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{item.due_date ? fmtDate(item.due_date) : 'sem data'}</span>
            <button onClick={() => setExpanded((v) => !v)} className="text-xs text-gray-500 hover:text-gray-900 min-h-[44px] px-2">{expanded ? 'ocultar filhos' : 'ver filhos'}</button>
            <Link to={`/itens/${item.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2">ver detalhes</Link>
          </div>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="menu" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">•••</button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-2 space-y-1">
              {/* edit date inline */}
              {!editDateOpen ? (
                <button onClick={() => { setEditDateOpen(true); setDateDraft(item.due_date ? item.due_date.slice(0,10) : '') }} className="w-full text-left text-sm px-3 py-2 min-h-[44px] hover:bg-gray-50 rounded-lg">Editar data</button>
              ) : (
                <div className="px-2 py-1 space-y-2">
                  <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDate} disabled={update.isPending} className="flex-1">Salvar</Button>
                    <Button variant="ghost" onClick={() => setEditDateOpen(false)} className="flex-1">Cancelar</Button>
                  </div>
                </div>
              )}
              {/* move column via useSetBoardColumn */}
              <div className="px-2 py-1 space-y-1">
                <p className="text-xs font-medium text-gray-700">Mover coluna (ID)</p>
                <div className="flex gap-2">
                  <input value={boardColDraft} onChange={(e) => setBoardColDraft(e.target.value)} placeholder="col id" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <Button onClick={handleSetColumn} disabled={setCol.isPending} variant="ghost" className="shrink-0">Mover</Button>
                </div>
                {boardColError && <p className="text-xs text-red-600">{boardColError}</p>}
              </div>
              {/* mover para... parent select */}
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
      <ConfirmDialog open={confirmDelete} title="Excluir item" description="Excluir este item removerá também seus filhos (cascata). Esta ação não pode ser desfeita." confirmLabel="Excluir" onConfirm={handleDelete} onClose={() => setConfirmDelete(false)} />
    </div>
  )
}

function ListaTab({ courseId }: { courseId: number }) {
  const { data: items, isLoading, error } = useItems({ course_id: courseId })
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
        <EmptyState title="Nenhum item nesta cadeira" description="Crie o primeiro item acima." />
      ) : (
        <Card>
          {items.map((it) => <ItemRow key={it.id} item={it} allItems={items} />)}
        </Card>
      )}
    </div>
  )
}

export default function CourseDetail(){
  const {courseId}=useParams(); const [sp,setSp]=useSearchParams(); const tab=sp.get('tab')??'lista'
  const id = Number(courseId)
  const { data: course, isLoading: lc } = useCourse(Number.isFinite(id) ? id : 0)
  return <div className="space-y-4">
    <div>
      {lc ? <Skeleton className="h-6 w-40" /> : course ? (
        <div className="flex items-center gap-2">
          <Link to={`/periodos/${course.period_id}`} className="text-sm text-gray-500 hover:text-gray-900">Período #{course.period_id}</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">{course.name}</h1>
        </div>
      ) : null}
    </div>
    <Tabs value={tab} onValueChange={v=> setSp({tab:v})} tabs={[{value:'lista',label:'Lista'},{value:'board',label:'Board'},{value:'cronograma',label:'Cronograma'}]} />
    {tab==='lista' && (Number.isFinite(id) && id>0 ? <ListaTab courseId={id} /> : <EmptyState title="Cadeira não encontrada" />)}
    {tab==='board' && <div className="py-4 text-sm text-gray-500">Board — lazy next</div>}
    {tab==='cronograma' && <div className="py-4 text-sm text-gray-500">Cronograma — lazy next</div>}
  </div>
}
