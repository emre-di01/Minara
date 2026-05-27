import { useEffect, useState } from 'react'
import { getCountries, getStates, getCities } from '../../lib/awqatsalah'

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

export default function CityPicker({ onSelect, onCancel }: {
  onSelect: (cityId: number, cityName: string) => void
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
    setCountryId(id); setStateId(''); setCityId('')
    setStates([]); setCities([]); setLoading(true)
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
        <option value="">{loading && !countryId ? 'Lade Länder...' : '— Land wählen —'}</option>
        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {states.length > 0 && (
        <select value={stateId} onChange={e => onStateChange(+e.target.value)} disabled={loading}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50">
          <option value="">— Bundesland wählen —</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {cities.length > 0 && (
        <select value={cityId} onChange={e => setCityId(+e.target.value)}
          className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500">
          <option value="">— Stadt wählen —</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <div className="flex gap-1">
        <button onClick={() => { if (!cityId) return; const c = cities.find(c => c.id === cityId); onSelect(cityId as number, c?.name ?? '') }} disabled={!cityId}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs py-1 rounded-lg transition">
          Übernehmen
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1 rounded-lg transition">
          Abbrechen
        </button>
      </div>
    </div>
  )
}
