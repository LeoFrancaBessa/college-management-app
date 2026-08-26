import { NavLink } from 'react-router-dom'

export function Sidebar() {
  const link =
    'flex items-center px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-gray-200 bg-white p-4 gap-1.5">
      <div className="font-bold text-lg px-1 py-2">College App</div>
      <NavLink
        to="/"
        className={({ isActive }) => `${link} ${isActive ? 'bg-primary-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/cronograma"
        className={({ isActive }) => `${link} ${isActive ? 'bg-primary-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        Cronograma
      </NavLink>
      <NavLink
        to="/lixeira"
        className={({ isActive }) => `${link} ${isActive ? 'bg-primary-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        Lixeira
      </NavLink>
    </aside>
  )
}
