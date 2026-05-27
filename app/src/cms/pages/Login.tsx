import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/admin', { replace: true })
  }, [user, navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setLoading(true)

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      })
      setLoading(false)
      if (error) { setError(error.message); return }
      setInfo('E-Mail gesendet — bitte prüfe dein Postfach.')
      return
    }

    const err = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🕌</div>
          <h1 className="text-white text-2xl font-bold">Moschee Signage</h1>
          <p className="text-gray-500 text-sm mt-1">Digital Signage für Moscheen</p>
        </div>

        <form onSubmit={submit} className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
          />

          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
          )}

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {info && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-3">
              <p className="text-emerald-400 text-sm">{info}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition">
            {loading ? 'Bitte warten...' : mode === 'login' ? 'Anmelden' : mode === 'signup' ? 'Registrieren' : 'Link senden'}
          </button>

          <div className="flex flex-col gap-1 items-center">
            {mode !== 'signup' && (
              <button type="button" onClick={() => { setMode('signup'); setError(null); setInfo(null) }}
                className="text-gray-500 text-sm hover:text-gray-300 transition">
                Noch kein Konto? Registrieren
              </button>
            )}
            {mode !== 'login' && (
              <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(null) }}
                className="text-gray-500 text-sm hover:text-gray-300 transition">
                Zurück zum Login
              </button>
            )}
            {mode === 'login' && (
              <button type="button" onClick={() => { setMode('reset'); setError(null); setInfo(null) }}
                className="text-gray-600 text-xs hover:text-gray-400 transition">
                Passwort vergessen?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
