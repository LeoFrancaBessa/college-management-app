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
  buildQuery: () => '',
}))

import { apiFetch } from '../../api/client'
import { CommandPalette } from './CommandPalette'

const mockApiFetch = vi.mocked(apiFetch)

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function renderPalette(props: { open: boolean; onClose?: () => void } = { open: true }) {
  const qc = makeQC()
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CommandPalette open={props.open} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, qc, onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CommandPalette — RF-36', () => {
  test('mostra mensagem "não entendi" sem criar invalidacao quando understood:false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      understood: false,
      message: 'não entendi, pode explicar melhor?',
    })
    const { qc } = renderPalette()
    const spyInvalidate = vi.spyOn(qc, 'invalidateQueries')

    const input = screen.getByPlaceholderText(/linguagem natural/i)
    fireEvent.change(input, { target: { value: 'coisa vaga' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))

    await waitFor(() => expect(screen.getByText(/não entendi/i)).toBeInTheDocument())
    expect(screen.getByText(/Mantivemos seu texto/i)).toBeInTheDocument()
    // RF-36: não deve invalidar queries quando não entendeu
    expect(spyInvalidate).not.toHaveBeenCalled()
    // texto permanece para refinamento
    expect(input).toHaveValue('coisa vaga')
  })

  test('quando understood:true exibe itens criados com links e invalida queries', async () => {
    mockApiFetch.mockResolvedValueOnce({
      understood: true,
      message: 'Criado com sucesso',
      created_items: [{ id: 42, title: 'Prova de Cálculo 3' } as any],
      updated_items: [],
      deleted_item_ids: [],
    })
    const { qc } = renderPalette()
    const spyInvalidate = vi.spyOn(qc, 'invalidateQueries')

    fireEvent.change(screen.getByPlaceholderText(/linguagem natural/i), { target: { value: 'Prova de Cálculo 3 dia 27/08' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))

    await waitFor(() => expect(screen.getByText(/Criado com sucesso/i)).toBeInTheDocument())
    expect(screen.getByText('Prova de Cálculo 3')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /criado/i })
    expect(link.getAttribute('href')).toBe('/itens/42')
    // deve ter invalidado as chaves relevantes
    expect(spyInvalidate).toHaveBeenCalled()
    const calledKeys = spyInvalidate.mock.calls.map((c) => (c[0] as any)?.queryKey?.[0])
    expect(calledKeys).toEqual(expect.arrayContaining(['items', 'schedule', 'homepage', 'trash']))
  })

  test('trashed items mostram link para lixeira', async () => {
    mockApiFetch.mockResolvedValueOnce({
      understood: true,
      message: 'Itens movidos para lixeira',
      created_items: [],
      updated_items: [],
      deleted_item_ids: [7, 8],
    })
    renderPalette()
    fireEvent.change(screen.getByPlaceholderText(/linguagem natural/i), { target: { value: 'apague prova' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))
    await waitFor(() => expect(screen.getByText(/2 item\(ns\) movido\(s\) para a lixeira/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Ver lixeira/i }).getAttribute('href')).toBe('/lixeira')
  })

  test('erro de rede exibe mensagem e botão Tentar novamente que refaz request', async () => {
    const { ApiError } = await import('../../api/client')
    mockApiFetch
      .mockRejectedValueOnce(new (ApiError as any)(500, 'Erro interno'))
      .mockResolvedValueOnce({ understood: true, message: 'ok', created_items: [{ id: 1, title: 'ok' } as any] })

    renderPalette()
    fireEvent.change(screen.getByPlaceholderText(/linguagem natural/i), { target: { value: 'teste erro' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))
    await waitFor(() => expect(screen.getByText(/Erro interno/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    await waitFor(() => expect(screen.getByRole('link', { name: /criado/i })).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /criado/i }).getAttribute('href')).toBe('/itens/1')
    expect(mockApiFetch).toHaveBeenCalledTimes(2)
  })

  test('Esc fecha e overlay click fecha', async () => {
    const onClose = vi.fn()
    renderPalette({ open: true, onClose })
    // Esc
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    // overlay click (role dialog backdrop)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
