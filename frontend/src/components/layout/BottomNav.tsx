import { NavLink } from 'react-router-dom'

export function BottomNav({ onAI }: { onAI: () => void }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around py-2">
      <NavLink to="/" className="px-3 py-2 text-sm">
        Dashboard
      </NavLink>
      <NavLink to="/cronograma" className="px-3 py-2 text-sm">
        Cronograma
      </NavLink>
      <button onClick={onAI} className="px-3 py-2 text-sm bg-primary text-white rounded-full">
        +
      </button>
      <NavLink to="/lixeira" className="px-3 py-2 text-sm">
        Lixeira
      </NavLink>
    </nav>
  )
}
