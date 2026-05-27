import { useEffect, useState, useMemo } from 'react'

// ─── Types & Data ─────────────────────────────────────────────────────────────

type WeatherCategory = 'sunny' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

const WMO: Record<number, { label: string; emoji: string; category: WeatherCategory }> = {
  0:  { label: 'Klar',               emoji: '☀️',  category: 'sunny'  },
  1:  { label: 'Meist klar',         emoji: '🌤️', category: 'sunny'  },
  2:  { label: 'Teils bewölkt',      emoji: '⛅',  category: 'cloudy' },
  3:  { label: 'Bewölkt',            emoji: '☁️',  category: 'cloudy' },
  45: { label: 'Nebel',              emoji: '🌫️', category: 'fog'    },
  48: { label: 'Gefrierender Nebel', emoji: '🌫️', category: 'fog'    },
  51: { label: 'Leichter Niesel',    emoji: '🌦️', category: 'rain'   },
  53: { label: 'Niesel',             emoji: '🌦️', category: 'rain'   },
  55: { label: 'Starker Niesel',     emoji: '🌧️', category: 'rain'   },
  61: { label: 'Leichter Regen',     emoji: '🌦️', category: 'rain'   },
  63: { label: 'Regen',              emoji: '🌧️', category: 'rain'   },
  65: { label: 'Starker Regen',      emoji: '🌧️', category: 'rain'   },
  71: { label: 'Leichter Schnee',    emoji: '🌨️', category: 'snow'   },
  73: { label: 'Schneefall',         emoji: '❄️',  category: 'snow'   },
  75: { label: 'Starker Schnee',     emoji: '❄️',  category: 'snow'   },
  80: { label: 'Regenschauer',       emoji: '🌦️', category: 'rain'   },
  81: { label: 'Regenschauer',       emoji: '🌧️', category: 'rain'   },
  82: { label: 'Starke Schauer',     emoji: '⛈️',  category: 'storm'  },
  95: { label: 'Gewitter',           emoji: '⛈️',  category: 'storm'  },
}

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

interface WeatherNow {
  temp: number; feelsLike: number; humidity: number; windspeed: number
  code: number; name: string
}
interface DailyDay { date: string; code: number; tempMax: number; tempMin: number }

// ─── Gradient by condition + time ─────────────────────────────────────────────

function getGradient(cat: WeatherCategory, hour: number): string {
  const night = hour < 6 || hour >= 21
  const dusk  = hour >= 18 && hour < 21
  const dawn  = hour >= 5  && hour < 8

  type Map = Record<WeatherCategory, string>

  if (night) {
    const m: Map = {
      sunny:  'linear-gradient(170deg,#010610 0%,#04102a 60%,#010610 100%)',
      cloudy: 'linear-gradient(170deg,#090c14 0%,#10141e 100%)',
      fog:    'linear-gradient(170deg,#0c0e14 0%,#161820 100%)',
      rain:   'linear-gradient(170deg,#040c18 0%,#091526 100%)',
      snow:   'linear-gradient(170deg,#0e141e 0%,#1a2232 100%)',
      storm:  'linear-gradient(170deg,#050310 0%,#0d0a1c 100%)',
    }
    return m[cat]
  }
  if (dusk) {
    const m: Map = {
      sunny:  'linear-gradient(170deg,#1a0a05 0%,#4a1c08 40%,#7a3010 70%,#3d1206 100%)',
      cloudy: 'linear-gradient(170deg,#1e1418 0%,#3d2428 50%,#2a1a1e 100%)',
      fog:    'linear-gradient(170deg,#1a1620 0%,#2e2436 100%)',
      rain:   'linear-gradient(170deg,#0a1220 0%,#1e2c3e 100%)',
      snow:   'linear-gradient(170deg,#1a2030 0%,#2e3a4e 100%)',
      storm:  'linear-gradient(170deg,#0e0a1a 0%,#1c1428 100%)',
    }
    return m[cat]
  }
  if (dawn) {
    const m: Map = {
      sunny:  'linear-gradient(170deg,#12101c 0%,#4a2a18 50%,#7a4820 100%)',
      cloudy: 'linear-gradient(170deg,#1a1820 0%,#3a3040 100%)',
      fog:    'linear-gradient(170deg,#1a1a22 0%,#2c2c3c 100%)',
      rain:   'linear-gradient(170deg,#0c1422 0%,#1e2c40 100%)',
      snow:   'linear-gradient(170deg,#141a28 0%,#2a3448 100%)',
      storm:  'linear-gradient(170deg,#0a0c18 0%,#18182a 100%)',
    }
    return m[cat]
  }
  // Day
  const m: Map = {
    sunny:  'linear-gradient(170deg,#0a6abc 0%,#1d8fe0 50%,#4aaee8 100%)',
    cloudy: 'linear-gradient(170deg,#2e3e52 0%,#4a5e72 50%,#5e7080 100%)',
    fog:    'linear-gradient(170deg,#8a98a8 0%,#b0bcc8 50%,#9aa8b8 100%)',
    rain:   'linear-gradient(170deg,#1a2a3a 0%,#2e4a62 50%,#1e3a54 100%)',
    snow:   'linear-gradient(170deg,#c0d0e0 0%,#a8c0d4 50%,#8ab0c8 100%)',
    storm:  'linear-gradient(170deg,#181224 0%,#2e1e3e 50%,#181224 100%)',
  }
  return m[cat]
}

function isDarkText(cat: WeatherCategory, hour: number) {
  return (cat === 'snow' || cat === 'fog') && hour >= 8 && hour < 18
}

// ─── Animations ───────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes ws-rain {
  0%   { transform: translateY(-5vh) skewX(-15deg); opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 0.8; }
  100% { transform: translateY(110vh) skewX(-15deg); opacity: 0; }
}
@keyframes ws-snow {
  0%   { transform: translateY(-5vh) translateX(0) rotate(0deg); opacity: 0; }
  10%  { opacity: 0.9; }
  90%  { opacity: 0.7; }
  100% { transform: translateY(110vh) translateX(var(--drift,0px)) rotate(360deg); opacity: 0; }
}
@keyframes ws-sun-pulse {
  0%, 100% { transform: scale(1);    opacity: 0.55; }
  50%       { transform: scale(1.1); opacity: 0.85; }
}
@keyframes ws-sun-rays {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes ws-cloud {
  0%, 100% { transform: translateX(-4%); }
  50%       { transform: translateX(4%); }
}
@keyframes ws-lightning {
  0%, 87%, 100% { opacity: 0; }
  89%            { opacity: 0.55; }
  91%            { opacity: 0;   }
  93%            { opacity: 0.35; }
}
@keyframes ws-fog {
  0%, 100% { transform: translateX(-6%) scaleY(1);   opacity: 0.18; }
  50%       { transform: translateX(6%)  scaleY(1.1); opacity: 0.28; }
}
`

// Deterministic particle data (no Math.random in render)
function makeRain(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    left:     (i * 33.7) % 100,
    height:   50 + (i * 17.3) % 60,
    delay:    (i * 0.13) % 2.5,
    duration: 0.5 + (i * 0.07) % 0.9,
    opacity:  0.25 + (i * 0.031) % 0.45,
  }))
}
function makeSnow(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    left:     (i * 41.3) % 100,
    size:     4 + (i * 1.7) % 6,
    delay:    (i * 0.31) % 5,
    duration: 3 + (i * 0.43) % 5,
    drift:    ((i * 7.1) % 40) - 20,
  }))
}

function Particles({ category }: { category: WeatherCategory }) {
  const rain = useMemo(() => makeRain(35), [])
  const snow = useMemo(() => makeSnow(22), [])

  if (category === 'rain' || category === 'storm') {
    const color = category === 'storm' ? 'rgba(200,225,255,' : 'rgba(155,205,255,'
    return (
      <>
        {rain.map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: `${d.left}%`,
            width: 1.5, height: d.height, borderRadius: 1,
            background: `${color}${d.opacity})`,
            animation: `ws-rain ${d.duration}s linear ${d.delay}s infinite`,
          }} />
        ))}
        {category === 'storm' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(210,190,255,0.4)',
            animation: 'ws-lightning 5s ease-in-out infinite',
          }} />
        )}
      </>
    )
  }

  if (category === 'snow') {
    return (
      <>
        {snow.map((f, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: `${f.left}%`,
            width: f.size, height: f.size, borderRadius: '50%',
            background: 'rgba(255,255,255,0.85)',
            boxShadow: '0 0 4px rgba(255,255,255,0.4)',
            ['--drift' as string]: `${f.drift}px`,
            animation: `ws-snow ${f.duration}s ease-in ${f.delay}s infinite`,
          }} />
        ))}
      </>
    )
  }

  if (category === 'sunny') {
    return (
      <>
        <div style={{
          position: 'absolute', top: '-14vw', right: '-10vw',
          width: '48vw', height: '48vw', borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(255,220,80,0.22) 0%,rgba(255,180,40,0.08) 50%,transparent 72%)',
          animation: 'ws-sun-pulse 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '-8vw', right: '-4vw',
          width: '28vw', height: '28vw', borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(255,240,120,0.15) 0%,transparent 65%)',
          animation: 'ws-sun-pulse 6s ease-in-out 3s infinite',
        }} />
      </>
    )
  }

  if (category === 'cloudy') {
    const clouds = [
      { top: '-8%', left: '5%',  w: '38%', delay: 0, dur: 9,  op: 0.12 },
      { top: '3%',  left: '48%', w: '30%', delay: 3, dur: 13, op: 0.08 },
      { top: '-4%', left: '72%', w: '26%', delay: 6, dur: 11, op: 0.10 },
    ]
    return (
      <>
        {clouds.map((cl, i) => (
          <div key={i} style={{
            position: 'absolute', top: cl.top, left: cl.left,
            width: cl.w, aspectRatio: '2/1', borderRadius: '50%',
            background: `rgba(255,255,255,${cl.op})`,
            filter: 'blur(45px)',
            animation: `ws-cloud ${cl.dur}s ease-in-out ${cl.delay}s infinite`,
          }} />
        ))}
      </>
    )
  }

  if (category === 'fog') {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom,transparent 0%,rgba(200,212,224,0.18) 40%,rgba(200,212,224,0.28) 100%)',
        animation: 'ws-fog 9s ease-in-out infinite',
      }} />
    )
  }

  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WeatherSlide({ city, layout }: { city: string; layout: string }) {
  const [data,   setData]   = useState<WeatherNow | null>(null)
  const [daily,  setDaily]  = useState<DailyDay[]>([])
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgOk,  setImgOk]  = useState(false)

  const hour = new Date().getHours()

  useEffect(() => {
    if (!city) return
    let active = true

    async function load() {
      try {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`
        ).then(r => r.json())
        if (!geo.results?.length || !active) return
        const { latitude: lat, longitude: lon, name } = geo.results[0]

        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`
        ).then(r => r.json())

        if (!active) return
        if (w.current) {
          setData({
            temp:      Math.round(w.current.temperature_2m),
            feelsLike: Math.round(w.current.apparent_temperature),
            humidity:  Math.round(w.current.relative_humidity_2m),
            windspeed: Math.round(w.current.wind_speed_10m),
            code:      w.current.weather_code ?? 0,
            name,
          })
        }
        if (w.daily?.time) {
          setDaily(w.daily.time.slice(0, 5).map((date: string, i: number) => ({
            date,
            code:    w.daily.weather_code[i],
            tempMax: Math.round(w.daily.temperature_2m_max[i]),
            tempMin: Math.round(w.daily.temperature_2m_min[i]),
          })))
        }

        // City photo via Wikipedia REST API (free, no key, CORS-enabled)
        if (layout === 'cinematic' && active) {
          try {
            const wiki = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
              { headers: { Accept: 'application/json' } }
            ).then(r => r.json())
            const src = wiki.originalimage?.source ?? wiki.thumbnail?.source ?? null
            if (src && active) setImgUrl(src)
          } catch { /* no photo — gradient fallback */ }
        }
      } catch { /* silent */ }
    }

    load()
    const id = setInterval(load, 10 * 60_000)
    return () => { active = false; clearInterval(id) }
  }, [city, layout])

  // ── Loading / empty ──
  if (!city || !data) {
    return (
      <div className="h-screen w-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(170deg,#060d1a 0%,#0c1929 50%,#060d1a 100%)' }}>
        {!city
          ? <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1.1rem' }}>Keine Stadt konfiguriert</span>
          : <div className="w-10 h-10 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />}
      </div>
    )
  }

  const wmo      = WMO[data.code] ?? { label: '', emoji: '🌡️', category: 'cloudy' as WeatherCategory }
  const cat      = wmo.category
  const gradient = getGradient(cat, hour)
  const darkText = isDarkText(cat, hour)
  const txt      = darkText ? '#1a2a3a' : '#ffffff'
  const muted    = darkText ? 'rgba(26,42,58,0.45)' : 'rgba(255,255,255,0.45)'
  const glass    = darkText ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.09)'
  const glassBorder = darkText ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.14)'

  const stats = [
    { label: 'Gefühlt',      value: `${data.feelsLike}°`      },
    { label: 'Feuchtigkeit', value: `${data.humidity}%`        },
    { label: 'Wind',         value: `${data.windspeed} km/h`   },
  ]

  // ── Cinematic ────────────────────────────────────────────────────────────────
  if (layout === 'cinematic') {
    return (
      <div className="h-screen w-screen relative overflow-hidden select-none">
        <style>{KEYFRAMES}</style>

        {/* City photo from Wikipedia */}
        {imgUrl && (
          <img src={imgUrl} alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.45) saturate(0.75)' }}
            onLoad={() => setImgOk(true)}
            onError={() => { setImgOk(false); setImgUrl(null) }}
          />
        )}

        {/* Overlay gradient — always rendered */}
        <div className="absolute inset-0" style={{
          background: imgOk
            ? 'linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.5) 50%,rgba(0,0,0,0.88) 100%)'
            : gradient,
        }} />

        {/* Weather particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Particles category={cat} />
        </div>

        {/* City name — top left */}
        <div className="absolute z-10 flex items-center gap-3" style={{ top: '3vh', left: '5vw' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(2rem,2.5vmin,2.5rem)', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600 }}>
            {data.name}
          </span>
        </div>

        {/* Main content — centered */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
          <div style={{ fontSize: 'clamp(4.5rem,10vw,8.5rem)', lineHeight: 1, marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' }}>
            {wmo.emoji}
          </div>
          <div style={{
            fontSize: 'clamp(5rem,14vw,12rem)', fontWeight: 100, lineHeight: 1,
            letterSpacing: '-0.04em', textShadow: '0 4px 40px rgba(0,0,0,0.5)',
          }}>
            {data.temp}°
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(2rem,2.5vmin,2.5rem)', marginTop: '0.6rem', fontWeight: 300 }}>
            {wmo.label}
          </div>
        </div>

        {/* Stats — bottom */}
        <div className="absolute left-0 right-0 z-10 flex justify-center gap-10" style={{ bottom: '3vh' }}>
          {stats.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center"
              style={{ paddingLeft: i > 0 ? '2.5rem' : 0, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.18)' : 'none' }}>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                {s.label}
              </span>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', marginTop: '0.3rem' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Forecast ─────────────────────────────────────────────────────────────────
  if (layout === 'forecast') {
    return (
      <div className="h-screen w-screen relative overflow-hidden select-none flex flex-col"
        style={{ background: gradient, color: txt }}>
        <style>{KEYFRAMES}</style>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Particles category={cat} />
        </div>

        <div className="relative z-10 flex-1 flex flex-col px-16 pt-14 pb-10">
          {/* City */}
          <div className="flex items-center gap-3 mb-8">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: muted }} />
            <span style={{ color: muted, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
              {data.name}
            </span>
          </div>

          {/* Current weather */}
          <div className="flex items-center gap-8">
            <span style={{ fontSize: 'clamp(4rem,8vw,7rem)', lineHeight: 1, filter: 'drop-shadow(0 2px 16px rgba(0,0,0,0.3))' }}>
              {wmo.emoji}
            </span>
            <div>
              <div style={{ fontSize: 'clamp(4.5rem,11vw,10rem)', fontWeight: 100, lineHeight: 1, letterSpacing: '-0.04em' }}>
                {data.temp}°
              </div>
              <div style={{ color: muted, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', marginTop: '0.5rem', fontWeight: 300 }}>
                {wmo.label}
              </div>
            </div>
          </div>

          {/* Current stats */}
          <div className="flex gap-4 mt-8">
            {stats.map(s => (
              <div key={s.label} className="rounded-2xl px-5 py-3"
                style={{ background: glass, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(8px)' }}>
                <div style={{ color: muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{s.label}</div>
                <div style={{ fontWeight: 600, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', marginTop: '0.25rem' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="flex-1" />

          {/* 5-day forecast */}
          {daily.length > 0 && (
            <div>
              <div style={{ color: muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>
                5-Tage Vorhersage
              </div>
              <div className="flex gap-3">
                {daily.map((day, i) => {
                  const d = new Date(day.date + 'T12:00:00')
                  const label = i === 0 ? 'Heute' : DAYS_DE[d.getDay()]
                  const w = WMO[day.code] ?? { emoji: '🌡️' }
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 rounded-2xl py-5"
                      style={{
                        background: glass,
                        border: `1px solid ${glassBorder}`,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}>
                      <span style={{ color: muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 'clamp(1.5rem,3vmin,2.2rem)' }}>{w.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 'clamp(2rem,2.5vmin,2.5rem)' }}>{day.tempMax}°</span>
                      <span style={{ color: muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)' }}>{day.tempMin}°</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Panel (Kacheln) ──────────────────────────────────────────────────────────
  if (layout === 'panel') {
    return (
      <div className="h-screen w-screen relative overflow-hidden select-none flex flex-col items-center justify-center gap-10"
        style={{ background: gradient, color: txt }}>
        <style>{KEYFRAMES}</style>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Particles category={cat} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 w-full px-16">
          <div style={{ color: muted, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600 }}>
            {data.name}
          </div>

          <div className="flex items-center gap-8">
            <span style={{ fontSize: 'clamp(4rem,9vmin,8rem)', lineHeight: 1, filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }}>
              {wmo.emoji}
            </span>
            <div className="flex flex-col">
              <span style={{ fontSize: 'clamp(4rem,10vmin,9rem)', fontWeight: 100, lineHeight: 1, letterSpacing: '-0.04em' }}>
                {data.temp}°
              </span>
              <span style={{ color: muted, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', marginTop: '0.4rem', fontWeight: 300 }}>
                {wmo.label}
              </span>
            </div>
          </div>

          <div className="flex gap-5 flex-wrap justify-center">
            {stats.map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-3 rounded-2xl px-10 py-6"
                style={{
                  background: glass,
                  border: `1px solid ${glassBorder}`,
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  minWidth: 200,
                }}>
                <span style={{ color: muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: 'clamp(1.8rem,3.5vmin,2.8rem)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Minimal (default) ────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen relative overflow-hidden select-none flex flex-col items-center justify-center"
      style={{ background: gradient, color: txt }}>
      <style>{KEYFRAMES}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Particles category={cat} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div style={{ color: muted, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600 }}>
          {data.name}
        </div>
        <div style={{ fontSize: 'clamp(5rem,16vmin,12rem)', lineHeight: 1, filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))' }}>
          {wmo.emoji}
        </div>
        <div style={{ fontSize: 'clamp(4.5rem,13vmin,10rem)', fontWeight: 100, lineHeight: 1, letterSpacing: '-0.04em' }}>
          {data.temp}°
        </div>
        <div style={{ color: muted, fontSize: 'clamp(2rem,2.5vmin,2.5rem)', fontWeight: 300 }}>
          {wmo.label}
        </div>

        <div className="flex gap-10 mt-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span style={{ color: muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 'clamp(2rem,2.5vmin,2.5rem)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
