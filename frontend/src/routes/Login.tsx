import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'
import { Button } from '../components/ui/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const m = useLogin()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      await m.mutateAsync({ email, password })
      nav('/')
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : 'Erro ao entrar'
      setErr(message)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded-xl border border-gray-200 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Entrar</h1>
        {err && <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
          className="w-full border border-gray-200 rounded-lg px-3 py-3 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="senha"
          autoComplete="current-password"
          className="w-full border border-gray-200 rounded-lg px-3 py-3 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" className="w-full" disabled={m.isPending}>
          {m.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
