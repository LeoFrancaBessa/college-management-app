import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../api/client', () => ({
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
    const q = sp.toString()
    return q ? `?${q}` : ''
  },
}))

import { apiFetch } from '../api/client'
import ItemDetail from './ItemDetail'

const mockApiFetch = vi.mocked(apiFetch)

// mutable state so PATCH can update it
let mockItem: any

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function renderAtItemId(id = 1) {
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/itens/${id}`]}>
        <Routes>
          <Route path="/itens/:itemId" element={<ItemDetail />} />
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/cadeiras/:id" element={<div>Cadeira</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItem = {
    id: 1,
    course_id: 10,
    parent_id: null,
    item_type_id: 1,
    title: 'Item Teste',
    due_date: null,
    status: 'active',
    board_column_id: null,
    board_id: null,
    features: {},
    tags: [],
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    item_type: { id: 1, name: 'Prova' },
    board: null,
  }

  mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    // GET item
    if (path === '/api/v1/items/1' && method === 'GET') return { ...mockItem }
    if (path.startsWith('/api/v1/courses/10') && method === 'GET') return { id: 10, period_id: 5, name: 'Cadeira 10', description: null, status: 'active', board_id: 1, created_at: '' }
    if (path.startsWith('/api/v1/periods/5') && method === 'GET') return { id: 5, name: '2026.1', status: 'active', created_at: '' }
    if (path === '/api/v1/item-types' && method === 'GET') return [{ id: 1, name: 'Prova' }]
    if (path === '/api/v1/tags' && method === 'GET') return []
    if (path.includes('/api/v1/items') && path.includes('parent_id=1') && method === 'GET') return []
    // course/period fallback for any id 0
    if (path.startsWith('/api/v1/courses/0') || path.startsWith('/api/v1/periods/0')) throw Object.assign(new Error('Not found'), { status: 404 })
    // PATCH item — the core of the test
    if (path === '/api/v1/items/1' && method === 'PATCH') {
      const body = JSON.parse((init?.body as string) ?? '{}')
      if (body.features?.grade) {
        const g = body.features.grade
        if (g.score > g.max_score) {
          const { ApiError } = await import('../api/client')
          throw new (ApiError as any)(400, 'score não pode ser maior que max_score', { score: 'score não pode ser maior que max_score' })
        }
      }
      // simulate merge
      if (body.features !== undefined) mockItem.features = body.features
      if (body.title !== undefined) mockItem.title = body.title
      return { ...mockItem }
    }
    if (path === '/api/v1/items/1/board' && method === 'POST') {
      mockItem.board_id = 99
      mockItem.board = { id: 99, layout: 'kanban', columns: [] }
      return mockItem.board
    }
    // default
    return [] as any
  })
})

describe('ItemDetail — features Nota', () => {
  test('toggle Nota on, 400 score>max mostra erro inline, toggle off remove feature', async () => {
    renderAtItemId(1)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Item Teste' })).toBeInTheDocument())

    // find the Nota section checkbox (first "Ativar" checkbox)
    const checkboxes = screen.getAllByRole('checkbox')
    // Nota is first FeatureSection
    const notaCheckbox = checkboxes[0]
    expect(notaCheckbox).not.toBeChecked()

    // toggle on — triggers PATCH with grade default
    fireEvent.click(notaCheckbox)
    await waitFor(() => expect(screen.getByText(/Salvar nota/i)).toBeInTheDocument())

    // fill invalid score > max_score
    const scoreInput = screen.getByPlaceholderText('ex: 8.5')
    const maxInput = screen.getByPlaceholderText('10')
    fireEvent.change(scoreInput, { target: { value: '11' } })
    fireEvent.change(maxInput, { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: /Salvar nota/i }))

    await waitFor(() => expect(screen.getAllByText(/score não pode ser maior/i).length).toBeGreaterThan(0))

    // fix and save should clear error
    fireEvent.change(scoreInput, { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar nota/i }))
    await waitFor(() => expect(screen.queryByText(/score não pode ser maior/i)).not.toBeInTheDocument())

    // toggle off — Nota checkbox again
    fireEvent.click(notaCheckbox)
    await waitFor(() => expect(screen.queryByText(/Salvar nota/i)).not.toBeInTheDocument())
  })

  test('toggle Checklist on/off', async () => {
    renderAtItemId(1)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Item Teste' })).toBeInTheDocument())
    const checkboxes = screen.getAllByRole('checkbox')
    const checklistCheckbox = checkboxes[1]
    fireEvent.click(checklistCheckbox)
    await waitFor(() => expect(screen.getByPlaceholderText(/Novo item/i)).toBeInTheDocument())
    fireEvent.click(checklistCheckbox)
    await waitFor(() => expect(screen.queryByPlaceholderText(/Novo item/i)).not.toBeInTheDocument())
  })
})
