import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

type Props = {
  events: { id: string; title: string; start: string }[]
  onEventClick: (id: string) => void
  onDateClick: (dateStr: string) => void
}

const STORAGE_KEY = 'schedule.view'

function getInitialView(): string {
  if (typeof window === 'undefined') return 'dayGridMonth'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch {
    // ignore
  }
  return window.innerWidth < 1024 ? 'timeGridWeek' : 'dayGridMonth'
}

export function ScheduleCalendar({ events, onEventClick, onDateClick }: Props) {
  const [initialView] = useState<string>(() => getInitialView())

  const persistView = (viewType: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, viewType)
    } catch {
      // ignore
    }
  }

  // @fullcalendar/react 7.x types mismatch the installed 6.x plugins
  // (PremiumReleaseDate: Date vs string) and the prop shape changed slightly
  // between major versions. Cast to `any` so tsc checks app code only.
  const FC: any = FullCalendar

  return (
    <FC
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView={initialView}
      timeZone="UTC"
      events={events}
      eventClick={(a: any) => onEventClick(a.event.id)}
      dateClick={(a: any) => onDateClick(a.dateStr)}
      viewDidMount={(arg: any) => persistView(arg.view.type)}
      datesSet={(arg: any) => persistView(arg.view.type)}
      height="auto"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek',
      }}
      buttonText={{
        today: 'hoje',
        month: 'mês',
        week: 'semana',
      }}
      locale="pt-br"
    />
  )
}

export default ScheduleCalendar
