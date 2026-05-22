import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ping, setPing] = useState<'checking' | 'ok' | 'fail'>('checking')

  useEffect(() => {
    fetch('/supabase/auth/v1/health')
      .then(r => setPing(r.ok ? 'ok' : 'fail'))
      .catch(() => setPing('fail'))
  }, [])

  useEffect(() => {
    if (user) navigate('/admin', { replace: true })
  }, [user, navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">
          Moschee Signage
        </h1>

        <form onSubmit={submit} className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
          />

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm font-mono break-all">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition"
          >
            {loading ? 'Bitte warten...' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
          <button
            type="button"
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
            className="text-gray-500 text-sm hover:text-gray-300 transition"
          >
            {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
          </button>
        </form>

        {/* Verbindungsstatus — Diagnose */}
        <div className="mt-4 text-center text-xs">
          <span className={
            ping === 'checking' ? 'text-gray-500' :
            ping === 'ok' ? 'text-emerald-500' :
            'text-red-500'
          }>
            Supabase: {ping === 'checking' ? 'prüfe...' : ping === 'ok' ? '✓ erreichbar' : '✗ nicht erreichbar'}
          </span>
        </div>
      </div>
    </div>
  )
}
