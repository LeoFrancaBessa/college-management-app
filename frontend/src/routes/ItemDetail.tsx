import { Link, useParams } from 'react-router-dom'
import { useItem } from '../api/items'
import { useCourse } from '../api/courses'
import { usePeriod } from '../api/periods'
import { Card } from '../components/ui/Card'
import { SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { fmtDate } from '../lib/formatDate'
import { ApiError } from '../api/client'

export default function ItemDetail() {
  const { itemId } = useParams()
  const id = Number(itemId)
  const valid = Number.isFinite(id) && id > 0
  const { data: item, isLoading, error } = useItem(valid ? id : 0)
  const courseId = item?.course_id
  const { data: course } = useCourse(courseId ?? 0)
  const periodId = course?.period_id
  const { data: period } = usePeriod(periodId ?? 0)

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
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">{item.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {item.item_type && <Badge active>{item.item_type.name}</Badge>}
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{item.status}</span>
              {item.tags?.map((t) => (
                <span key={t.id} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600" style={t.color ? { backgroundColor: t.color + '22', color: t.color } : undefined}>{t.name}</span>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">Entrega: {fmtDate(item.due_date)}</p>
          </div>
        </div>
        {item.parent_id != null && <p className="text-xs text-gray-500 mt-2">Filho de #{item.parent_id} — <Link to={`/itens/${item.parent_id}`} className="text-primary hover:underline">ver pai</Link></p>}
      </Card>

      {/* Placeholders for feature sections — Task 6 will fill (grade, checklist, notes, recurrence, attachments, board) */}
      <Card>
        <h2 className="font-medium text-gray-900">Nota</h2>
        <p className="text-sm text-gray-500 mt-1">Em breve — grade (score/max/weight) via features.grade</p>
      </Card>
      <Card>
        <h2 className="font-medium text-gray-900">Checklist</h2>
        <p className="text-sm text-gray-500 mt-1">Em breve — checklist via features.checklist</p>
      </Card>
      <Card>
        <h2 className="font-medium text-gray-900">Anotações</h2>
        <p className="text-sm text-gray-500 mt-1">Em breve — notes via features.notes</p>
      </Card>
      <Card>
        <h2 className="font-medium text-gray-900">Recorrência</h2>
        <p className="text-sm text-gray-500 mt-1">Em breve — recurrence via features.recurrence (cronograma é view)</p>
      </Card>
      <Card>
        <h2 className="font-medium text-gray-900">Anexos & Board</h2>
        <p className="text-sm text-gray-500 mt-1">Em breve — attachments e board</p>
      </Card>
    </div>
  )
}
