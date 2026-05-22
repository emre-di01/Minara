import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { getCountries, getStates, getCities } from '../../lib/awqatsalah'
import Layout from '../components/Layout'
import type { Screen, Playlist } from '../../types'

export default function Screens() {
  const { user } = useAuth()
  const [screens, setScreens] = useState<Screen[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [showPairing, setShowPairing] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('screens').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setScreens(data ?? []))
    supabase.from('playlists').select('id, name').order('created_at', { ascending: false })
      .then(({ data }) => setPlaylists(data as Playlist[] ?? []))
  }, [user])

  function onPaired(screen: Screen) {
    setScreens(prev => [screen, ...prev])
    setShowPairing(false)
  }

  async function assignPlaylist(screenId: string, playlistId: string | null) {
    const { data } = await supabase.from('screens').update({ playlist_id: playlistId })
      .eq('id', screenId).select().single()
    if (data) setScreens(prev => prev.map(s => s.id === screenId ? data as Screen : s))
  }

  async function assignCity(screenId: string, cityId: number | null) {
    const { data } = await supabase.from('screens').update({ city_id: cityId })
      .eq('id', screenId).select().single()
    if (data) setScreens(prev => prev.map(s => s.id === screenId ? data as Screen : s))
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">Screens</h1>
          <button
            onClick={() => setShowPairing(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Screen koppeln
          </button>
        </div>

        {screens.length === 0 ? (
          <div className="text-gray-500 text-sm">
            Noch keine Screens — klick auf "Screen koppeln".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {screens.map(s => (
              <ScreenCard key={s.id} screen={s} playlists={playlists} onAssign={assignPlaylist} onCityAssign={assignCity} />
            ))}
          </div>
        )}
      </div>

      {showPairing && (
        <PairingDialog onPaired={onPaired} onClose={() => setShowPairing(false)} />
      )}
    </Layout>
  )
}

function ScreenCard({ screen, playlists, onAssign, onCityAssign }: {
  screen: Screen
  playlists: Playlist[]
  onAssign: (screenId: string, playlistId: string | null) => void
  onCityAssign: (screenId: string, cityId: number | null) => void
}) {
  const [showCityPicker, setShowCityPicker] = useState(false)

  const isOnline = screen.last_seen_at
    ? Date.now() - new Date(screen.last_seen_at).getTime() < 90_000
    : false

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">{screen.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-900 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="text-gray-500 text-xs">
        {screen.orientation === 'landscape' ? '⬛ 16:9' : '▮ 9:16'}
      </div>
      <select
        value={screen.playlist_id ?? ''}
        onChange={e => onAssign(screen.id, e.target.value || null)}
        className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">— Keine Playlist —</option>
        {playlists.map(pl => (
          <option key={pl.id} value={pl.id}>{pl.name}</option>
        ))}
      </select>

      <div className="border-t border-gray-800 pt-2">
        {showCityPicker ? (
          <CityPicker
            onSelect={cityId => { onCityAssign(screen.id, cityId); setShowCityPicker(false) }}
            onCancel={() => setShowCityPicker(false)}
          />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">
              🕌 {screen.city_id ? `Stadt-ID: ${screen.city_id}` : 'Keine Gebetszeiten-Stadt'}
            </span>
            <button
              onClick={() => setShowCityPicker(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition"
            >
              {screen.city_id ? 'ändern' : '+ Stadt'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

function CityPicker({ onSelect, onCancel }: {
  onSelect: (cityId: number) => void
  onCancel: () => void
}) {
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([])
  const [states, setStates] = useState<{ id: number; name: string }[]>([])
  const [cities, setCities] = useState<{ id: number; name: string }[]>([])
  const [countryId, setCountryId] = useState<number | ''>('')
  const [stateId, setStateId] = useState<number | ''>('')
  const [cityId, setCityId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCountries()
      .then(c => setCountries([...c].sort(byName)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function onCountryChange(id: number) {
    setCountryId(id)
    setStateId('')
    setCityId('')
    setStates([])
    setCities([])
    setLoading(true)
    getStates(id)
      .then(s => setStates([...s].sort(byName)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function onStateChange(id: number) {
    setStateId(id)
    setCityId('')
    setCities([])
    setLoading(true)
    getCities(id)
      .then(c => setCities([...c].sort(byName)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={countryId}
        onChange={e => onCountryChange(+e.target.value)}
        disabled={loading && !countryId}
        className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
      >
        <option value="">{loading && !countryId ? 'Lade Länder...' : '— Land wählen —'}</option>
        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {states.length > 0 && (
        <select
          value={stateId}
          onChange={e => onStateChange(+e.target.value)}
          disabled={loading}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        >
          <option value="">— Bundesland wählen —</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {cities.length > 0 && (
        <select
          value={cityId}
          onChange={e => setCityId(+e.target.value)}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">— Stadt wählen —</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <div className="flex gap-1">
        <button
          onClick={() => cityId && onSelect(cityId as number)}
          disabled={!cityId}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs py-1 rounded-lg transition"
        >
          Übernehmen
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1 rounded-lg transition"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

function PairingDialog({ onPaired, onClose }: {
  onPaired: (s: Screen) => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function pair() {
    if (code.length !== 6) { setError('6-stelligen Code eingeben'); return }
    if (!name.trim()) { setError('Name eingeben'); return }
    setError(null)
    setLoading(true)

    // Code nachschlagen
    const { data: pairing, error: lookupErr } = await supabase
      .from('pairing_codes')
      .select('hardware_id')
      .eq('code', code.trim())
      .maybeSingle()

    if (lookupErr) {
      setError(`DB Fehler: ${lookupErr.message}`)
      setLoading(false)
      return
    }

    if (!pairing) {
      setError(`Code "${code.trim()}" nicht gefunden`)
      setLoading(false)
      return
    }

    // Screen anlegen
    const { data: screen, error: insertErr } = await supabase
      .from('screens')
      .upsert({
        hardware_id: pairing.hardware_id,
        owner_id: user!.id,
        name: name.trim(),
        orientation,
        paired: true,
      }, { onConflict: 'hardware_id' })
      .select()
      .single()

    if (insertErr || !screen) {
      setError('Fehler beim Koppeln')
      setLoading(false)
      return
    }

    // Code löschen
    await supabase.from('pairing_codes').delete().eq('code', code)

    onPaired(screen as Screen)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-white font-bold text-lg">Screen koppeln</h2>

        <input
          type="text"
          placeholder="Name (z.B. Haupthalle)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
        />

        <input
          type="text"
          placeholder="6-stelliger Code"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 font-mono text-xl tracking-widest text-center"
          maxLength={6}
        />

        <div className="flex gap-2">
          {(['landscape', 'portrait'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                orientation === o
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {o === 'landscape' ? '⬛ 16:9' : '▮ 9:16'}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm transition"
          >
            Abbrechen
          </button>
          <button
            onClick={pair}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            {loading ? '...' : 'Koppeln'}
          </button>
        </div>
      </div>
    </div>
  )
}
