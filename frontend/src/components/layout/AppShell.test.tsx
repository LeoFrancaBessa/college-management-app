import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

const mockUseMe = vi.fn()
const mockUseLogout = vi.fn()

vi.mock('../../api/auth', () => ({
  useMe: (...args: unknown[]) => mockUseMe(...args),
  useLogin: () => ({ mutateAsync: vi.fn() }),
  useLogout: (...args: unknown[]) => mockUseLogout(...args),
}))

import { AppShell } from './AppShell'
import App from '../../App'

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AppShell', () => {
  test('BottomNav é renderizado com links e botão IA', async () => {
    mockUseMe.mockReturnValue({ data: { id: 1, email: 'a@b.com' }, isLoading: false, error: null })
    mockUseLogout.mockReturnValue({ mutateAsync: vi.fn() })
    render(
      <QueryClientProvider client={makeQC()}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const bottomNav = screen.getByRole('navigation', { name: /Navegação principal/i })
    expect(bottomNav).toBeInTheDocument()
    const { within } = await import('@testing-library/react')
    expect(within(bottomNav).getByRole('link', { name: /^Dashboard$/i })).toBeInTheDocument()
    expect(within(bottomNav).getByRole('link', { name: /Cronograma/i })).toBeInTheDocument()
    expect(within(bottomNav).getByRole('button', { name: /Abrir assistente IA/i })).toBeInTheDocument()
  })

  test('App redireciona para /login quando useMe retorna 401', async () => {
    const err: any = new Error('Unauthorized')
    err.status = 401
    mockUseMe.mockReturnValue({ data: undefined, isLoading: false, error: err })
    mockUseLogout.mockReturnValue({ mutateAsync: vi.fn() })

    render(
      <QueryClientProvider client={makeQC()}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // App's RequireAuth should navigate to /login → Login page renders "Entrar"
    expect(await screen.findByRole('heading', { name: /Entrar/i })).toBeInTheDocument()
  })
})
