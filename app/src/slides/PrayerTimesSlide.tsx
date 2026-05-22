import { useEffect, useState } from 'react'
import { getDailyPrayerTimes } from '../lib/awqatsalah'
import type { PrayerTimes, PrayerTheme } from '../types'
import { PRAYER_NAMES, UI, formatDate, isRTL, type LangCode } from '../lib/i18n'

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type PKey = typeof PRAYER_KEYS[number]

const pad = (n: number) => String(n).padStart(2, '0')

function formatClock(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function prayerLabel(key: PKey, lang: LangCode, lang2?: LangCode) {
  const primary = PRAYER_NAMES[lang]?.[key] ?? key
  if (!lang2 || lang2 === lang) return { primary, secondary: null }
  return { primary, secondary: PRAYER_NAMES[lang2]?.[key] ?? null }
}

function getNext(times: PrayerTimes, lang: LangCode): { key: PKey; label: string; remaining: string; totalSecs: number } | null {
  const now = new Date()
  for (const key of PRAYER_KEYS) {
    const t = times[key as keyof PrayerTimes] as string
    if (!t) continue
    const [h, m] = t.split(':').map(Number)
    const target = new Date(now); target.setHours(h, m, 0, 0)
    if (target > now) {
      const diff = Math.floor((target.getTime() - now.getTime()) / 1000)
      return {
        key,
        label: PRAYER_NAMES[lang]?.[key] ?? key,
        remaining: `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`,
        totalSecs: diff,
      }
    }
  }
  return null
}

interface ThemeProps {
  times: PrayerTimes
  clock: string
  date: string
  next: ReturnType<typeof getNext>
  mosqueName: string
  mosqueAddress: string
  bgImage: string
  ticker: string
  lang: LangCode
  lang2?: LangCode
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function PrayerCell({ pkey, times, next, lang, lang2, accentColor, dimColor, bgActive }: {
  pkey: PKey
  times: PrayerTimes
  next: ReturnType<typeof getNext>
  lang: LangCode
  lang2?: LangCode
  accentColor: string
  dimColor: string
  bgActive: string
}) {
  const isNext = next?.key === pkey
  const { primary, secondary } = prayerLabel(pkey, lang, lang2)
  const time = (times[pkey as keyof PrayerTimes] as string) ?? '--:--'
  const rtl1 = isRTL(lang)
  const rtl2 = lang2 ? isRTL(lang2) : false

  return (
    <div className="flex flex-col items-center justify-center py-4 transition-colors"
      style={{ background: isNext ? bgActive : 'transparent', borderRight: `1px solid rgba(255,255,255,0.04)` }}>
      <span className="text-xs mb-0.5 uppercase tracking-widest"
        style={{ color: isNext ? accentColor : dimColor, direction: rtl1 ? 'rtl' : 'ltr' }}>
        {primary}
      </span>
      {secondary && (
        <span className="text-xs mb-0.5"
          style={{ color: isNext ? accentColor : dimColor, opacity: 0.65, direction: rtl2 ? 'rtl' : 'ltr' }}>
          {secondary}
        </span>
      )}
      <span className="font-mono text-2xl font-semibold"
        style={{ color: isNext ? accentColor : 'rgba(255,255,255,0.9)' }}>
        {time}
      </span>
    </div>
  )
}

// ─── Shared Ticker ────────────────────────────────────────────────────────────
function Ticker({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null
  return (
    <div className={`overflow-hidden flex items-center ${className}`}>
      <span
        className="whitespace-nowrap text-sm font-medium"
        style={{ animation: 'slide-ticker 30s linear infinite' }}
      >
        {text} &nbsp;&nbsp;&nbsp; ✦ &nbsp;&nbsp;&nbsp; {text}
      </span>
      <style>{`@keyframes slide-ticker { from { transform: translateX(100vw) } to { transform: translateX(-100%) } }`}</style>
    </div>
  )
}

// ─── Geometric SVG overlay ────────────────────────────────────────────────────
function GeomPattern({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }} aria-hidden>
      <defs>
        <pattern id="gp" x="0" y="0" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M36 6 L42 24 L60 18 L48 34 L60 50 L42 44 L36 62 L30 44 L12 50 L24 34 L12 18 L30 24 Z"
            fill="none" stroke="white" strokeWidth="0.7" />
          <circle cx="36" cy="36" r="6" fill="none" stroke="white" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gp)" />
    </svg>
  )
}

// ─── MADINAH ──────────────────────────────────────────────────────────────────
function MadinahTheme({ times, clock, date, next, mosqueName, mosqueAddress, ticker, lang, lang2 }: ThemeProps) {
  const ui = UI[lang]
  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col" style={{ background: '#070712', color: '#fff' }}>
      <GeomPattern />
      <div className="relative z-10 flex items-start justify-between px-10 pt-7 pb-4">
        <div>
          <div className="text-2xl font-bold tracking-wide" style={{ color: '#d4a843' }}>{mosqueName || 'Moschee'}</div>
          {mosqueAddress && <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{mosqueAddress}</div>}
        </div>
        <div className="text-right">
          {times.hijriDateLong && <div className="text-sm font-medium" style={{ color: '#d4a843' }}>{times.hijriDateLong}</div>}
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{date}</div>
        </div>
      </div>
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5">
        <div className="font-mono font-light" style={{ fontSize: 'clamp(5rem, 12vw, 9rem)', letterSpacing: '0.06em', lineHeight: 1 }}>{clock}</div>
        {next && (
          <div className="flex items-center gap-4 rounded-full px-8 py-3 border"
            style={{ background: 'rgba(212,168,67,0.08)', borderColor: 'rgba(212,168,67,0.35)' }}>
            <span style={{ color: '#d4a843' }}>◆</span>
            <span className="text-lg font-medium">{ui.next}: {next.label}</span>
            <span className="font-mono text-xl font-semibold" style={{ color: '#d4a843' }}>{next.remaining}</span>
          </div>
        )}
      </div>
      <div className="relative z-10 grid grid-cols-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {PRAYER_KEYS.map(key => (
          <PrayerCell key={key} pkey={key} times={times} next={next} lang={lang} lang2={lang2}
            accentColor="#d4a843" dimColor="rgba(255,255,255,0.4)" bgActive="rgba(212,168,67,0.12)" />
        ))}
      </div>
      {ticker && <Ticker text={ticker} className="py-2 px-4 border-t text-white/50" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)' }} />}
    </div>
  )
}

// ─── BOSPHORUS ────────────────────────────────────────────────────────────────
function BosphorusTheme({ times, clock, date, next, mosqueName, mosqueAddress, bgImage, ticker, lang, lang2 }: ThemeProps) {
  const ui = UI[lang]
  const bg = bgImage ? `url(${bgImage}) center/cover no-repeat` : 'linear-gradient(145deg, #0d1b35 0%, #1a3a5c 40%, #2d5a3d 70%, #0d2015 100%)'
  return (
    <div className="h-screen w-screen overflow-hidden relative flex" style={{ background: bg }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 38%, rgba(0,0,0,0.1) 100%)' }} />
      <div className="relative z-10 flex flex-col justify-center px-8 py-8" style={{ width: '36%' }}>
        <div className="mb-5">
          <div className="text-xl font-bold" style={{ color: '#f0c040' }}>{mosqueName || 'Moschee'}</div>
          {mosqueAddress && <div className="text-xs mt-0.5 text-white/40">{mosqueAddress}</div>}
        </div>
        <div className="flex flex-col gap-1">
          {PRAYER_KEYS.map(key => {
            const isNext = next?.key === key
            const { primary, secondary } = prayerLabel(key, lang, lang2)
            return (
              <div key={key} className="flex items-center justify-between rounded-lg px-4 py-2 transition-all"
                style={{ background: isNext ? 'rgba(240,192,64,0.18)' : 'rgba(255,255,255,0.05)', borderLeft: isNext ? '3px solid #f0c040' : '3px solid transparent' }}>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium" style={{ color: isNext ? '#f0c040' : 'rgba(255,255,255,0.7)', direction: isRTL(lang) ? 'rtl' : 'ltr' }}>{primary}</span>
                  {secondary && <span className="text-xs" style={{ color: isNext ? '#f0c040' : 'rgba(255,255,255,0.35)', direction: isRTL(lang2!) ? 'rtl' : 'ltr', opacity: 0.75 }}>{secondary}</span>}
                </div>
                <span className="font-mono text-xl font-bold ml-2 shrink-0" style={{ color: isNext ? '#f0c040' : 'white' }}>
                  {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-end justify-start pt-8 pr-10">
          <div className="font-mono font-light text-white text-right" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', letterSpacing: '0.04em' }}>{clock}</div>
          <div className="text-white/60 text-sm mt-1 text-right">{date}</div>
          {times.hijriDateLong && <div className="text-sm mt-0.5 text-right" style={{ color: '#f0c040' }}>{times.hijriDateLong}</div>}
        </div>
        {next && (
          <div className="absolute bottom-20 left-8 right-8 flex items-center gap-3 rounded-2xl px-6 py-3"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(240,192,64,0.3)' }}>
            <span style={{ color: '#f0c040' }}>◉</span>
            <span className="text-white font-medium">{ui.next}: {next.label}</span>
            <span className="font-mono text-lg" style={{ color: '#f0c040' }}>{next.remaining}</span>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 py-2 px-6" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
        {ticker ? <Ticker text={ticker} className="text-white/60" /> : <div className="text-xs text-white/30 text-center">{date}</div>}
      </div>
    </div>
  )
}

// ─── MEKKA ────────────────────────────────────────────────────────────────────
function MekkaTheme({ times, clock, date, next, mosqueName, mosqueAddress, ticker, lang, lang2 }: ThemeProps) {
  const ui = UI[lang]
  const r = 52, circ = 2 * Math.PI * r
  const dashOffset = circ * (1 - Math.max(0, Math.min(1, 1 - (next?.totalSecs ?? 0) / (4 * 3600))))
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-between pb-4"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #1a0050 0%, #030014 55%, #000008 100%)', color: '#fff' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(60)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ width: Math.random() > 0.85 ? 2 : 1, height: Math.random() > 0.85 ? 2 : 1, top: `${Math.random() * 70}%`, left: `${Math.random() * 100}%`, opacity: 0.15 + Math.random() * 0.5 }} />
        ))}
      </div>
      <div className="relative z-10 text-center pt-7">
        <div className="text-lg font-semibold" style={{ color: '#c084fc' }}>{mosqueName || 'Moschee'}</div>
        {mosqueAddress && <div className="text-xs text-white/30 mt-0.5">{mosqueAddress}</div>}
        <div className="text-xs mt-2 text-white/40">{date}</div>
        {times.hijriDateLong && <div className="text-xs mt-0.5" style={{ color: '#a855f7' }}>{times.hijriDateLong}</div>}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
          <svg className="absolute" width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="6" />
            <circle cx="100" cy="100" r={r} fill="none" stroke="#a855f7" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="font-mono font-light" style={{ fontSize: '2.8rem', letterSpacing: '0.05em' }}>{clock}</div>
        </div>
        {next && (
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-1">{ui.next}</div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-lg" style={{ color: '#c084fc' }}>{next.label}</span>
              <span className="font-mono text-2xl font-bold" style={{ color: '#e9d5ff' }}>{next.remaining}</span>
            </div>
          </div>
        )}
      </div>
      <div className="relative z-10 grid grid-cols-3 gap-2 px-8 w-full">
        {PRAYER_KEYS.map(key => {
          const isNext = next?.key === key
          const { primary, secondary } = prayerLabel(key, lang, lang2)
          return (
            <div key={key} className="flex flex-col items-center rounded-xl py-3 px-2"
              style={{ background: isNext ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isNext ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.06)'}`, boxShadow: isNext ? '0 0 24px rgba(168,85,247,0.2)' : 'none' }}>
              <span className="text-xs uppercase tracking-widest" style={{ color: isNext ? '#c084fc' : 'rgba(255,255,255,0.35)', direction: isRTL(lang) ? 'rtl' : 'ltr' }}>{primary}</span>
              {secondary && <span className="text-xs mt-0.5" style={{ color: isNext ? '#c084fc' : 'rgba(255,255,255,0.2)', direction: isRTL(lang2!) ? 'rtl' : 'ltr', opacity: 0.75 }}>{secondary}</span>}
              <span className="font-mono text-xl font-semibold mt-1" style={{ color: isNext ? '#e9d5ff' : 'rgba(255,255,255,0.85)' }}>
                {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
              </span>
            </div>
          )
        })}
      </div>
      {ticker && <div className="relative z-10 w-full px-4"><Ticker text={ticker} className="text-white/40" /></div>}
    </div>
  )
}

// ─── NIGHT ────────────────────────────────────────────────────────────────────
function NightTheme({ times, clock, date, next, mosqueName, ticker, lang, lang2 }: ThemeProps) {
  const ui = UI[lang]
  const pct = Math.max(0, Math.min(100, (1 - (next?.totalSecs ?? 0) / Math.max(next?.totalSecs ?? 1, 1)) * 100))
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: '#000', color: '#fff' }}>
      <GeomPattern opacity={0.025} />
      <div className="relative z-10 flex items-center justify-between px-10 py-5 border-b border-white/5">
        <div className="text-sm font-medium text-white/40 uppercase tracking-widest">{mosqueName || 'Moschee'}</div>
        <div className="text-sm text-white/30">{date}</div>
        {times.hijriDateLong && <div className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{times.hijriDateLong}</div>}
      </div>
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6">
        <div className="font-mono font-thin tracking-tight text-white" style={{ fontSize: 'clamp(6rem, 15vw, 11rem)', lineHeight: 1, letterSpacing: '-0.02em' }}>{clock}</div>
        {next && (
          <div className="flex flex-col items-center gap-2 w-full max-w-xl px-8">
            <div className="flex items-center justify-between w-full text-xs text-white/30 uppercase tracking-widest">
              <span>{ui.next}: {next.label}</span>
              <span className="font-mono">{next.remaining}</span>
            </div>
            <div className="w-full h-px relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 h-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(to right, rgba(255,255,255,0.2), rgba(255,255,255,0.6))' }} />
            </div>
          </div>
        )}
      </div>
      <div className="relative z-10 grid grid-cols-6 border-t border-white/5">
        {PRAYER_KEYS.map(key => {
          const isNext = next?.key === key
          const { primary, secondary } = prayerLabel(key, lang, lang2)
          return (
            <div key={key} className="flex flex-col items-center py-4" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-xs uppercase tracking-widest" style={{ color: isNext ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', direction: isRTL(lang) ? 'rtl' : 'ltr' }}>{primary}</span>
              {secondary && <span className="text-xs mt-0.5" style={{ color: isNext ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)', direction: isRTL(lang2!) ? 'rtl' : 'ltr' }}>{secondary}</span>}
              <span className="font-mono text-xl font-medium mt-1" style={{ color: isNext ? '#fff' : 'rgba(255,255,255,0.55)', borderBottom: isNext ? '2px solid rgba(255,255,255,0.7)' : 'none', paddingBottom: isNext ? 2 : 0 }}>
                {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
              </span>
            </div>
          )
        })}
      </div>
      {ticker && <div className="relative z-10 py-2 px-4 border-t border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}><Ticker text={ticker} className="text-white/25" /></div>}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  cityId: number
  prayerTheme?: PrayerTheme
  mosqueName?: string
  mosqueAddress?: string
  bgImage?: string
  ticker?: string
  lang?: LangCode
  lang2?: LangCode
}

export default function PrayerTimesSlide({ cityId, prayerTheme = 'madinah', mosqueName = '', mosqueAddress = '', bgImage = '', ticker = '', lang = 'de', lang2 }: Props) {
  const [times, setTimes] = useState<PrayerTimes | null>(null)
  const [clock, setClock] = useState(formatClock(new Date()))
  const [next, setNext] = useState<ReturnType<typeof getNext>>(null)

  useEffect(() => {
    if (!cityId) return
    getDailyPrayerTimes(cityId).then(t => {
      setTimes(t)
      setNext(getNext(t, lang))
    }).catch(console.error)
  }, [cityId, lang])

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatClock(new Date()))
      if (times) setNext(getNext(times, lang))
    }, 1000)
    return () => clearInterval(id)
  }, [times, lang])

  if (!times) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#070712' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  const date = formatDate(new Date(), lang)
  const props: ThemeProps = { times, clock, date, next, mosqueName, mosqueAddress, bgImage, ticker, lang, lang2 }

  switch (prayerTheme) {
    case 'madinah':   return <MadinahTheme {...props} />
    case 'bosphorus': return <BosphorusTheme {...props} />
    case 'mekka':     return <MekkaTheme {...props} />
    case 'night':     return <NightTheme {...props} />
  }
}
