import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useState } from 'react'
import { CommandPalette } from './CommandPalette'
import { useLogout, useMe } from '../../api/auth'

export function AppShell() {
  const [aiOpen, setAiOpen] = useState(false)
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
    } finally {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
          <span className="font-semibold">College</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 min-h-[44px]"
            >
              Sair
            </button>
            <button
              onClick={() => setAiOpen(true)}
              className="bg-primary text-white px-3 py-1 rounded-full text-sm min-h-[44px]"
            >
              IA
            </button>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
        <div className="hidden lg:flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
          <span className="text-sm text-gray-600 truncate">{me?.email ?? ''}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 min-h-[44px]"
          >
            Sair
          </button>
        </div>
        <BottomNav onAI={() => setAiOpen(true)} />
        <CommandPalette open={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </div>
  )
}
