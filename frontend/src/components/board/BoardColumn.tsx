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
  const [actionsOpen, setActionsOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(column.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const upd = useUpdateColumn(boardId)
  const del = useDeleteColumn(boardId)
  const columnIndex = allColumns.findIndex((c) => c.id === column.id)

  const handleRename = async () => {
    setError('')
    if (!nameDraft.trim()) { setError('Nome é obrigatório'); return }
    try {
      await upd.mutateAsync({ columnId: column.id, name: nameDraft.trim() })
      setEditing(false)
      setActionsOpen(false)
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
    if (columnIndex <= 0 || allColumns[columnIndex - 1]?.is_system) return
    const prev = allColumns[columnIndex - 1]
    try {
      await upd.mutateAsync({ columnId: column.id, position: prev.position })
      await upd.mutateAsync({ columnId: prev.id, position: column.position })
    } catch {
      // toast handled via error state or ignored
    }
  }

  const handleMoveRight = async () => {
    if (columnIndex < 0 || columnIndex >= allColumns.length - 1) return
    const next = allColumns[columnIndex + 1]
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
      <div className="flex items-center gap-1">
        <h3 className="font-medium text-gray-900 text-sm truncate flex-1">{column.name}</h3>
        <span className="text-xs text-gray-500">{items.length}</span>
        {!column.is_system && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleMoveLeft} disabled={columnIndex <= 0 || allColumns[columnIndex - 1]?.is_system} aria-label="Mover coluna para a esquerda" className="min-h-[36px] min-w-[36px] rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40">←</button>
            <button type="button" onClick={handleMoveRight} disabled={allColumns[allColumns.length - 1]?.id === column.id} aria-label="Mover coluna para a direita" className="min-h-[36px] min-w-[36px] rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40">→</button>
            <button type="button" onClick={() => setActionsOpen(true)} aria-label="Ações da coluna" className="min-h-[36px] min-w-[36px] rounded-lg border border-gray-200 hover:bg-white text-lg leading-none">•••</button>
          </div>
        )}
      </div>
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
      {actionsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="presentation" onClick={() => { setActionsOpen(false); setEditing(false); setNameDraft(column.name) }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg" role="dialog" aria-modal="true" aria-label={`Ações da coluna ${column.name}`} onClick={(event) => event.stopPropagation()}>
            {editing ? (
              <>
                <h3 className="font-semibold text-gray-900">Renomear coluna</h3>
                <label className="block mt-4 text-sm font-medium text-gray-700">
                  Nome
                  <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
                </label>
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                <div className="flex justify-end gap-2 mt-5">
                  <Button variant="ghost" onClick={() => { setEditing(false); setNameDraft(column.name); setError('') }}>Cancelar</Button>
                  <Button onClick={handleRename} disabled={upd.isPending}>Salvar</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900">Ações da coluna</h3>
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => setEditing(true)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg min-h-[44px]">Renomear</button>
                  <button type="button" onClick={() => { setActionsOpen(false); setConfirmDelete(true) }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg min-h-[44px]">Excluir</button>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="ghost" onClick={() => setActionsOpen(false)}>Fechar</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
