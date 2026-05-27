import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import Layout from '../components/Layout'
import type { Playlist, Slide } from '../../types'
import { useCmsT, useCmsLang } from '../../lib/cms-lang'
import { tpl, tplNamed } from '../../lib/cms-i18n'

export default function Playlists() {
  const { user } = useAuth()
  const t = useCmsT()
  const { lang } = useCmsLang()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('playlists').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setPlaylists(data ?? []))
  }, [user])

  async function remove(id: string) {
    setDeleting(id)
    await supabase.from('playlists').delete().eq('id', id)
    setPlaylists(p => p.filter(pl => pl.id !== id))
    setDeleting(null)
  }

  async function create() {
    if (!name.trim()) return
    const { data } = await supabase
      .from('playlists')
      .insert({ name: name.trim(), owner_id: user!.id, slides: [] })
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
          <h1 className="text-white text-xl font-bold">{t.pl.title}</h1>
          <button
            onClick={() => setCreating(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {t.pl.new_}
          </button>
        </div>

        {creating && (
          <div className="bg-gray-900 rounded-xl p-4 mb-4 flex flex-col gap-2">
            <input
              autoFocus
              type="text"
              placeholder={t.pl.namePh}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
            />
            <div className="flex gap-2">
              <button onClick={create} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">{t.pl.create}</button>
              <button onClick={() => setCreating(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm transition">{t.pl.cancel}</button>
            </div>
          </div>
        )}

        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-4xl">🎞️</span>
            <p className="text-white font-medium">{t.pl.none}</p>
            <p className="text-gray-500 text-sm max-w-xs">{t.pl.noneHint}</p>
            <button onClick={() => setCreating(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition mt-1">
              {t.pl.createFirst}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {playlists.map(pl => {
              const slideCount = ((pl.slides ?? []) as Slide[]).length
              // lang used for pluralization (bs: slajdovi, etc.) — key off lang to force re-render
              void lang
              return (
              <div key={pl.id} className="bg-gray-900 rounded-xl flex items-center group">
                <Link
                  to={`/admin/playlists/${pl.id}`}
                  className="flex-1 px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-gray-800 active:bg-gray-700 rounded-l-xl transition min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium truncate">{pl.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {tpl(t.pl.slideCount, slideCount)}
                    </div>
                  </div>
                  <span className="text-gray-600 text-sm shrink-0 ml-3 group-hover:text-emerald-400 transition">→</span>
                </Link>
                <button
                  onClick={() => window.confirm(tplNamed(t.pl.confirmDelete, { name: pl.name })) && remove(pl.id)}
                  disabled={deleting === pl.id}
                  className="shrink-0 px-4 min-h-[3.5rem] text-gray-600 hover:text-red-400 active:text-red-400 disabled:opacity-40 transition rounded-r-xl hover:bg-gray-800"
                  title={t.pl.deleteTitle}
                >
                  {deleting === pl.id ? '…' : '🗑'}
                </button>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
