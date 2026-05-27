import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase setzt die Session automatisch aus dem URL-Hash (type=recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwörter stimmen nicht überein'); return }
    if (password.length < 6) { setError('Mindestens 6 Zeichen'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">Neues Passwort</h1>
        {!ready ? (
          <p className="text-gray-400 text-center text-sm">Link wird geprüft...</p>
        ) : (
          <form onSubmit={submit} className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
            <input
              type="password"
              placeholder="Neues Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required minLength={6}
              className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Passwort wiederholen"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition">
              {loading ? 'Bitte warten...' : 'Passwort ändern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
