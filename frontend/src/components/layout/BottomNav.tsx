import { NavLink } from 'react-router-dom'

export function BottomNav({ onAI }: { onAI: () => void }) {
  const linkBase =
    'flex items-center justify-center px-3 py-3 min-h-[44px] min-w-[44px] text-sm font-medium rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex items-center justify-around py-1.5 px-2 z-40"
    >
      <NavLink
        to="/"
        className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary bg-primary-50' : 'text-gray-600'}`}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/cronograma"
        className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary bg-primary-50' : 'text-gray-600'}`}
      >
        Cronograma
      </NavLink>
      <button
        onClick={onAI}
        aria-label="Abrir assistente IA"
        className="min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-medium bg-primary text-white rounded-full hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition"
      >
        +
      </button>
      <NavLink
        to="/lixeira"
        className={({ isActive }) => `${linkBase} ${isActive ? 'text-primary bg-primary-50' : 'text-gray-600'}`}
      >
        Lixeira
      </NavLink>
    </nav>
  )
}
