import { useEffect, useState, useCallback } from 'react'
import { getDailyPrayerTimes } from '../lib/awqatsalah'
import type { PrayerTimes, ThemeId } from '../types'

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'İmsak',
  sunrise: 'Güneş',
  dhuhr: 'Öğle',
  asr: 'İkindi',
  maghrib: 'Akşam',
  isha: 'Yatsı',
}

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

interface Props {
  cityId: number
  theme: ThemeId
  config: Record<string, unknown>
}

function getNextPrayer(times: PrayerTimes): { name: string; remaining: string } | null {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')

  for (const key of PRAYER_ORDER) {
    const timeStr = times[key as keyof PrayerTimes] as string
    if (!timeStr) continue
    const [h, m] = timeStr.split(':').map(Number)
    const prayerDate = new Date(now)
    prayerDate.setHours(h, m, 0, 0)
    if (prayerDate > now) {
      const diff = Math.floor((prayerDate.getTime() - now.getTime()) / 1000)
      const hours = Math.floor(diff / 3600)
      const mins = Math.floor((diff % 3600) / 60)
      const secs = diff % 60
      return {
        name: PRAYER_LABELS[key],
        remaining: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
      }
    }
  }
  return null
}

export default function PrayerTimesWidget({ cityId, theme }: Props) {
  const [times, setTimes] = useState<PrayerTimes | null>(null)
  const [countdown, setCountdown] = useState<{ name: string; remaining: string } | null>(null)

  useEffect(() => {
    if (!cityId) return
    getDailyPrayerTimes(cityId).then(setTimes).catch(console.error)
  }, [cityId])

  const tick = useCallback(() => {
    if (times) setCountdown(getNextPrayer(times))
  }, [times])

  useEffect(() => {
    const id = setInterval(tick, 1000)
    tick()
    return () => clearInterval(id)
  }, [tick])

  if (!times) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-gray-500">
        Gebetszeiten laden...
      </div>
    )
  }

  const themeClass = {
    'classic': 'bg-green-950 text-white',
    'modern-minimal': 'bg-white text-gray-900',
    'dark-elegant': 'bg-gray-950 text-amber-400',
    'ramadan': 'bg-indigo-950 text-yellow-300',
  }[theme]

  return (
    <div className={`h-full w-full flex flex-col ${themeClass}`}>
      {/* Countdown zur nächsten Gebetszeit */}
      {countdown && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <span className="text-sm opacity-70">Nächste: {countdown.name}</span>
          <span className="font-mono text-xl font-bold">{countdown.remaining}</span>
        </div>
      )}

      {/* Gebetszeiten-Tabelle */}
      <div className="flex-1 grid grid-rows-6">
        {PRAYER_ORDER.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between px-6 border-b border-white/5 last:border-0"
          >
            <span className="text-sm font-medium opacity-80">{PRAYER_LABELS[key]}</span>
            <span className="font-mono font-semibold text-lg">
              {(times[key as keyof PrayerTimes] as string) ?? '--:--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
