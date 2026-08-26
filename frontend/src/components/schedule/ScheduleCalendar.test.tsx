import { render, screen, fireEvent } from '@testing-library/react'

// Mock FullCalendar — we don't need its DOM, just to capture props
vi.mock('@fullcalendar/react', () => ({
  default: (props: any) => (
    <div data-testid="fc-mock">
      <span data-testid="fc-view">{props.initialView}</span>
      {props.events?.map((e: any) => (
        <button key={e.id} data-testid={`event-${e.id}`} onClick={() => props.eventClick({ event: { id: e.id } })}>
          {e.title}
        </button>
      ))}
      <button data-testid="date-btn" onClick={() => props.dateClick({ dateStr: '2026-08-27' })}>
        date
      </button>
      <button data-testid="persist-view" onClick={() => props.viewDidMount?.({ view: { type: 'timeGridWeek' } })}>
        persist
      </button>
    </div>
  ),
}))

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }))
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }))
vi.mock('@fullcalendar/list', () => ({ default: {} }))
vi.mock('@fullcalendar/interaction', () => ({ default: {} }))

import ScheduleCalendar from './ScheduleCalendar'

describe('ScheduleCalendar', () => {
  test('renderiza eventos e dispara onEventClick com id', async () => {
    const onEventClick = vi.fn()
    const onDateClick = vi.fn()
    render(
      <ScheduleCalendar
        events={[
          { id: '10', title: 'Prova Cálculo', start: '2026-08-27T10:00:00.000Z' },
          { id: '11', title: 'Entrega TCC', start: '2026-08-28T10:00:00.000Z' },
        ]}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
      />,
    )
    expect(screen.getByTestId('event-10')).toBeInTheDocument()
    expect(screen.getByTestId('event-11')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('event-10'))
    expect(onEventClick).toHaveBeenCalledWith('10')

    fireEvent.click(screen.getByTestId('date-btn'))
    expect(onDateClick).toHaveBeenCalledWith('2026-08-27')
  })

  test('usa view inicial listWeek em mobile e persiste escolha em localStorage', () => {
    // simulate mobile width
    const origInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    window.localStorage.clear()

    const onEventClick = vi.fn()
    const onDateClick = vi.fn()
    render(<ScheduleCalendar events={[]} onEventClick={onEventClick} onDateClick={onDateClick} />)
    expect(screen.getByTestId('fc-view').textContent).toBe('listWeek')

    // persist view change
    fireEvent.click(screen.getByTestId('persist-view'))
    expect(window.localStorage.getItem('schedule.view')).toBe('timeGridWeek')

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: origInnerWidth })
  })
})
