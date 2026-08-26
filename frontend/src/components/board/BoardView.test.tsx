import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../api/client', () => ({
  BASE: '',
  ApiError: class ApiError extends Error {
    status: number
    detail: string
    fields?: Record<string, string>
    constructor(status: number, detail: string, fields?: Record<string, string>) {
      super(detail)
      this.name = 'ApiError'
      this.status = status
      this.detail = detail
      this.fields = fields
    }
  },
  apiFetch: vi.fn(),
  buildQuery: (params: Record<string, unknown>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
    return sp.toString() ? `?${sp.toString()}` : ''
  },
}))

import { apiFetch } from '../../api/client'
import BoardView from './BoardView'

const mockApiFetch = vi.mocked(apiFetch)

// mutable fixtures
let mockBoard: any
let mockItems: any[]

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function renderBoard(boardId = 1) {
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BoardView boardId={boardId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockBoard = {
    id: 1,
    course_id: 10,
    item_id: null,
    layout: 'kanban',
    columns: [
      { id: 10, board_id: 1, name: 'A fazer', position: 0 },
      { id: 11, board_id: 1, name: 'Feito', position: 1 },
    ],
  }
  mockItems = [
    { id: 101, course_id: 10, item_type_id: 1, title: 'Tarefa 1', due_date: null, status: 'active', board_column_id: 10, features: {}, tags: [], created_at: '', updated_at: '', item_type: { id: 1, name: 'Prova' } },
    { id: 102, course_id: 10, item_type_id: 1, title: 'Tarefa 2', due_date: null, status: 'active', board_column_id: 11, features: {}, tags: [], created_at: '', updated_at: '', item_type: { id: 1, name: 'Prova' } },
  ]

  mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    if (path === '/api/v1/boards/1' && method === 'GET') return { ...mockBoard, columns: [...mockBoard.columns] } as any
    if (path.startsWith('/api/v1/items') && method === 'GET') {
      // useItems with course_id=10
      return [...mockItems] as any
    }
    if (path.startsWith('/api/v1/items/') && path.endsWith('/board-column') && method === 'PUT') {
      const id = Number(path.split('/')[4])
      const body = JSON.parse((init?.body as string) ?? '{}')
      const item = mockItems.find((x) => x.id === id)
      if (item) item.board_column_id = body.board_column_id
      return { ...item } as any
    }
    if (path === '/api/v1/boards/1/columns' && method === 'POST') {
      const body = JSON.parse((init?.body as string) ?? '{}')
      const col = { id: 99, board_id: 1, name: body.name, position: mockBoard.columns.length }
      mockBoard.columns.push(col)
      return col as any
    }
    if (path.startsWith('/api/v1/boards/1/columns/') && method === 'PATCH') {
      const id = Number(path.split('/')[5])
      const body = JSON.parse((init?.body as string) ?? '{}')
      const col = mockBoard.columns.find((c: any) => c.id === id)
      if (col && body.name) col.name = body.name
      return col as any
    }
    if (path.startsWith('/api/v1/boards/1/columns/') && method === 'DELETE') {
      const id = Number(path.split('/')[5])
      if (mockBoard.columns.length <= 1) {
        const { ApiError } = await import('../../api/client')
        throw new (ApiError as any)(400, 'não é permitido remover a última coluna')
      }
      mockBoard.columns = mockBoard.columns.filter((c: any) => c.id !== id)
      return undefined as any
    }
    if (path === '/api/v1/boards/1' && method === 'PATCH') return { ...mockBoard } as any
    return [] as any
  })
})

describe('BoardView', () => {
  test('renderiza colunas e itens', async () => {
    renderBoard(1)
    await waitFor(() => expect(screen.getByText('A fazer')).toBeInTheDocument())
    expect(screen.getByText('Feito')).toBeInTheDocument()
    expect(screen.getByText('Tarefa 1')).toBeInTheDocument()
    expect(screen.getByText('Tarefa 2')).toBeInTheDocument()
  })

  test('modo coarse: select Mover para... chama PUT board-column', async () => {
    // force coarse
    const origMM = window.matchMedia
    ;(window as any).matchMedia = (q: string) => ({
      matches: q === '(pointer: coarse)',
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })

    renderBoard(1)
    await waitFor(() => expect(screen.getByText('Tarefa 1')).toBeInTheDocument())
    // wait for coarse layout to settle (select appears after isCoarse effect)
    await waitFor(() => expect(screen.queryAllByText(/Mover para/i).length).toBeGreaterThan(0))

    const comboboxes = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(comboboxes.length).toBeGreaterThan(0)
    // Tarefa 1 is in col 10; move to 11 — find the select whose value is "10"
    const select = comboboxes.find((s) => s.value === '10') ?? comboboxes[0]
    fireEvent.change(select, { target: { value: '11' } })

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('101/board-column'), expect.objectContaining({ method: 'PUT' })),
    )
    expect(mockItems.find((x) => x.id === 101)?.board_column_id).toBe(11)

    ;(window as any).matchMedia = origMM
  })

  test('remover última coluna mostra erro inline', async () => {
    // single column board
    mockBoard.columns = [{ id: 10, board_id: 1, name: 'Única', position: 0 }]
    mockItems = [{ id: 101, course_id: 10, item_type_id: 1, title: 'Tarefa 1', due_date: null, status: 'active', board_column_id: 10, features: {}, tags: [], created_at: '', updated_at: '', item_type: { id: 1, name: 'Prova' } }]

    renderBoard(1)
    await waitFor(() => expect(screen.getByText('Única')).toBeInTheDocument())

    const btnExcluir = screen.getByRole('button', { name: 'Excluir' })
    fireEvent.click(btnExcluir)
    const dialog = await screen.findByRole('dialog')
    const { within } = await import('@testing-library/react')
    const confirmBtn = within(dialog).getByRole('button', { name: 'Excluir' })
    fireEvent.click(confirmBtn)

    await waitFor(() => expect(screen.getByText(/não é permitido remover a última coluna/i)).toBeInTheDocument())
  })
})
