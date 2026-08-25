import { useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import type { BoardColumn as BoardColumnType, Item } from '../../api/types'
import ItemCard from './ItemCard'
import { useUpdateColumn, useDeleteColumn } from '../../api/boards'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'

type Props = {
  column: BoardColumnType
  items: Item[]
  boardId: number
  allColumns: BoardColumnType[]
  isCoarse: boolean
}

export default function BoardColumn({ column, items, boardId, allColumns, isCoarse }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` })
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(column.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const upd = useUpdateColumn(boardId)
  const del = useDeleteColumn(boardId)

  const handleRename = async () => {
    setError('')
    if (!nameDraft.trim()) { setError('Nome é obrigatório'); return }
    try {
      await upd.mutateAsync({ columnId: column.id, name: nameDraft.trim() })
      setEditing(false)
    } catch (e: any) {
      setError(e?.detail ?? e?.message ?? 'Erro ao renomear')
    }
  }

  const handleDelete = async () => {
    try {
      await del.mutateAsync(column.id)
      setConfirmDelete(false)
    } catch (e: any) {
      setError(e?.detail ?? e?.message ?? 'Erro ao excluir')
    }
  }

  const handleMoveLeft = async () => {
    const idx = allColumns.findIndex((c) => c.id === column.id)
    if (idx <= 0) return
    const prev = allColumns[idx - 1]
    try {
      await upd.mutateAsync({ columnId: column.id, position: prev.position })
      await upd.mutateAsync({ columnId: prev.id, position: column.position })
    } catch {
      // toast handled via error state or ignored
    }
  }

  const handleMoveRight = async () => {
    const idx = allColumns.findIndex((c) => c.id === column.id)
    if (idx < 0 || idx >= allColumns.length - 1) return
    const next = allColumns[idx + 1]
    try {
      await upd.mutateAsync({ columnId: column.id, position: next.position })
      await upd.mutateAsync({ columnId: next.id, position: column.position })
    } catch {
      // ignore
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 border rounded-xl p-3 flex flex-col gap-3 min-h-[200px] ${isOver ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              autoFocus
            />
            <Button onClick={handleRename} disabled={upd.isPending} className="shrink-0 text-xs">Salvar</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setNameDraft(column.name) }} className="shrink-0 text-xs">Cancelar</Button>
          </div>
        ) : (
          <>
            <h3 className="font-medium text-gray-900 text-sm truncate flex-1">{column.name}</h3>
            <span className="text-xs text-gray-500">{items.length}</span>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-white min-h-[44px]">Renomear</button>
          <button onClick={handleMoveLeft} disabled={allColumns[0]?.id === column.id} className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-white min-h-[44px] disabled:opacity-40">←</button>
          <button onClick={handleMoveRight} disabled={allColumns[allColumns.length - 1]?.id === column.id} className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-white min-h-[44px] disabled:opacity-40">→</button>
          <button onClick={() => setConfirmDelete(true)} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 min-h-[44px]">Excluir</button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <SortableContext id={`colctx-${column.id}`} items={items.map((it) => String(it.id))} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Arraste itens para cá</p>
          ) : (
            items.map((it) => <ItemCard key={it.id} item={it} columns={allColumns} isCoarse={isCoarse} />)
          )}
        </div>
      </SortableContext>
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir coluna"
        description="Excluir esta coluna removerá a coluna. Itens nela ficarão sem coluna (não serão excluídos). Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
