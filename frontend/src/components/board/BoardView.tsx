import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { useBoard, useUpdateBoard, useCreateColumn } from '../../api/boards'
import { useItems } from '../../api/items'
import { ApiError, apiFetch } from '../../api/client'
import { useToast } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import BoardColumn from './BoardColumn'
import type { Item } from '../../api/types'

function isCoarse(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

type Props = { boardId: number }

export default function BoardView({ boardId }: Props) {
  const { data: board, isLoading: lb, error: eb } = useBoard(boardId)
  const boardItemsParams: Record<string, number> = {}
  let boardItemsEnabled = false
  if (board) {
    if (board.course_id != null) {
      boardItemsParams.course_id = board.course_id
      boardItemsEnabled = true
    } else if (board.item_id != null) {
      boardItemsParams.parent_id = board.item_id
      boardItemsEnabled = true
    }
  }
  const { data: itemsData, isLoading: li } = useItems(
    boardItemsParams as any,
    { enabled: boardItemsEnabled },
  )
  const updateBoard = useUpdateBoard(boardId)
  const createCol = useCreateColumn(boardId)
  const toast = useToast()
  const qc = useQueryClient()

  const [newColName, setNewColName] = useState('')
  const [colError, setColError] = useState('')
  const [coarse, setCoarse] = useState(false)
  const [localItems, setLocalItems] = useState<Item[]>([])

  useEffect(() => {
    setCoarse(isCoarse())
    const mql = typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)') : null
    const handler = () => setCoarse(isCoarse())
    mql?.addEventListener?.('change', handler)
    return () => mql?.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    if (itemsData) setLocalItems(itemsData)
  }, [itemsData])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  if (lb || li) return <div className="space-y-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40 w-full" /></div>
  if (eb) return <EmptyState title="Erro ao carregar board" description={(eb as any)?.detail ?? (eb as Error).message} />
  if (!board) return <EmptyState title="Board não encontrado" />

  const columns = [...(board.columns ?? [])].sort((a, b) => a.position - b.position)

  const itemsByCol = new Map<number | null, Item[]>()
  for (const col of columns) itemsByCol.set(col.id, [])
  itemsByCol.set(null, [])
  for (const it of localItems) {
    const colId = it.board_column_id ?? null
    if (colId !== null && !itemsByCol.has(colId)) {
      // column deleted or not in this board — treat as unassigned
      itemsByCol.get(null)!.push(it)
    } else {
      if (!itemsByCol.has(colId)) itemsByCol.set(colId, [])
      itemsByCol.get(colId)!.push(it)
    }
  }

  const unassigned = itemsByCol.get(null) ?? []

  const handleCreateColumn = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setColError('')
    if (!newColName.trim()) { setColError('Nome é obrigatório'); return }
    try {
      await createCol.mutateAsync({ name: newColName.trim() })
      setNewColName('')
    } catch (err: any) {
      setColError(err?.detail ?? err?.message ?? 'Erro ao criar coluna')
    }
  }

  const handleLayoutChange = async (layout: 'kanban' | 'sprint' | 'lista') => {
    try {
      const apiLayout = layout === 'lista' ? 'list' : layout
      await updateBoard.mutateAsync({ layout: apiLayout } as any)
    } catch (err: any) {
      toast(err?.detail ?? err?.message ?? 'Erro ao alterar layout', 'error')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)
    if (activeIdStr === overIdStr) return

    const activeItemId = Number(activeIdStr)
    if (!Number.isFinite(activeItemId)) return

    let destColumnId: number | null = null
    if (overIdStr.startsWith('col-')) {
      destColumnId = Number(overIdStr.slice(4))
    } else {
      const overItemId = Number(overIdStr)
      if (Number.isFinite(overItemId)) {
        const overItem = localItems.find((x) => x.id === overItemId)
        if (overItem) {
          destColumnId = overItem.board_column_id ?? null
          if (destColumnId == null) {
            // over item might be unassigned; try to find its column via bucket
            for (const col of columns) {
              const bucket = itemsByCol.get(col.id) ?? []
              if (bucket.some((x) => x.id === overItemId)) {
                destColumnId = col.id
                break
              }
            }
          }
        } else {
          for (const col of columns) {
            const bucket = itemsByCol.get(col.id) ?? []
            if (bucket.some((x) => String(x.id) === overIdStr)) {
              destColumnId = col.id
              break
            }
          }
        }
      }
    }
    if (destColumnId == null || !Number.isFinite(destColumnId)) return

    const prevItems = [...localItems]
    setLocalItems((curr) => curr.map((it) => (it.id === activeItemId ? { ...it, board_column_id: destColumnId } : it)))
    try {
      await apiFetch(`/api/v1/items/${activeItemId}/board-column`, { method: 'PUT', body: JSON.stringify({ board_column_id: destColumnId }) })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['boards'] })
    } catch (err: any) {
      setLocalItems(prevItems)
      const msg = err instanceof ApiError ? err.detail : err?.detail ?? err?.message ?? 'Erro ao mover'
      toast(msg, 'error')
    }
  }

  const rawLayout = board.layout as string
  const layout: 'kanban' | 'sprint' | 'lista' = rawLayout === 'list' ? 'lista' : (rawLayout as any)
  const isLista = layout === 'lista'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Layout</label>
          <select
            value={layout}
            onChange={(e) => handleLayoutChange(e.target.value as any)}
            disabled={updateBoard.isPending}
            className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
          >
            <option value="kanban">kanban</option>
            <option value="sprint">sprint</option>
            <option value="lista">lista</option>
          </select>
        </div>
        <form onSubmit={handleCreateColumn} className="flex items-center gap-2 flex-1 sm:flex-none">
          <input
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Nova coluna"
            className="flex-1 sm:w-48 border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <Button type="submit" disabled={createCol.isPending} className="shrink-0">Add column</Button>
        </form>
      </div>
      {colError && <p className="text-sm text-red-600">{colError}</p>}

      {columns.length === 0 ? (
        <Card><EmptyState title="Nenhuma coluna" description="Crie a primeira coluna acima." /></Card>
      ) : coarse ? (
        <div className={isLista ? 'flex flex-col gap-4' : 'flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-4'}>
          {columns.map((col) => (
            <BoardColumn key={col.id} column={col} items={itemsByCol.get(col.id) ?? []} boardId={boardId} allColumns={columns} isCoarse={true} />
          ))}
          {unassigned.length > 0 && (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-3">
              <h3 className="font-medium text-gray-700 text-sm mb-2">Sem coluna ({unassigned.length})</h3>
              <div className="space-y-2">
                {unassigned.map((it) => (
                  <div key={it.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{it.title}</p>
                      <p className="text-xs text-gray-500">{it.due_date ? new Date(it.due_date).toLocaleDateString('pt-BR') : 'sem data'}</p>
                    </div>
                    <Link to={`/itens/${it.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2">ver</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className={isLista ? 'flex flex-col gap-4' : 'flex gap-4 overflow-x-auto pb-2 snap-x'}>
            {columns.map((col) => (
              <div key={col.id} className={isLista ? 'w-full' : 'min-w-[280px] w-[320px] shrink-0 snap-start'}>
                <BoardColumn column={col} items={itemsByCol.get(col.id) ?? []} boardId={boardId} allColumns={columns} isCoarse={false} />
              </div>
            ))}
          </div>
          {unassigned.length > 0 && (
            <Card>
              <h3 className="font-medium text-gray-900 text-sm mb-2">Sem coluna ({unassigned.length})</h3>
              <p className="text-xs text-gray-500 mb-2">Itens sem coluna — use o seletor “Mover para...” no cartão</p>
              <div className="grid gap-2">
                {unassigned.map((it) => (
                  <Link key={it.id} to={`/itens/${it.id}`} className="block bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-white">
                    <p className="text-sm font-medium text-gray-900 truncate">{it.title}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </DndContext>
      )}
    </div>
  )
}
