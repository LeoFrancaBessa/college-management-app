import { NavLink } from 'react-router-dom'

export function Sidebar() {
  const link = 'block px-3 py-2 rounded-lg text-sm'
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-gray-200 bg-white p-4 gap-2">
      <div className="font-bold text-lg">College App</div>
      <NavLink
        to="/"
        className={({ isActive }) => `${link} ${isActive ? 'bg-primary-50 text-gray-900' : 'text-gray-600'}`}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/cronograma"
        className={({ isActive }) => `${link} ${isActive ? 'bg-primary-50' : ''}`}
      >
        Cronograma
      </NavLink>
      <NavLink
        to="/lixeira"
        className={({ isActive }) => `${link} ${isActive ? 'bg-primary-50' : ''}`}
      >
        Lixeira
      </NavLink>
    </aside>
  )
}
