import { createContext, useContext, useState } from 'react'

type ToastKind = 'success' | 'error'

const Ctx = createContext<(msg: string, kind?: ToastKind) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: ToastKind }[]>([])
  const push = (msg: string, kind: ToastKind = 'success') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }
  return (
    <Ctx.Provider value={push}>
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg text-white ${t.kind === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
      {children}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
