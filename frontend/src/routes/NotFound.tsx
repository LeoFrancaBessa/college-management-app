import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <EmptyState
        title="Página não encontrada"
        description="O link que você seguiu não existe ou foi movido."
        action={
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link to="/">
              <Button>Voltar ao Dashboard</Button>
            </Link>
            <Link
              to="/cronograma"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 text-gray-900 min-h-[44px] hover:bg-gray-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ver cronograma
            </Link>
          </div>
        }
      />
    </div>
  )
}
