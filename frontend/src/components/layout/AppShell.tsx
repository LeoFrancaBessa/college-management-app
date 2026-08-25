import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useState } from 'react'
import { CommandPalette } from './CommandPalette'

export function AppShell() {
  const [aiOpen, setAiOpen] = useState(false)
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
          <span className="font-semibold">College</span>
          <button
            onClick={() => setAiOpen(true)}
            className="bg-primary text-white px-3 py-1 rounded-full text-sm"
          >
            IA
          </button>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
        <BottomNav onAI={() => setAiOpen(true)} />
        <CommandPalette open={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </div>
  )
}
