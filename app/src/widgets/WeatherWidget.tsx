import { useEffect, useState } from 'react'
import type { ThemeId } from '../types'

const WMO_DESC: Record<number, string> = {
  0: 'Klar', 1: 'Meist klar', 2: 'Teils bewölkt', 3: 'Bewölkt',
  45: 'Nebel', 48: 'Nebel',
  51: 'Niesel', 53: 'Niesel', 55: 'Starker Niesel',
  61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
  71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee',
  80: 'Regenschauer', 81: 'Regenschauer', 82: 'Starke Schauer',
  95: 'Gewitter',
}

const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌦️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️',
}

interface Props {
  config: Record<string, unknown>
  theme: ThemeId
}

interface WeatherData {
  temperature: number
  weathercode: number
}

export default function WeatherWidget({ config, theme }: Props) {
  const city = (config.city as string) ?? ''
  const [cityName, setCityName] = useState('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!city) return
    let active = true

    async function load() {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`
        )
        const geo = await geoRes.json()
        if (!geo.results?.length) { if (active) setError(true); return }
        const { latitude, longitude, name } = geo.results[0]
        if (active) setCityName(name)

        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
        )
        const w = await wRes.json()
        if (active) setWeather(w.current_weather)
      } catch {
        if (active) setError(true)
      }
    }

    load()
    const id = setInterval(load, 10 * 60_000)
    return () => { active = false; clearInterval(id) }
  }, [city])

  const bg = {
    'classic': 'bg-blue-950 text-white',
    'modern-minimal': 'bg-sky-50 text-gray-900',
    'dark-elegant': 'bg-gray-950 text-blue-300',
    'ramadan': 'bg-indigo-950 text-cyan-200',
  }[theme]

  if (!city || error) {
    return (
      <div className={`h-full w-full flex items-center justify-center text-sm opacity-50 ${bg}`}>
        Wetter nicht verfügbar
      </div>
    )
  }

  if (!weather) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${bg}`}>
        <div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    )
  }

  const emoji = WMO_EMOJI[weather.weathercode] ?? '🌡️'
  const desc = WMO_DESC[weather.weathercode] ?? ''

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center gap-2 ${bg}`}>
      <div className="text-5xl leading-none">{emoji}</div>
      <div className="text-4xl font-bold">{Math.round(weather.temperature)}°</div>
      <div className="text-sm opacity-70">{desc}</div>
      <div className="text-xs opacity-40">{cityName}</div>
    </div>
  )
}
