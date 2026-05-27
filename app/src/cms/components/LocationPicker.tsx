/**
 * LocationPicker — unified prayer-times source selector.
 * Tab A: Diyanet via AwqatSalah (Country → State → City)
 * Tab B: Calculated via adhan.js (city search → lat/lng + method)
 */
import { useEffect, useState } from 'react'
import { getCountries, getStates, getCities } from '../../lib/awqatsalah'
import { geocodeCity, METHOD_LIST } from '../../lib/prayertimes'
import type { PrayerSource, PrayerMethod } from '../../types'

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

interface Props {
  current?: PrayerSource | null
  onSelect: (source: PrayerSource) => void
  onCancel: () => void
}

// ── Diyanet tab ───────────────────────────────────────────────────────────────

function DiyanetPicker({ onSelect, onCancel }: { onSelect: (cityId: number, cityName: string) => void; onCancel: () => void }) {
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([])
  const [states,    setStates]    = useState<{ id: number; name: string }[]>([])
  const [cities,    setCities]    = useState<{ id: number; name: string }[]>([])
  const [countryId, setCountryId] = useState<number | ''>('')
  const [stateId,   setStateId]   = useState<number | ''>('')
  const [cityId,    setCityId]    = useState<number | ''>('')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    getCountries()
      .then(c => setCountries([...c].sort(byName)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function onCountryChange(id: number) {
    setCountryId(id); setStateId(''); setCityId(''); setStates([]); setCities([]); setLoading(true)
    getStates(id).then(s => setStates([...s].sort(byName))).catch(() => {}).finally(() => setLoading(false))
  }

  function onStateChange(id: number) {
    setStateId(id); setCityId(''); setCities([]); setLoading(true)
    getCities(id).then(c => setCities([...c].sort(byName))).catch(() => {}).finally(() => setLoading(false))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select value={countryId} onChange={e => onCountryChange(+e.target.value)}
        disabled={loading && !countryId}
        className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50">
        <option value="">{loading && !countryId ? 'Lade Länder…' : '— Land —'}</option>
        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {states.length > 0 && (
        <select value={stateId} onChange={e => onStateChange(+e.target.value)} disabled={loading}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50">
          <option value="">— Bundesland —</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {cities.length > 0 && (
        <select value={cityId} onChange={e => setCityId(+e.target.value)}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500">
          <option value="">— Stadt —</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <div className="flex gap-1 mt-1">
        <button
          onClick={() => { if (!cityId) return; const c = cities.find(c => c.id === cityId); onSelect(cityId as number, c?.name ?? '') }}
          disabled={!cityId}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs py-1.5 rounded-lg transition">
          Übernehmen
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded-lg transition">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

// ── Calculated tab ────────────────────────────────────────────────────────────

function CalcPicker({ onSelect, onCancel }: {
  onSelect: (lat: number, lng: number, method: PrayerMethod, locationName: string) => void
  onCancel: () => void
}) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<{ lat: number; lng: number; displayName: string }[]>([])
  const [chosen,  setChosen]  = useState<{ lat: number; lng: number; displayName: string } | null>(null)
  const [method,  setMethod]  = useState<PrayerMethod>('MWL')
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true); setResults([]); setChosen(null)
    try {
      const r = await geocodeCity(query)
      setResults(r)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') search()
  }

  // shorten Nominatim display_name for readability
  function shortName(s: string) {
    return s.split(',').slice(0, 3).join(', ')
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Stadt-Suche */}
      <div className="flex gap-1">
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Stadt suchen…"
          className="flex-1 min-w-0 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-600"
        />
        <button onClick={search} disabled={loading || !query.trim()}
          className="shrink-0 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 text-xs px-2.5 py-1.5 rounded-lg transition">
          {loading ? '…' : '🔍'}
        </button>
      </div>

      {/* Suchergebnisse */}
      {results.length > 0 && !chosen && (
        <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto rounded-lg bg-gray-800 p-1">
          {results.map((r, i) => (
            <button key={i} onClick={() => setChosen(r)}
              className="text-left text-xs text-gray-200 hover:bg-gray-700 px-2 py-1.5 rounded-md transition truncate">
              {shortName(r.displayName)}
            </button>
          ))}
        </div>
      )}

      {/* Gewählter Ort */}
      {chosen && (
        <div className="flex items-center gap-1.5 bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-2 py-1.5">
          <span className="text-emerald-400 text-xs truncate flex-1">{shortName(chosen.displayName)}</span>
          <button onClick={() => { setChosen(null); setResults([]) }}
            className="text-gray-500 hover:text-red-400 text-xs transition shrink-0">✕</button>
        </div>
      )}

      {/* Berechnungsmethode */}
      <div className="flex flex-col gap-1">
        <span className="text-gray-500 text-xs">Berechnungsmethode</span>
        <select value={method} onChange={e => setMethod(e.target.value as PrayerMethod)}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500">
          {METHOD_LIST.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 mt-1">
        <button
          onClick={() => { if (!chosen) return; onSelect(chosen.lat, chosen.lng, method, shortName(chosen.displayName)) }}
          disabled={!chosen}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs py-1.5 rounded-lg transition">
          Übernehmen
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded-lg transition">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LocationPicker({ current, onSelect, onCancel }: Props) {
  const [tab, setTab] = useState<'diyanet' | 'calculated'>(current?.source ?? 'diyanet')

  return (
    <div className="flex flex-col gap-2">
      {/* Tab bar */}
      <div className="flex rounded-lg bg-gray-800 p-0.5 gap-0.5">
        {(['diyanet', 'calculated'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-md transition font-medium ${
              tab === t ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}>
            {t === 'diyanet' ? '🕌 Diyanet' : '📐 Berechnet'}
          </button>
        ))}
      </div>

      {tab === 'diyanet' ? (
        <DiyanetPicker
          onSelect={(cityId, cityName) => onSelect({ source: 'diyanet', cityId, cityName })}
          onCancel={onCancel}
        />
      ) : (
        <CalcPicker
          onSelect={(lat, lng, method, locationName) => onSelect({ source: 'calculated', lat, lng, method, locationName })}
          onCancel={onCancel}
        />
      )}
    </div>
  )
}
