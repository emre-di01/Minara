import { useEffect, useState } from 'react'
import type { ThemeId } from '../types'

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Klar',              emoji: '☀️'  },
  1:  { label: 'Meist klar',        emoji: '🌤️' },
  2:  { label: 'Teils bewölkt',     emoji: '⛅'  },
  3:  { label: 'Bewölkt',           emoji: '☁️'  },
  45: { label: 'Nebel',             emoji: '🌫️' },
  48: { label: 'Gefrierender Nebel',emoji: '🌫️' },
  51: { label: 'Leichter Niesel',   emoji: '🌦️' },
  53: { label: 'Niesel',            emoji: '🌦️' },
  55: { label: 'Starker Niesel',    emoji: '🌧️' },
  61: { label: 'Leichter Regen',    emoji: '🌦️' },
  63: { label: 'Regen',             emoji: '🌧️' },
  65: { label: 'Starker Regen',     emoji: '🌧️' },
  71: { label: 'Leichter Schnee',   emoji: '🌨️' },
  73: { label: 'Schneefall',        emoji: '❄️'  },
  75: { label: 'Starker Schnee',    emoji: '❄️'  },
  80: { label: 'Regenschauer',      emoji: '🌦️' },
  81: { label: 'Regenschauer',      emoji: '🌧️' },
  82: { label: 'Starke Schauer',    emoji: '⛈️'  },
  95: { label: 'Gewitter',          emoji: '⛈️'  },
}

interface Props {
  config: Record<string, unknown>
  theme: ThemeId
}

interface WeatherData {
  temperature: number
  feelsLike:   number
  humidity:    number
  windspeed:   number
  weathercode: number
}

const COLORS: Record<ThemeId, { bg: string; accent: string; muted: string; text: string; divider: string }> = {
  'classic':        { bg: '#020e1a',  accent: '#7dd3fc', muted: 'rgba(125,211,252,0.5)',  text: '#fff', divider: 'rgba(125,211,252,0.1)' },
  'modern-minimal': { bg: '#f0f9ff',  accent: '#0284c7', muted: 'rgba(2,132,199,0.5)',    text: '#0c1a2a', divider: 'rgba(2,132,199,0.15)' },
  'dark-elegant':   { bg: '#060b14',  accent: '#93c5fd', muted: 'rgba(147,197,253,0.45)', text: '#fff', divider: 'rgba(147,197,253,0.1)' },
  'ramadan':        { bg: '#030718',  accent: '#67e8f9', muted: 'rgba(103,232,249,0.45)', text: '#fff', divider: 'rgba(103,232,249,0.1)' },
}

export default function WeatherWidget({ config, theme }: Props) {
  const city = (config.city as string) ?? ''
  const [cityName, setCityName] = useState('')
  const [weather,  setWeather]  = useState<WeatherData | null>(null)
  const [error,    setError]    = useState(false)

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
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`
        )
        const w = await wRes.json()
        if (active && w.current) {
          setWeather({
            temperature: w.current.temperature_2m,
            feelsLike:   w.current.apparent_temperature,
            humidity:    w.current.relative_humidity_2m,
            windspeed:   w.current.wind_speed_10m,
            weathercode: w.current.weather_code ?? 0,
          })
        }
      } catch {
        if (active) setError(true)
      }
    }

    load()
    const id = setInterval(load, 10 * 60_000)
    return () => { active = false; clearInterval(id) }
  }, [city])

  const c = COLORS[theme] ?? COLORS['dark-elegant']

  if (!city || error) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm" style={{ background: c.bg, color: c.muted }}>
        Wetter nicht verfügbar
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ background: c.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-current/20 border-t-current animate-spin" style={{ color: c.accent }} />
      </div>
    )
  }

  const wmo = WMO[weather.weathercode] ?? { label: '', emoji: '🌡️' }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none" style={{ background: c.bg, color: c.text }}>

      {/* City */}
      <div style={{ padding: '2vh 2.5vw 0', color: c.muted, fontSize: '1.4vh', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        {cityName || city}
      </div>

      {/* Main: emoji + temp */}
      <div className="flex-1 flex items-center" style={{ padding: '0 2.5vw', gap: '2vw' }}>
        <div style={{ fontSize: 'clamp(2.5rem, 6vh, 5rem)', lineHeight: 1 }}>{wmo.emoji}</div>
        <div>
          <div className="font-bold" style={{ color: c.text, fontSize: 'clamp(2.5rem, 7vh, 6rem)', lineHeight: 1 }}>
            {Math.round(weather.temperature)}°
          </div>
          <div style={{ color: c.accent, fontSize: '1.8vh', marginTop: '0.5vh' }}>{wmo.label}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 shrink-0" style={{ borderTop: `1px solid ${c.divider}` }}>
        {[
          { label: 'Gefühlt', value: `${Math.round(weather.feelsLike)}°` },
          { label: 'Feucht.', value: `${Math.round(weather.humidity)}%` },
          { label: 'Wind',    value: `${Math.round(weather.windspeed)} km/h` },
        ].map(({ label, value }, i) => (
          <div key={label} className="flex flex-col items-center"
            style={{ padding: '1.5vh 0', borderRight: i < 2 ? `1px solid ${c.divider}` : 'none' }}>
            <span style={{ color: c.muted, fontSize: '1.3vh' }}>{label}</span>
            <span style={{ color: c.text, fontSize: '2.2vh', fontWeight: 600, marginTop: '0.3vh' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
