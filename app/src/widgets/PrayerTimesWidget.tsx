import { useEffect, useState, useCallback } from 'react'
import { getDailyPrayerTimes } from '../lib/awqatsalah'
import { PRAYER_NAMES, UI, isRTL, type LangCode } from '../lib/i18n'
import type { PrayerTimes, ThemeId } from '../types'

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type PrayerKey = typeof PRAYER_KEYS[number]

interface Props {
  cityId: number
  theme: ThemeId
  config: Record<string, unknown>
}

interface NextPrayer { key: PrayerKey; label: string; remaining: string }

const pad = (n: number) => String(n).padStart(2, '0')

function getNext(times: PrayerTimes, lang: LangCode): NextPrayer | null {
  const now = new Date()
  for (const key of PRAYER_KEYS) {
    const timeStr = times[key] as string
    if (!timeStr) continue
    const [h, m] = timeStr.split(':').map(Number)
    const t = new Date(now)
    t.setHours(h, m, 0, 0)
    if (t > now) {
      const diff = Math.floor((t.getTime() - now.getTime()) / 1000)
      return { key, label: PRAYER_NAMES[lang][key], remaining: `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}` }
    }
  }
  return null
}

const COLORS: Record<ThemeId, { bg: string; accent: string; dimText: string; rowHi: string; bar: string }> = {
  'classic':        { bg: '#071a0e',  accent: '#4ade80', dimText: 'rgba(255,255,255,0.4)', rowHi: 'rgba(74,222,128,0.1)',  bar: '#4ade80' },
  'modern-minimal': { bg: '#ffffff',  accent: '#16a34a', dimText: 'rgba(0,0,0,0.4)',       rowHi: 'rgba(22,163,74,0.07)',  bar: '#16a34a' },
  'dark-elegant':   { bg: '#080a0e',  accent: '#d4a843', dimText: 'rgba(255,255,255,0.35)', rowHi: 'rgba(212,168,67,0.1)', bar: '#d4a843' },
  'ramadan':        { bg: '#07071a',  accent: '#a78bfa', dimText: 'rgba(255,255,255,0.4)', rowHi: 'rgba(167,139,250,0.1)', bar: '#a78bfa' },
}

export default function PrayerTimesWidget({ cityId, theme, config }: Props) {
  const lang  = (config.lang  as LangCode) ?? 'de'
  const lang2 = config.lang2 as LangCode | undefined

  const [times, setTimes] = useState<PrayerTimes | null>(null)
  const [next,  setNext]  = useState<NextPrayer | null>(null)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    if (!cityId) return
    getDailyPrayerTimes(cityId).then(setTimes).catch(console.error)
  }, [cityId])

  const tick = useCallback(() => {
    setClock(new Date())
    if (times) setNext(getNext(times, lang))
  }, [times, lang])

  useEffect(() => {
    const id = setInterval(tick, 1000)
    tick()
    return () => clearInterval(id)
  }, [tick])

  const c = COLORS[theme] ?? COLORS['dark-elegant']
  const isLight = theme === 'modern-minimal'
  const textMain = isLight ? '#111' : '#fff'

  if (!times) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm" style={{ background: c.bg, color: c.dimText }}>
        {UI[lang].prayer}…
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none" style={{ background: c.bg, color: textMain }}>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0"
        style={{ padding: '1.5vh 2vw', borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}` }}>
        <span style={{ color: c.accent, fontSize: '1.4vh', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {UI[lang].prayer}
        </span>
        <span className="font-mono tabular-nums" style={{ color: c.dimText, fontSize: '1.6vh' }}>
          {pad(clock.getHours())}:{pad(clock.getMinutes())}:{pad(clock.getSeconds())}
        </span>
      </div>

      {/* Next prayer */}
      {next && (
        <div className="flex items-center justify-between shrink-0"
          style={{ padding: '1.2vh 2vw', background: c.rowHi, borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'}` }}>
          <span style={{ color: c.accent, fontSize: '1.5vh' }}>{UI[lang].next}: {next.label}</span>
          <span className="font-mono font-bold tabular-nums" style={{ color: c.accent, fontSize: '1.8vh' }}>{next.remaining}</span>
        </div>
      )}

      {/* Prayer rows — fill remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        {PRAYER_KEYS.map((key, i) => {
          const isNext = next?.key === key
          const primary   = PRAYER_NAMES[lang][key]
          const secondary = lang2 ? PRAYER_NAMES[lang2][key] : null
          const divColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'
          return (
            <div key={key} className="flex-1 flex items-center justify-between transition-colors"
              style={{
                padding: '0 2vw',
                background: isNext ? c.rowHi : 'transparent',
                borderBottom: i < 5 ? `1px solid ${divColor}` : 'none',
                position: 'relative',
              }}>
              {isNext && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: c.bar }} />
              )}
              <div className="flex flex-col gap-0" style={{ paddingLeft: isNext ? '0.8vw' : 0 }}>
                <span style={{
                  color: isNext ? c.accent : c.dimText,
                  fontSize: '1.8vh',
                  fontWeight: 600,
                  direction: isRTL(lang) ? 'rtl' : 'ltr',
                }}>
                  {primary}
                </span>
                {secondary && (
                  <span style={{
                    color: isNext ? c.accent : c.dimText,
                    fontSize: '1.3vh',
                    opacity: 0.7,
                    direction: lang2 && isRTL(lang2) ? 'rtl' : 'ltr',
                  }}>
                    {secondary}
                  </span>
                )}
              </div>
              <span className="font-mono font-bold tabular-nums" style={{ color: isNext ? c.accent : textMain, fontSize: '3.2vh', lineHeight: 1 }}>
                {(times[key] as string) ?? '--:--'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
