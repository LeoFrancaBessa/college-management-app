import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/formatDate'
import type { Item, BoardColumn } from '../../api/types'
import { useSetBoardColumn } from '../../api/items'
import { ApiError } from '../../api/client'
import { useToast } from '../ui/Toast'

type Props = {
  item: Item
  columns: BoardColumn[]
  isCoarse: boolean
  onMoved?: () => void
}

export default function ItemCard({ item, columns, isCoarse }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.id),
    disabled: isCoarse,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const toast = useToast()
  const setCol = useSetBoardColumn(item.id)

  const handleSelectMove = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '') return
    const destId = Number(val)
    if (Number.isNaN(destId)) return
    try {
      await setCol.mutateAsync({ board_column_id: destId } as any)
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.detail ?? err?.message ?? 'Erro ao mover'
      toast(msg, 'error')
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isCoarse ? {} : attributes)}
      {...(isCoarse ? {} : listeners)}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${isCoarse ? '' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
          <p className="text-xs text-gray-500 mt-1">{item.due_date ? fmtDate(item.due_date) : 'sem data'}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {item.item_type && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.item_type.name}</span>}
            {item.tags?.map((t) => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" style={t.color ? { backgroundColor: t.color + '22', color: t.color } : undefined}>{t.name}</span>
            ))}
          </div>
        </div>
        <Link to={`/itens/${item.id}`} className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2 shrink-0">ver</Link>
      </div>
      {isCoarse && columns.length > 0 && (
        <div className="mt-3">
          <label className="text-xs font-medium text-gray-700">Mover para...</label>
          <select
            value={item.board_column_id ? String(item.board_column_id) : ''}
            onChange={handleSelectMove}
            disabled={setCol.isPending}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
          >
            <option value="">Selecione coluna</option>
            {columns.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
