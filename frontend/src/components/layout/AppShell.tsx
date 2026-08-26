import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useEffect, useState } from 'react'
import { CommandPalette } from './CommandPalette'
import { useLogout, useMe } from '../../api/auth'

export function AppShell() {
  const [aiOpen, setAiOpen] = useState(false)
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAiOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between gap-2">
          <span className="font-semibold text-gray-900 shrink-0">College</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 min-h-[44px] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
            >
              Sair
            </button>
            <button
              onClick={() => setAiOpen(true)}
              className="bg-primary text-white px-3 py-2 rounded-full text-sm min-h-[44px] min-w-[44px] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition"
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
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 min-h-[44px] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
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
