import { useState, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSchedule } from '../api/schedule'
import { useCourses } from '../api/courses'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const ScheduleCalendar = lazy(() => import('../components/schedule/ScheduleCalendar'))

const LIMIT = 50

export default function SchedulePage() {
  const [courseId, setCourseId] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const navigate = useNavigate()
  const { data: courses } = useCourses()

  const queryParams = useMemo(() => {
    const p: { course_id?: number; limit?: number; offset?: number } = { limit: LIMIT, offset }
    const cid = courseId ? Number(courseId) : undefined
    if (cid && Number.isFinite(cid)) p.course_id = cid
    return p
  }, [courseId, offset])

  const { data, isLoading, error, isFetching } = useSchedule(queryParams)

  const events = useMemo(() => {
    if (!data) return []
    return data.map((item) => ({
      id: String(item.id),
      title: item.title,
      start: item.due_date,
    }))
  }, [data])

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCourseId(e.target.value)
    setOffset(0)
  }

  const handleLoadMore = () => setOffset((o) => o + LIMIT)
  const canLoadMore = data !== undefined && data.length >= LIMIT

  const handleEventClick = (id: string) => navigate(`/itens/${id}`)
  const handleDateClick = (_dateStr: string) => {
    // no-op for MVP — could open create flow
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Cronograma</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Cadeira</label>
          <select
            value={courseId}
            onChange={handleCourseChange}
            className="border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
          >
            <option value="">Todas</option>
            {courses?.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <EmptyState title="Erro ao carregar cronograma" description={(error as any)?.detail ?? (error as Error).message} />
      ) : (
        <>
          {events.length === 0 && offset === 0 ? (
            <Card><EmptyState title="Nenhum item no cronograma" description="Itens com data de entrega aparecerão aqui." /></Card>
          ) : (
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <Card>
                <ScheduleCalendar events={events} onEventClick={handleEventClick} onDateClick={handleDateClick} />
              </Card>
            </Suspense>
          )}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={handleLoadMore}
              disabled={!canLoadMore || isFetching}
              className="min-h-[44px]"
            >
              {isFetching ? 'Carregando...' : canLoadMore ? 'Carregar mais' : offset > 0 ? 'Fim' : ''}
            </Button>
          </div>
          {canLoadMore && <p className="text-xs text-gray-500 text-center">Mostrando {offset + (data?.length ?? 0)} itens — clique para carregar mais</p>}
        </>
      )}
    </div>
  )
}
