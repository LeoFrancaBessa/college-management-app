import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/Toast'
import { useMe } from './api/auth'
import Login from './routes/Login'
import Dashboard from './routes/Dashboard'
import PeriodDetail from './routes/PeriodDetail'
import CourseDetail from './routes/CourseDetail'
import ItemDetail from './routes/ItemDetail'
import SchedulePage from './routes/SchedulePage'
import TrashPage from './routes/TrashPage'

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/periodos/:periodId" element={<PeriodDetail />} />
          <Route path="/cadeiras/:courseId" element={<CourseDetail />} />
          <Route path="/itens/:itemId" element={<ItemDetail />} />
          <Route path="/cronograma" element={<SchedulePage />} />
          <Route path="/lixeira" element={<TrashPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
