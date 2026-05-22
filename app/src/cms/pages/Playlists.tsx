import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import Layout from '../components/Layout'
import type { Playlist } from '../../types'

export default function Playlists() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('playlists').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setPlaylists(data ?? []))
  }, [user])

  async function create() {
    if (!name.trim()) return
    const { data } = await supabase
      .from('playlists')
      .insert({ name: name.trim(), owner_id: user!.id, theme: 'classic', widgets: [] })
      .select().single()
    if (data) {
      setPlaylists(p => [data as Playlist, ...p])
      setName('')
      setCreating(false)
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">Playlists</h1>
          <button
            onClick={() => setCreating(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Neue Playlist
          </button>
        </div>

        {creating && (
          <div className="bg-gray-900 rounded-xl p-4 mb-4 flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Playlist-Name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
            <button onClick={create} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm transition">Erstellen</button>
            <button onClick={() => setCreating(false)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm transition">Abbrechen</button>
          </div>
        )}

        {playlists.length === 0 ? (
          <p className="text-gray-500 text-sm">Noch keine Playlists.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {playlists.map(pl => (
              <Link
                key={pl.id}
                to={`/admin/playlists/${pl.id}`}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl px-5 py-4 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-white font-medium">{pl.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{(pl.widgets as []).length} Widget(s) · Theme: {pl.theme}</div>
                </div>
                <span className="text-gray-600 text-sm">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
