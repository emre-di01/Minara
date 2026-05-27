import { useEffect, useState, useMemo } from 'react'
import { getPrayerTimes } from '../lib/prayertimes'
import type { PrayerTimes, PrayerTheme, PrayerSource } from '../types'
import { PRAYER_NAMES, UI, formatDate, isRTL, type LangCode } from '../lib/i18n'

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type PKey = typeof PRAYER_KEYS[number]
const pad = (n: number) => String(n).padStart(2, '0')

export type PrayerOffsets = Partial<Record<PKey, number>>

/** Add `offsetMins` minutes to a "HH:MM" string, wrapping around midnight. */
function applyOffset(time: string, offsetMins: number): string {
  if (!offsetMins) return time
  const [h, m] = time.split(':').map(Number)
  const adjusted = ((h * 60 + m + offsetMins) % 1440 + 1440) % 1440
  return `${pad(Math.floor(adjusted / 60))}:${pad(adjusted % 60)}`
}

function buildDisplayTimes(times: PrayerTimes, offsets: PrayerOffsets): PrayerTimes {
  if (!Object.values(offsets).some(Boolean)) return times
  const out = { ...times }
  for (const key of PRAYER_KEYS) {
    const off = offsets[key]
    if (off && times[key as keyof PrayerTimes]) {
      ;(out as Record<string, unknown>)[key] = applyOffset(times[key as keyof PrayerTimes] as string, off)
    }
  }
  return out
}

function prayerLabel(key: PKey, lang: LangCode, lang2?: LangCode) {
  const primary = PRAYER_NAMES[lang]?.[key] ?? key
  if (!lang2 || lang2 === lang) return { primary, secondary: null }
  return { primary, secondary: PRAYER_NAMES[lang2]?.[key] ?? null }
}

function getNext(times: PrayerTimes, lang: LangCode) {
  const now = new Date()
  let prevDate: Date | null = null

  for (const key of PRAYER_KEYS) {
    const t = times[key as keyof PrayerTimes] as string
    if (!t) continue
    const [h, m] = t.split(':').map(Number)
    const target = new Date(now)
    target.setHours(h, m, 0, 0)
    if (target > now) {
      const diff = Math.floor((target.getTime() - now.getTime()) / 1000)
      const prevSecs = prevDate ? Math.floor((now.getTime() - prevDate.getTime()) / 1000) : null
      return {
        key,
        label: PRAYER_NAMES[lang]?.[key] ?? key,
        remaining: `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`,
        totalSecs: diff,
        prevSecs,
      }
    }
    // Merke letzte vergangene Gebetszeit
    prevDate = new Date(now)
    prevDate.setHours(h, m, 0, 0)
  }

  // Nach Isha: nächste Gebetszeit ist Fajr von morgen (Imsak)
  const fajrStr = times.fajr as string
  if (fajrStr) {
    const [h, m] = fajrStr.split(':').map(Number)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(h, m, 0, 0)
    const diff = Math.floor((tomorrow.getTime() - now.getTime()) / 1000)
    const prevSecs = prevDate ? Math.floor((now.getTime() - prevDate.getTime()) / 1000) : null
    return {
      key: 'fajr' as PKey,
      label: PRAYER_NAMES[lang]?.['fajr'] ?? 'fajr',
      remaining: `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`,
      totalSecs: diff,
      prevSecs,
    }
  }
  return null
}

export type ClockStyle = 'digital' | 'analog' | 'none'

interface ThemeProps {
  times: PrayerTimes; now: Date; date: string
  next: ReturnType<typeof getNext>
  mosqueName: string; mosqueAddress: string; bgImage: string; ticker: string
  logoUrl?: string
  lang: LangCode; lang2?: LangCode
  clockStyle: ClockStyle
}

// ─── Moon phase ───────────────────────────────────────────────────────────────

/** Returns current lunar phase 0–1 (0 = Neumond, 0.5 = Vollmond) */
function getMoonPhase(date = new Date()): number {
  // Julian date of known new moon: 6 Jan 2000 18:14 UTC
  const KNOWN_NEW_MOON_JD = 2451550.259722
  const LUNAR_CYCLE = 29.530588853
  const jd = date.getTime() / 86400000 + 2440587.5
  return (((jd - KNOWN_NEW_MOON_JD) % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE / LUNAR_CYCLE
}

/** Renders the current real moon phase as SVG */
function MoonPhaseSvg({ phase, size, color }: { phase: number; size: number; color: string }) {
  const r = size / 2

  // New moon — dark circle with faint outline
  if (phase < 0.025 || phase > 0.975) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={r} cy={r} r={r - 1} fill="rgba(0,0,0,0.3)" stroke={color} strokeWidth={1.5} opacity={0.45} />
      </svg>
    )
  }
  // Full moon
  if (phase > 0.475 && phase < 0.525) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={r} cy={r} r={r} fill={color} />
      </svg>
    )
  }

  // General crescent / gibbous
  // kx: terminator x-radius; positive = crescent, negative = gibbous
  const isWaxing = phase < 0.5
  const kx = Math.cos(Math.PI * 2 * phase) * r
  const absKx = Math.abs(kx)
  const top = `${r} ${0}`, bottom = `${r} ${size}`

  let path: string
  if (isWaxing) {
    // Right side lit
    const ts = kx > 0 ? 0 : 1
    path = `M ${top} A ${r} ${r} 0 1 1 ${bottom} A ${absKx} ${r} 0 0 ${ts} ${top}`
  } else {
    // Left side lit
    const ts = kx > 0 ? 1 : 0
    path = `M ${top} A ${r} ${r} 0 1 0 ${bottom} A ${absKx} ${r} 0 0 ${ts} ${top}`
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <path d={path} fill={color} />
    </svg>
  )
}

/** Logo if provided, otherwise the real current moon phase */
function LogoOrMoonPhase({ logoUrl, color, size }: { logoUrl?: string; color: string; size: number }) {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt=""
        style={{ width: size * 1.4, height: size * 1.4, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, opacity: 0.92 }}
      />
    )
  }
  return <MoonPhaseSvg phase={getMoonPhase()} size={size * 1.4} color={color} />
}

// ─── Clock components ─────────────────────────────────────────────────────────

function DigitalClock({ now, color, fontSize = '3.2vh' }: { now: Date; color: string; fontSize?: string }) {
  return (
    <div className="font-mono tabular-nums" style={{ color, fontSize, fontWeight: 200, letterSpacing: '0.06em', lineHeight: 1 }}>
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </div>
  )
}

function AnalogClock({ now, color, size = '10vh' }: { now: Date; color: string; size?: string | number }) {
  const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds()
  const pt = (deg: number, r: number) => ({
    x: 50 + r * Math.cos((deg - 90) * Math.PI / 180),
    y: 50 + r * Math.sin((deg - 90) * Math.PI / 180),
  })
  const cssSize = typeof size === 'number' ? `${size}px` : size
  return (
    <div style={{ width: cssSize, height: cssSize, flexShrink: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="rgba(0,0,0,0.3)" stroke={color} strokeWidth="1.2" opacity="0.5" />
        {Array.from({ length: 12 }).map((_, i) => {
          const o = pt(i * 30, 42), e = pt(i * 30, 47)
          return <line key={i} x1={o.x} y1={o.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={i % 3 === 0 ? 2 : 1} opacity="0.6" />
        })}
        <line x1="50" y1="50" x2={pt((h + m / 60) * 30, 26).x} y2={pt((h + m / 60) * 30, 26).y} stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        <line x1="50" y1="50" x2={pt((m + s / 60) * 6, 35).x} y2={pt((m + s / 60) * 6, 35).y} stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <line x1="50" y1="50" x2={pt(s * 6, 39).x} y2={pt(s * 6, 39).y} stroke="rgba(255,150,80,0.9)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3" fill={color} opacity="0.9" />
      </svg>
    </div>
  )
}

function InlineClock({ now, clockStyle, color, digitalSize = '3.2vh', analogSize = '10vh' }: {
  now: Date; clockStyle: ClockStyle; color: string; digitalSize?: string; analogSize?: string
}) {
  if (clockStyle === 'none') return null
  if (clockStyle === 'analog') return <AnalogClock now={now} color={color} size={analogSize} />
  return <DigitalClock now={now} color={color} fontSize={digitalSize} />
}

// ─── Shared decorative ────────────────────────────────────────────────────────

function Ticker({ text, color = 'rgba(255,255,255,0.35)', bg = 'rgba(0,0,0,0.5)' }: { text: string; color?: string; bg?: string }) {
  if (!text) return null
  const sep = <span style={{ margin: '0 4vw', opacity: 0.4 }} aria-hidden>✦</span>
  return (
    <div className="overflow-hidden shrink-0 flex items-center" style={{ background: bg, height: '5.5vh' }}>
      <div className="whitespace-nowrap font-light" style={{ color, fontSize: '2vh', animation: 'ticker-run 40s linear infinite' }}>
        {text}{sep}{text}{sep}{text}{sep}
      </div>
      <style>{`@keyframes ticker-run{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}`}</style>
    </div>
  )
}


function OrnamentDivider({ color = 'rgba(212,168,67,0.4)' }: { color?: string }) {
  return (
    <div className="flex items-center" style={{ gap: '1.5vw', width: '100%' }}>
      <div style={{ flex: 1, height: 1, background: color }} />
      <svg width="14" height="14" viewBox="-10 -10 20 20" fill={color} aria-hidden>
        <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z" />
      </svg>
      <div style={{ flex: 1, height: 1, background: color }} />
    </div>
  )
}

function StarField({ count = 80, topPct = 75 }: { count?: number; topPct?: number }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: i * 41 % 100, y: i * 67 % topPct,
    r: i % 9 === 0 ? 1.5 : i % 4 === 0 ? 1 : 0.6,
    delay: `${(i * 0.41 % 4).toFixed(2)}s`,
    dur: `${(2.5 + i % 3).toFixed(1)}s`,
  })), [count, topPct])
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{
          width: s.r * 2, height: s.r * 2, top: `${s.y}%`, left: `${s.x}%`,
          animation: `twinkle ${s.dur} ease-in-out ${s.delay} infinite`,
        }} />
      ))}
      <style>{`@keyframes twinkle{0%,100%{opacity:.08}50%{opacity:.75}}`}</style>
    </div>
  )
}

function GeomPattern({ opacity = 0.025 }: { opacity?: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }} aria-hidden>
      <defs>
        <pattern id="gp" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M40 5 L46 26 L65 20 L53 36 L65 52 L46 46 L40 67 L34 46 L15 52 L27 36 L15 20 L34 26Z"
            fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="40" cy="40" r="6" fill="none" stroke="white" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gp)" />
    </svg>
  )
}

// ─── Portrait (9:16) shared layout ───────────────────────────────────────────

interface PortraitColors {
  bg: string; accent: string; muted: string; border: string; rowHi: string; bar: string; clockColor: string
}

function PortraitLayout({ times, now, date, next, mosqueName, bgImage, ticker, logoUrl, lang, lang2, clockStyle, colors }: ThemeProps & { colors: PortraitColors }) {
  const { bg, accent, muted, border, rowHi, bar, clockColor } = colors
  const ui = UI[lang]
  const txt = 'rgba(255,255,255,0.92)'
  const bgFinal = bgImage ? `url(${bgImage}) center/cover no-repeat` : bg
  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col select-none" style={{ background: bgFinal }}>
      {bgImage && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.78)' }} />}
      <div className="relative z-10 flex flex-col h-full" style={{ color: txt }}>

        {/* Mosque + clock */}
        <div className="shrink-0 flex items-center justify-between" style={{ height: '12vh', padding: '0 5vw', borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-3 min-w-0 flex-1" style={{ marginRight: '2vw' }}>
            <LogoOrMoonPhase logoUrl={logoUrl} color={accent} size={34} />
            <div className="font-bold truncate" style={{ color: accent, fontSize: '3.8vh', lineHeight: 1.1 }}>
              {mosqueName || 'Moschee'}
            </div>
          </div>
          <InlineClock now={now} clockStyle={clockStyle} color={clockColor} digitalSize="2.8vh" analogSize="9vh" />
        </div>

        {/* Dates */}
        <div className="shrink-0 flex flex-col items-center justify-center" style={{ height: '14vh', borderBottom: `1px solid ${border}`, gap: '0.8vh', padding: '0 5vw' }}>
          {times.hijriDateLong && (
            <div className="font-semibold text-center" style={{ color: accent, fontSize: '3.2vh', lineHeight: 1 }}>{times.hijriDateLong}</div>
          )}
          <div className="text-center" style={{ color: muted, fontSize: '2.2vh' }}>{date}</div>
        </div>

        {/* Countdown */}
        <div className="shrink-0 flex items-center justify-between" style={{ height: '16vh', padding: '0 5vw', borderBottom: `1px solid ${border}`, background: next ? rowHi : 'transparent' }}>
          {next ? (
            <>
              <div>
                <div style={{ color: muted, fontSize: '1.5vh', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '0.8vh' }}>{ui.next}</div>
                <div className="font-bold" style={{ color: accent, fontSize: '4.5vh', lineHeight: 1 }}>{next.label}</div>
              </div>
              <div className="font-mono font-thin tabular-nums" style={{ color: accent, fontSize: '6.5vh', letterSpacing: '0.04em', lineHeight: 1 }}>{next.remaining}</div>
            </>
          ) : (
            <div style={{ color: muted, fontSize: '1.5vh', letterSpacing: '0.25em', textTransform: 'uppercase' }}>{ui.prayer}</div>
          )}
        </div>

        {/* Prayer rows */}
        <div className="flex-1 flex flex-col min-h-0">
          {PRAYER_KEYS.map((key, i) => {
            const isNext = next?.key === key
            const { primary, secondary } = prayerLabel(key, lang, lang2)
            return (
              <div key={key} className="flex-1 flex items-center justify-between relative min-h-0 transition-colors"
                style={{ padding: '0 5vw', background: isNext ? rowHi : 'transparent', borderBottom: i < 5 ? `1px solid ${border}` : 'none' }}>
                {isNext && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: bar }} />}
                <div style={{ paddingLeft: isNext ? '3vw' : 0 }}>
                  <div style={{ color: isNext ? accent : muted, fontSize: '2.6vh', fontWeight: isNext ? 700 : 400, direction: isRTL(lang) ? 'rtl' : 'ltr' }}>{primary}</div>
                  {secondary && <div style={{ color: isNext ? accent : 'rgba(255,255,255,0.50)', fontSize: '1.8vh', marginTop: '0.2vh', direction: lang2 && isRTL(lang2) ? 'rtl' : 'ltr' }}>{secondary}</div>}
                </div>
                <div className="font-mono font-bold tabular-nums" style={{ color: isNext ? accent : txt, fontSize: '5.5vh', lineHeight: 1 }}>
                  {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
                </div>
              </div>
            )
          })}
        </div>

        {ticker && <Ticker text={ticker} color={muted} bg="rgba(0,0,0,0.5)" />}
      </div>
    </div>
  )
}

function useIsPortrait() {
  const [p, setP] = useState(() => typeof window !== 'undefined' && window.innerWidth < window.innerHeight)
  useEffect(() => {
    const fn = () => setP(window.innerWidth < window.innerHeight)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return p
}

// ─── MADINAH — Al-Masjid an-Nabawi ───────────────────────────────────────────
// Deep forest green, warm gold, the Prophet's Mosque palette

function MadinahTheme({ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }: ThemeProps) {
  const portrait = useIsPortrait()
  const ui = UI[lang]
  const gold = '#c9922a'
  const goldBright = '#f0c060'
  const portraitColors: PortraitColors = {
    bg: '#020d05', accent: goldBright, muted: 'rgba(255,255,255,0.56)',
    border: 'rgba(201,146,42,0.14)', rowHi: 'rgba(201,146,42,0.1)', bar: gold, clockColor: 'rgba(240,192,96,0.7)',
  }
  if (portrait) return <PortraitLayout {...{ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }} colors={portraitColors} />

  const bgStyle = bgImage
    ? `url(${bgImage}) center/cover no-repeat`
    : 'linear-gradient(175deg,#020d05 0%,#04100a 50%,#030e06 100%)'

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col select-none" style={{ background: bgStyle, color: '#fff' }}>
      {bgImage && <div className="absolute inset-0" style={{ background: 'rgba(2,13,5,0.88)' }} />}
      <StarField count={60} topPct={65} />
      <GeomPattern opacity={0.022} />
      <div className="absolute pointer-events-none" style={{
        top: '12%', left: '50%', transform: 'translateX(-50%)',
        width: '55vw', height: '38vh',
        background: 'radial-gradient(ellipse, rgba(170,110,15,0.08) 0%, transparent 70%)',
      }} />

      {/* ── Top bar: [Mosque] [Dates] [Clock] ── */}
      <div className="relative z-10 flex items-center shrink-0"
        style={{ height: '14vh', padding: '0 4vw', borderBottom: `1px solid rgba(201,146,42,0.14)` }}>

        <div className="flex items-center gap-3 min-w-0" style={{ flex: '1 1 0' }}>
          <LogoOrMoonPhase logoUrl={logoUrl} color={gold} size={34} />
          <div className="min-w-0">
            <div className="font-bold truncate" style={{ color: goldBright, fontSize: '3.2vh', lineHeight: 1.1 }}>
              {mosqueName || 'Moschee'}
            </div>
            {mosqueAddress && (
              <div className="truncate" style={{ color: 'rgba(255,255,255,0.32)', fontSize: '1.7vh', marginTop: '0.4vh' }}>{mosqueAddress}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center shrink-0" style={{ padding: '0 3vw', gap: '0.5vh' }}>
          {times.hijriDateLong && (
            <div className="font-semibold text-center" style={{ color: gold, fontSize: '2.8vh', lineHeight: 1 }}>{times.hijriDateLong}</div>
          )}
          <div className="text-center" style={{ color: 'rgba(255,255,255,0.42)', fontSize: '2vh', lineHeight: 1 }}>{date}</div>
        </div>

        <div className="flex justify-end shrink-0" style={{ flex: '0 0 auto', minWidth: clockStyle === 'analog' ? 86 : 80 }}>
          <InlineClock now={now} clockStyle={clockStyle} color="rgba(240,192,96,0.72)" digitalSize="3.2vh" analogSize="10vh" />
        </div>
      </div>

      {/* ── Breathing space ── */}
      <div className="relative z-10 flex-1" />

      {/* ── Countdown zone ── */}
      <div className="relative z-10 shrink-0 flex items-center justify-between"
        style={{ height: '14vh', padding: '0 5vw', borderTop: `1px solid rgba(201,146,42,0.12)`, borderBottom: `1px solid rgba(201,146,42,0.12)` }}>
        {next ? (
          <>
            <div className="flex items-center gap-4">
              <div style={{ width: 3, height: '6vh', background: gold, borderRadius: 2, boxShadow: `0 0 14px ${gold}` }} />
              <div>
                <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: '1.5vh', textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: '0.5vh' }}>{ui.next}</div>
                <div className="font-bold" style={{ color: goldBright, fontSize: '4vh', lineHeight: 1 }}>{next.label}</div>
              </div>
            </div>
            <div className="font-mono font-thin tabular-nums" style={{ color: '#fff', fontSize: '6.5vh', letterSpacing: '0.05em', lineHeight: 1 }}>
              {next.remaining}
            </div>
          </>
        ) : (
          <div style={{ color: 'rgba(201,146,42,0.3)', fontSize: '1.5vh', letterSpacing: '0.3em', textTransform: 'uppercase' }}>{ui.prayer}</div>
        )}
      </div>

      {/* ── Prayer grid 6-col ── */}
      <div className="relative z-10 grid grid-cols-6 shrink-0" style={{ height: '43vh' }}>
        {PRAYER_KEYS.map((key, i) => {
          const isNext = next?.key === key
          const { primary, secondary } = prayerLabel(key, lang, lang2)
          return (
            <div key={key} className="flex flex-col items-center justify-center relative transition-all"
              style={{
                background: isNext ? 'rgba(201,146,42,0.13)' : 'transparent',
                borderRight: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderTop: '1px solid rgba(201,146,42,0.1)',
                boxShadow: isNext ? 'inset 0 0 60px rgba(201,146,42,0.08)' : 'none',
              }}>
              {isNext && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gold, boxShadow: `0 0 18px 2px ${gold}` }} />}
              <div className="text-center" style={{
                color: isNext ? goldBright : 'rgba(255,255,255,0.62)',
                fontSize: '2.2vh', fontWeight: 600,
                letterSpacing: isRTL(lang) ? 0 : '0.07em',
                direction: isRTL(lang) ? 'rtl' : 'ltr',
              }}>{primary}</div>
              {secondary && (
                <div className="text-center" style={{
                  color: isNext ? gold : 'rgba(255,255,255,0.44)',
                  fontSize: '1.6vh', marginTop: '0.3vh',
                  direction: lang2 && isRTL(lang2) ? 'rtl' : 'ltr',
                }}>{secondary}</div>
              )}
              <div className="font-mono font-bold tabular-nums" style={{
                color: isNext ? '#fff' : 'rgba(255,255,255,0.88)',
                fontSize: '8vh', marginTop: '1vh', lineHeight: 1,
                textShadow: isNext ? `0 0 32px rgba(201,146,42,0.9)` : 'none',
              }}>
                {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
              </div>
            </div>
          )
        })}
      </div>

      {ticker && <Ticker text={ticker} color="rgba(201,146,42,0.6)" bg="rgba(0,0,0,0.5)" />}
    </div>
  )
}

// ─── BOSPHORUS — Istanbul, Sultanahmet ────────────────────────────────────────
// Deep navy, Ottoman amber, Bosphorus at dusk. Split layout.

function BosphorusTheme({ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }: ThemeProps) {
  const portrait = useIsPortrait()
  const ui = UI[lang]
  const amber = '#e8a020'
  const amberBright = '#f5c842'
  const portraitColors: PortraitColors = {
    bg: '#030c1a', accent: amberBright, muted: 'rgba(255,255,255,0.56)',
    border: 'rgba(232,160,32,0.13)', rowHi: 'rgba(232,160,32,0.1)', bar: amber, clockColor: 'rgba(245,200,66,0.7)',
  }
  if (portrait) return <PortraitLayout {...{ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }} colors={portraitColors} />

  const bgStyle = bgImage
    ? `url(${bgImage}) center/cover no-repeat`
    : 'linear-gradient(145deg,#040e1c 0%,#091a30 45%,#061020 100%)'

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col select-none" style={{ background: bgStyle, color: '#fff' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(3,10,24,0.97) 0%, rgba(3,10,24,0.94) 44%, rgba(0,0,0,0.05) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 65%, rgba(0,0,0,0.45) 100%)' }} />

      {/* Vertical gold separator */}
      <div className="absolute z-10" style={{
        left: '44%', top: '3%', bottom: ticker ? '5.5vh' : '2%', width: 1,
        background: `linear-gradient(to bottom, transparent, rgba(232,160,32,0.55) 15%, rgba(232,160,32,0.55) 85%, transparent)`,
      }} />

      <div className="relative z-10 flex flex-1 min-h-0">

        {/* ── Left: mosque header + prayer list ── */}
        <div className="flex flex-col shrink-0" style={{ width: '44%' }}>

          {/* Mosque header */}
          <div className="shrink-0 flex items-center gap-3" style={{ height: '14vh', padding: '0 3.5vw', borderBottom: `1px solid rgba(232,160,32,0.1)` }}>
            <LogoOrMoonPhase logoUrl={logoUrl} color={amber} size={28} />
            <div className="min-w-0">
              <div className="font-bold truncate" style={{ color: amberBright, fontSize: '3vh', lineHeight: 1.1 }}>{mosqueName || 'Moschee'}</div>
              {mosqueAddress && <div className="truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.7vh', marginTop: '0.4vh' }}>{mosqueAddress}</div>}
            </div>
          </div>

          {/* Prayer list — flex rows */}
          <div className="flex-1 flex flex-col min-h-0">
            {PRAYER_KEYS.map(key => {
              const isNext = next?.key === key
              const { primary, secondary } = prayerLabel(key, lang, lang2)
              return (
                <div key={key} className="flex-1 flex items-center justify-between relative min-h-0 transition-all"
                  style={{ padding: '0 3.5vw', background: isNext ? 'rgba(232,160,32,0.1)' : 'transparent', borderLeft: `3px solid ${isNext ? amber : 'transparent'}` }}>
                  <div className="min-w-0">
                    <div style={{
                      color: isNext ? amberBright : 'rgba(255,255,255,0.58)',
                      fontSize: '2.4vh', fontWeight: isNext ? 700 : 400,
                      direction: isRTL(lang) ? 'rtl' : 'ltr', letterSpacing: '0.02em',
                    }}>{primary}</div>
                    {secondary && (
                      <div style={{
                        color: isNext ? amber : 'rgba(255,255,255,0.48)',
                        fontSize: '1.7vh', direction: lang2 && isRTL(lang2) ? 'rtl' : 'ltr', marginTop: '0.2vh',
                      }}>{secondary}</div>
                    )}
                  </div>
                  <div className="font-mono font-bold tabular-nums shrink-0" style={{
                    color: isNext ? amberBright : 'rgba(255,255,255,0.88)',
                    fontSize: '5.8vh', lineHeight: 1,
                    textShadow: isNext ? `0 0 28px rgba(232,160,32,0.9)` : 'none',
                  }}>
                    {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: clock + dates + countdown ── */}
        <div className="flex-1 flex flex-col" style={{ padding: '3.5vh 4vw' }}>

          {/* Clock — top right of right panel */}
          <div className="flex justify-end shrink-0" style={{ marginBottom: '2.5vh' }}>
            <InlineClock now={now} clockStyle={clockStyle} color="rgba(245,200,66,0.65)" digitalSize="3.2vh" analogSize="10vh" />
          </div>

          {/* Dates */}
          <div className="shrink-0 flex flex-col items-center" style={{ gap: '0.7vh', marginBottom: '3.5vh' }}>
            {times.hijriDateLong && (
              <div className="font-semibold text-center" style={{ color: amber, fontSize: '3vh', lineHeight: 1 }}>{times.hijriDateLong}</div>
            )}
            <div className="text-center" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '2.2vh' }}>{date}</div>
          </div>

          <OrnamentDivider color="rgba(232,160,32,0.3)" />

          {/* Countdown */}
          {next && (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: '2vh', marginTop: '2vh' }}>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '1.5vh', textTransform: 'uppercase', letterSpacing: '0.3em' }}>{ui.next}</div>
              <div className="font-bold text-center" style={{ color: amberBright, fontSize: '5vh', lineHeight: 1, textShadow: `0 0 30px rgba(232,160,32,0.55)` }}>
                {next.label}
              </div>
              <div className="font-mono font-thin tabular-nums text-center" style={{ color: '#fff', fontSize: '7.5vh', lineHeight: 1, letterSpacing: '0.04em' }}>
                {next.remaining}
              </div>
              <div style={{ width: '80%', height: 2, background: 'rgba(232,160,32,0.1)', borderRadius: 999 }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  background: `linear-gradient(to right, rgba(232,160,32,0.3), ${amber})`,
                  width: `${next.prevSecs != null ? Math.round(next.prevSecs / (next.prevSecs + next.totalSecs) * 100) : 0}%`,
                  transition: 'width 1s linear', boxShadow: `0 0 8px rgba(232,160,32,0.6)`,
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {ticker && <Ticker text={ticker} color="rgba(232,160,32,0.6)" bg="rgba(0,0,0,0.7)" />}
    </div>
  )
}

// ─── MEKKA — Masjid al-Haram, Ka'bah ─────────────────────────────────────────
// Cosmic black, pure gold — the Kiswah (Ka'bah cloth) palette. Ring = Tawaf.

function MekkaTheme({ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }: ThemeProps) {
  const portrait = useIsPortrait()
  const ui = UI[lang]
  const gold = '#d4af37'
  const goldBright = '#fde68a'
  const goldGlow = 'rgba(212,175,55,0.45)'
  const r = 46, circ = 2 * Math.PI * r
  const fillPct = next && next.prevSecs != null ? next.prevSecs / (next.prevSecs + next.totalSecs) : 0
  const portraitColors: PortraitColors = {
    bg: '#00000a', accent: goldBright, muted: 'rgba(255,255,255,0.56)',
    border: 'rgba(212,175,55,0.13)', rowHi: 'rgba(212,175,55,0.1)', bar: gold, clockColor: 'rgba(253,230,138,0.65)',
  }
  if (portrait) return <PortraitLayout {...{ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }} colors={portraitColors} />

  const bgStyle = bgImage
    ? `url(${bgImage}) center/cover no-repeat`
    : 'radial-gradient(ellipse at 50% 0%, #180c00 0%, #080400 40%, #000000 75%)'

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col select-none" style={{ background: bgStyle, color: '#fff' }}>
      {bgImage && <div className="absolute inset-0" style={{ background: 'rgba(0,0,4,0.87)' }} />}
      <StarField count={100} topPct={80} />
      <GeomPattern opacity={0.02} />
      <div className="absolute pointer-events-none" style={{
        top: 0, left: '25%', right: '25%', height: '45vh',
        background: 'radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)',
      }} />

      {/* Clock — absolute top-right (centered layout has no top bar) */}
      {clockStyle !== 'none' && (
        <div className="relative z-20" style={{ position: 'absolute', top: '2.5vh', right: '3vw' }}>
          <InlineClock now={now} clockStyle={clockStyle} color="rgba(212,175,55,0.55)" digitalSize="3vh" analogSize="10vh" />
        </div>
      )}

      {/* Header: centered mosque + dates */}
      <div className="relative z-10 text-center shrink-0" style={{ paddingTop: '3vh' }}>
        <div className="flex items-center justify-center gap-3">
          <LogoOrMoonPhase logoUrl={logoUrl} color={gold} size={28} />
          <div className="font-bold" style={{ color: goldBright, fontSize: '3.2vh', letterSpacing: '0.02em' }}>{mosqueName || 'Moschee'}</div>
          {!logoUrl && <MoonPhaseSvg phase={getMoonPhase()} size={28 * 1.4} color={gold} />}
        </div>
        {mosqueAddress && <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '1.7vh', marginTop: '0.5vh' }}>{mosqueAddress}</div>}
        <div className="flex items-center justify-center" style={{ gap: '2vw', marginTop: '0.8vh' }}>
          {times.hijriDateLong && (
            <div className="font-semibold" style={{ color: gold, fontSize: '2.8vh', lineHeight: 1 }}>{times.hijriDateLong}</div>
          )}
          {times.hijriDateLong && <div style={{ color: 'rgba(255,255,255,0.2)' }}>·</div>}
          <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '2.1vh' }}>{date}</div>
        </div>
      </div>

      {/* Ring (Tawaf) — flex-1 zone */}
      <div className="relative z-10 flex-1 flex items-center justify-center" style={{ minHeight: 0 }}>
        <div className="relative flex items-center justify-center" style={{ width: 'min(22vw, 28vh)', height: 'min(22vw, 28vh)' }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="57" fill="none" stroke="rgba(212,175,55,0.05)" strokeWidth="1" />
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * 2 * Math.PI - Math.PI / 2
              const long = i % 6 === 0, r1 = long ? 50 : 52, r2 = 55
              return <line key={i}
                x1={60 + r1 * Math.cos(angle)} y1={60 + r1 * Math.sin(angle)}
                x2={60 + r2 * Math.cos(angle)} y2={60 + r2 * Math.sin(angle)}
                stroke="rgba(212,175,55,0.32)" strokeWidth={long ? 1.5 : 0.7} />
            })}
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth="5" />
            <circle cx="60" cy="60" r={r} fill="none" stroke={gold} strokeWidth="5"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - fillPct)} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${gold})`, transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="text-center" style={{ lineHeight: 1 }}>
            {next
              ? <div className="font-semibold" style={{ color: goldBright, fontSize: 'clamp(1rem, 2.3vw, 2.2rem)' }}>{next.label}</div>
              : <div style={{ color: 'rgba(212,175,55,0.3)', fontSize: '1.4vw' }}>—</div>
            }
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="relative z-10 shrink-0 flex items-center justify-between"
        style={{ height: '13vh', padding: '0 5vw', borderTop: `1px solid rgba(212,175,55,0.15)`, borderBottom: `1px solid rgba(212,175,55,0.1)` }}>
        {next ? (
          <>
            <div className="flex items-center gap-4">
              <div style={{ width: 3, height: '5vh', background: gold, borderRadius: 2, boxShadow: `0 0 12px ${gold}` }} />
              <div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.5vh', textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: '0.5vh' }}>{ui.next}</div>
                <div className="font-bold" style={{ color: goldBright, fontSize: '4vh', lineHeight: 1, textShadow: `0 0 20px ${goldGlow}` }}>{next.label}</div>
              </div>
            </div>
            <div className="font-mono font-thin tabular-nums" style={{ color: '#fff', fontSize: '6.5vh', letterSpacing: '0.05em', lineHeight: 1, textShadow: `0 0 30px ${goldGlow}` }}>
              {next.remaining}
            </div>
          </>
        ) : null}
      </div>

      {/* Prayer grid 3×2 */}
      <div className="relative z-10 grid grid-cols-3 shrink-0"
        style={{ width: '100%', height: '36vh', padding: '1.2vh 2.5vw 1.2vh', gap: '0.8vh 0.8vw' }}>
        {PRAYER_KEYS.map(key => {
          const isNext = next?.key === key
          const { primary, secondary } = prayerLabel(key, lang, lang2)
          return (
            <div key={key} className="flex flex-col items-center justify-center rounded-xl relative transition-all" style={{
              background: isNext ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${isNext ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.05)'}`,
              boxShadow: isNext ? `0 0 40px rgba(212,175,55,0.2), inset 0 0 25px rgba(212,175,55,0.06)` : 'none',
            }}>
              {isNext && <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: gold, boxShadow: `0 0 10px 2px ${gold}`, borderRadius: 999 }} />}
              <div className="text-center" style={{
                color: isNext ? goldBright : 'rgba(255,255,255,0.65)',
                fontSize: '2.2vh', fontWeight: 600,
                direction: isRTL(lang) ? 'rtl' : 'ltr',
                letterSpacing: isRTL(lang) ? 0 : '0.07em',
              }}>{primary}</div>
              {secondary && (
                <div className="text-center" style={{
                  color: isNext ? gold : 'rgba(255,255,255,0.46)',
                  fontSize: '1.6vh', marginTop: '0.3vh',
                  direction: lang2 && isRTL(lang2) ? 'rtl' : 'ltr',
                }}>{secondary}</div>
              )}
              <div className="font-mono font-bold tabular-nums" style={{
                color: isNext ? '#fff' : 'rgba(255,255,255,0.88)',
                fontSize: '7vh', marginTop: '0.8vh', lineHeight: 1,
                textShadow: isNext ? `0 0 28px ${goldGlow}` : 'none',
              }}>
                {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
              </div>
            </div>
          )
        })}
      </div>

      {ticker && <Ticker text={ticker} color="rgba(212,175,55,0.6)" bg="rgba(0,0,0,0.6)" />}
    </div>
  )
}

// ─── NIGHT — Universal minimalist ────────────────────────────────────────────
// Cinema black, pure white. Bauhaus-meets-Islamic-geometry.

function NightTheme({ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }: ThemeProps) {
  const portrait = useIsPortrait()
  const ui = UI[lang]
  const w85 = 'rgba(255,255,255,0.85)'
  const w38 = 'rgba(255,255,255,0.38)'
  const w12 = 'rgba(255,255,255,0.12)'
  const w54 = 'rgba(255,255,255,0.54)'
  const portraitColors: PortraitColors = {
    bg: '#000000', accent: w85, muted: w54, border: 'rgba(255,255,255,0.07)',
    rowHi: 'rgba(255,255,255,0.05)', bar: '#fff', clockColor: w38,
  }
  if (portrait) return <PortraitLayout {...{ times, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl, lang, lang2, clockStyle }} colors={portraitColors} />

  const bgStyle = bgImage
    ? `url(${bgImage}) center/cover no-repeat`
    : '#000000'

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col select-none" style={{ background: bgStyle, color: '#fff' }}>
      {bgImage && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.88)' }} />}
      <StarField count={90} topPct={70} />
      <GeomPattern opacity={0.015} />

      {/* ── Top bar: [Mosque] [Dates] [Clock] ── */}
      <div className="relative z-10 flex items-center shrink-0"
        style={{ height: '14vh', padding: '0 5vw', borderBottom: `1px solid rgba(255,255,255,0.06)` }}>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <LogoOrMoonPhase logoUrl={logoUrl} color={w85} size={34} />
          <div className="min-w-0">
            <div className="font-light truncate" style={{ color: w85, fontSize: '3.2vh', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {mosqueName || 'Moschee'}
            </div>
            {mosqueAddress && (
              <div className="truncate" style={{ color: 'rgba(255,255,255,0.28)', fontSize: '1.7vh', marginTop: '0.4vh' }}>{mosqueAddress}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center shrink-0" style={{ padding: '0 5vw', gap: '0.6vh' }}>
          {times.hijriDateLong && (
            <div className="font-light text-center" style={{ color: w85, fontSize: '2.8vh', lineHeight: 1 }}>{times.hijriDateLong}</div>
          )}
          <OrnamentDivider color="rgba(255,255,255,0.12)" />
          <div className="text-center" style={{ color: w38, fontSize: '2vh' }}>{date}</div>
        </div>

        <div className="flex-1 flex justify-end">
          <InlineClock now={now} clockStyle={clockStyle} color={w38} digitalSize="3.2vh" analogSize="10vh" />
        </div>
      </div>

      {/* ── Breathing space ── */}
      <div className="relative z-10 flex-1" />

      {/* ── Countdown zone ── */}
      {next && (
        <div className="relative z-10 shrink-0 flex items-center justify-between"
          style={{ height: '14vh', padding: '0 5vw', borderTop: `1px solid ${w12}`, borderBottom: `1px solid ${w12}` }}>
          <div>
            <div style={{ color: w38, fontSize: '1.5vh', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.6vh' }}>{ui.next}</div>
            <div className="font-light" style={{ color: w85, fontSize: '4.2vh', lineHeight: 1, letterSpacing: '0.03em' }}>{next.label}</div>
          </div>
          <div className="flex flex-col items-end" style={{ gap: '1.5vh' }}>
            <div className="font-mono font-thin tabular-nums" style={{ color: '#fff', fontSize: '6.5vh', letterSpacing: '0.05em', lineHeight: 1 }}>
              {next.remaining}
            </div>
            <div style={{ width: '20vw', height: 1, background: w12, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'rgba(255,255,255,0.55)',
                width: `${Math.max(0, Math.min(100, (1 - next.totalSecs / (5 * 3600)) * 100))}%`,
                transition: 'width 1s linear',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Prayer grid 6-col ── */}
      <div className="relative z-10 grid grid-cols-6 shrink-0" style={{ height: '43vh', borderTop: `1px solid ${w12}` }}>
        {PRAYER_KEYS.map((key, i) => {
          const isNext = next?.key === key
          const { primary, secondary } = prayerLabel(key, lang, lang2)
          return (
            <div key={key} className="flex flex-col items-center justify-center relative"
              style={{ borderRight: i < 5 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
              {isNext && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#fff', boxShadow: '0 0 14px 2px rgba(255,255,255,0.5)' }} />}
              <div className="text-center" style={{
                color: isNext ? '#fff' : 'rgba(255,255,255,0.65)',
                fontSize: '2.2vh', fontWeight: isNext ? 600 : 300,
                letterSpacing: isRTL(lang) ? 0 : '0.1em',
                direction: isRTL(lang) ? 'rtl' : 'ltr',
              }}>{primary}</div>
              {secondary && (
                <div className="text-center" style={{
                  color: isNext ? w38 : 'rgba(255,255,255,0.40)',
                  fontSize: '1.6vh', marginTop: '0.4vh',
                  direction: lang2 && isRTL(lang2) ? 'rtl' : 'ltr',
                }}>{secondary}</div>
              )}
              <div className="font-mono tabular-nums" style={{
                color: isNext ? '#fff' : 'rgba(255,255,255,0.78)',
                fontSize: '8vh', marginTop: '1vh', lineHeight: 1,
                fontWeight: isNext ? 500 : 200,
                textShadow: isNext ? '0 0 40px rgba(255,255,255,0.4)' : 'none',
              }}>
                {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
              </div>
            </div>
          )
        })}
      </div>

      {ticker && <Ticker text={ticker} color="rgba(255,255,255,0.2)" bg="rgba(0,0,0,0.2)" />}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  /** Slide-level source (overrides screen cityId when set) */
  prayerSource?: PrayerSource | null
  /** Screen-level Diyanet city ID — used as fallback when prayerSource is absent */
  cityId?: number
  prayerTheme?: PrayerTheme
  mosqueName?: string; mosqueAddress?: string; bgImage?: string; ticker?: string
  /** Mosque logo — shown next to the name, replaces crescent icon */
  logoUrl?: string
  lang?: LangCode; lang2?: LangCode
  clockStyle?: ClockStyle
  offsets?: PrayerOffsets
}

export default function PrayerTimesSlide({
  prayerSource, cityId,
  prayerTheme = 'madinah',
  mosqueName = '', mosqueAddress = '', bgImage = '', ticker = '',
  logoUrl = '',
  lang = 'de', lang2, clockStyle = 'digital',
  offsets = {},
}: Props) {
  const [times, setTimes] = useState<PrayerTimes | null>(null)
  const [now, setNow] = useState(new Date())
  const [next, setNext] = useState<ReturnType<typeof getNext>>(null)

  useEffect(() => {
    // Need at least one source to fetch
    const hasDiyanet = prayerSource?.source === 'diyanet' ? prayerSource.cityId : cityId
    const hasCalc = prayerSource?.source === 'calculated'
    if (!hasDiyanet && !hasCalc) return

    function fetch() {
      getPrayerTimes(prayerSource, cityId).then(t => {
        if (!t) return
        setTimes(t)
        setNext(getNext(buildDisplayTimes(t, offsets), lang))
      }).catch(console.error)
    }

    fetch()

    // Re-fetch at midnight — for calculated source this picks up the new day's times
    function scheduleMidnight() {
      const n = new Date()
      const ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime()
      return setTimeout(() => { fetch(); timer = scheduleMidnight() }, ms)
    }

    let timer = scheduleMidnight()
    return () => clearTimeout(timer)
  }, [prayerSource, cityId, lang, offsets])

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      if (times) setNext(getNext(buildDisplayTimes(times, offsets), lang))
    }, 1000)
    return () => clearInterval(id)
  }, [times, lang, offsets])

  if (!times) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#000' }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  const displayTimes = buildDisplayTimes(times, offsets)
  const date = formatDate(now, lang)
  const props: ThemeProps = { times: displayTimes, now, date, next, mosqueName, mosqueAddress, bgImage, ticker, logoUrl: logoUrl || undefined, lang, lang2, clockStyle }

  switch (prayerTheme) {
    case 'madinah':   return <MadinahTheme   {...props} />
    case 'bosphorus': return <BosphorusTheme {...props} />
    case 'mekka':     return <MekkaTheme     {...props} />
    case 'night':     return <NightTheme     {...props} />
  }
}
