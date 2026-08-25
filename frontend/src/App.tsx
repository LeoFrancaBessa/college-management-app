import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/Toast'
import { useMe } from './api/auth'
import Login from './routes/Login'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = useMe()
  if (isLoading) return <div className="p-8">Carregando...</div>
  if (error) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<div>Dashboard — next</div>} />
          <Route path="/cronograma" element={<div>Cronograma — next</div>} />
          <Route path="/lixeira" element={<div>Lixeira — next</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
