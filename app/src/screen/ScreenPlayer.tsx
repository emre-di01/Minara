import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { MosqueProfile, Playlist, PrayerSource, Screen, ScheduleEntry, Slide, TickerOverlay } from '../types'
import SlideRenderer from '../slides/SlideRenderer'

interface Props {
  hardwareId: string
}

export default function ScreenPlayer({ hardwareId }: Props) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [profile, setProfile] = useState<MosqueProfile | null>(null)
  const playlistIdRef = React.useRef<string | null>(null)

  async function fetchPlaylist(playlistId: string) {
    const { data } = await supabase.from('playlists').select('*').eq('id', playlistId).single()
    if (data) setPlaylist(data as Playlist)
  }

  useEffect(() => {
    async function load() {
      const { data: screenData } = await supabase
        .from('screens')
        .select('*')
        .eq('hardware_id', hardwareId)
        .single()

      if (!screenData) return
      setScreen(screenData as Screen)

      supabase.from('mosque_profiles').select('*').eq('user_id', screenData.owner_id).maybeSingle()
        .then(({ data }) => setProfile(data as MosqueProfile ?? null))

      const scheduleEntries = (screenData.schedule ?? []) as ScheduleEntry[]
      const activeId = resolveScheduledPlaylist(scheduleEntries, screenData.playlist_id)
      if (activeId) {
        playlistIdRef.current = activeId
        fetchPlaylist(activeId)
      }
    }

    load()

    function beat() {
      supabase.from('screens').update({ last_seen_at: new Date().toISOString() }).eq('hardware_id', hardwareId)
    }
    beat()
    const heartbeat = setInterval(beat, 30_000)

    const channel = supabase
      .channel(`player:${hardwareId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'screens',
        filter: `hardware_id=eq.${hardwareId}`,
      }, ({ new: updated }) => {
        const s = updated as Screen
        setScreen(s)
        const activeId = resolveScheduledPlaylist(s.schedule ?? [], s.playlist_id)
        if (activeId) {
          playlistIdRef.current = activeId
          fetchPlaylist(activeId)
        } else {
          playlistIdRef.current = null
          setPlaylist(null)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'playlists',
      }, ({ new: updated }) => {
        if (updated.id === playlistIdRef.current) {
          setPlaylist(updated as Playlist)
        }
      })
      .subscribe()

    return () => {
      clearInterval(heartbeat)
      supabase.removeChannel(channel)
    }
  }, [hardwareId])

  // Zeitplan jede Minute prüfen
  useEffect(() => {
    if (!screen) return
    const schedule = screen.schedule ?? []
    if (!schedule.length) return
    const id = setInterval(() => {
      const activeId = resolveScheduledPlaylist(schedule, screen.playlist_id)
      if (activeId && activeId !== playlistIdRef.current) {
        playlistIdRef.current = activeId
        fetchPlaylist(activeId)
      } else if (!activeId && playlistIdRef.current) {
        playlistIdRef.current = null
        setPlaylist(null)
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [screen])

  if (!screen) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    return <NoPlaylistScreen hardwareId={hardwareId} />
  }

  // Build effective cityId: screen override → profile Diyanet source → profile legacy city_id
  const profileSource = profile?.prayer_source ?? null
  const profileCityId = profileSource?.source === 'diyanet' ? profileSource.cityId : (profile?.city_id ?? null)
  const effectiveCityId = screen.city_id ?? profileCityId ?? 0

  return (
    <SlidePlayer
      playlist={playlist}
      cityId={effectiveCityId}
      defaultPrayerSource={profileSource}
      profile={profile}
    />
  )
}

function NoPlaylistScreen({ hardwareId }: { hardwareId: string }) {
  const [code] = useState(() => Math.floor(100000 + Math.random() * 900000).toString())
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth)

  useEffect(() => {
    const update = () => setIsPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    supabase.from('pairing_codes').upsert(
      { code, hardware_id: hardwareId },
      { onConflict: 'hardware_id' }
    )
    return () => {
      supabase.from('pairing_codes').delete().eq('hardware_id', hardwareId)
    }
  }, [hardwareId, code])

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-6 p-8">
      <p className="text-gray-400 tracking-widest uppercase text-sm text-center">Keine Playlist zugewiesen</p>
      <div
        className="font-mono font-bold bg-gray-800 rounded-3xl select-none text-center leading-tight"
        style={{
          fontSize: isPortrait ? '22vw' : '10vw',
          letterSpacing: '0.1em',
          padding: '0.5em 0.8em',
        }}
      >
        {isPortrait ? (
          <>{code.slice(0, 3)}<br />{code.slice(3)}</>
        ) : (
          code
        )}
      </div>
      <p className="text-gray-600 text-sm text-center">Code im CMS unter Screens sichtbar</p>
    </div>
  )
}

function resolveScheduledPlaylist(schedule: ScheduleEntry[], defaultId: string | null): string | null {
  if (!schedule.length) return defaultId
  const now = new Date()
  const day = now.getDay()
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const match = schedule.find(e => e.days.includes(day) && time >= e.start_time && time <= e.end_time)
  return match?.playlist_id ?? defaultId
}

const TRANS_DURATION = 650

const KEYFRAMES = `
@keyframes ms-fade-in   { from { opacity: 0 }                         to { opacity: 1 } }
@keyframes ms-fade-out  { from { opacity: 1 }                         to { opacity: 0 } }
@keyframes ms-slide-in  { from { transform: translateX(100%) }         to { transform: translateX(0) } }
@keyframes ms-slide-out { from { transform: translateX(0) }            to { transform: translateX(-100%) } }
@keyframes ms-zoom-in   { from { opacity: 0; transform: scale(0.94) }  to { opacity: 1; transform: scale(1) } }
@keyframes ms-zoom-out  { from { opacity: 1; transform: scale(1) }     to { opacity: 0; transform: scale(1.06) } }
`

function enterStyle(type: string, d: number): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 1 }
  if (type === 'none') return base
  const a = (name: string) => `${name} ${d}ms ease-in-out forwards`
  if (type === 'slide') return { ...base, animation: a('ms-slide-in') }
  if (type === 'zoom')  return { ...base, animation: a('ms-zoom-in') }
  return { ...base, animation: a('ms-fade-in') }
}

function exitStyle(type: string, d: number): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 0 }
  if (type === 'none') return { ...base, opacity: 0 }
  const a = (name: string) => `${name} ${d}ms ease-in-out forwards`
  if (type === 'slide') return { ...base, animation: a('ms-slide-out') }
  if (type === 'zoom')  return { ...base, animation: a('ms-zoom-out') }
  return { ...base, animation: a('ms-fade-out') }
}

function SlidePlayer({ playlist, cityId, defaultPrayerSource, profile }: { playlist: Playlist; cityId: number; defaultPrayerSource?: PrayerSource | null; profile: MosqueProfile | null }) {
  const slides = (playlist.slides ?? []) as Slide[]
  const [idx, setIdx]           = useState(0)
  const [prevIdx, setPrevIdx]   = useState<number | null>(null)
  const [activeTrans, setActiveTrans] = useState<string>('fade')
  const overlay = playlist.ticker_overlay

  useEffect(() => {
    if (slides.length < 2) return
    const slide = slides[idx]
    const duration = slide.duration > 0 ? slide.duration : null
    if (!duration) return

    const trans = slides[idx].transition ?? 'fade'
    const transDuration = trans === 'none' ? 0 : TRANS_DURATION
    const delay = Math.max(50, duration * 1000 - transDuration)

    const id = setTimeout(() => {
      const next = (idx + 1) % slides.length
      setActiveTrans(trans)
      setPrevIdx(idx)
      setIdx(next)
      if (transDuration > 0) {
        setTimeout(() => setPrevIdx(null), transDuration)
      } else {
        setPrevIdx(null)
      }
    }, delay)

    return () => clearTimeout(id)
  }, [idx, slides])

  if (!slides.length) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center text-gray-500">
        Keine Slides in dieser Playlist
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <style>{KEYFRAMES}</style>
      {/* Ausgehender Slide (Exit-Animation) */}
      {prevIdx !== null && (
        <div key={`exit-${prevIdx}`} style={exitStyle(activeTrans, TRANS_DURATION)}>
          <SlideRenderer slide={slides[prevIdx]} cityId={cityId} defaultPrayerSource={defaultPrayerSource} profile={profile} />
        </div>
      )}
      {/* Eingehender Slide (Enter-Animation beim Wechsel, sonst statisch) */}
      <div key={`enter-${idx}`} style={prevIdx !== null ? enterStyle(activeTrans, TRANS_DURATION) : { position: 'absolute', inset: 0 }}>
        <SlideRenderer slide={slides[idx]} cityId={cityId} defaultPrayerSource={defaultPrayerSource} profile={profile} />
      </div>
      {overlay?.enabled && <OverlayTicker overlay={overlay} />}
    </div>
  )
}

const TICKER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  dark:  { bg: 'rgba(0,0,0,0.82)',      text: '#ffffff',  border: 'rgba(255,255,255,0.08)' },
  gold:  { bg: 'rgba(20,12,0,0.88)',    text: '#f5d87a',  border: 'rgba(212,168,67,0.3)'   },
  green: { bg: 'rgba(4,18,10,0.88)',    text: '#6ee7b7',  border: 'rgba(52,211,153,0.25)'  },
  light: { bg: 'rgba(240,242,244,0.92)',text: '#0f1623',  border: 'rgba(0,0,0,0.1)'        },
}

function OverlayTicker({ overlay }: { overlay: TickerOverlay }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const s = TICKER_STYLES[overlay.style] ?? TICKER_STYLES.dark

  const texts = overlay.texts?.length
    ? overlay.texts
    : [(overlay as unknown as { text?: string }).text ?? '']
  const items = texts.filter(Boolean)

  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track || !items.length) return

    // speed 10 = fast (~300 px/s), speed 60 = slow (~50 px/s)
    const pxPerSec = 3000 / Math.max(10, Math.min(60, overlay.speed ?? 25))

    // start off-screen to the right
    let x = container.clientWidth
    let lastT: number | null = null
    let rafId: number

    function tick(t: number) {
      if (lastT === null) lastT = t
      x -= pxPerSec * ((t - lastT) / 1000)
      lastT = t
      // seamless loop: track holds 2 identical copies; one copy = half the scroll width
      const half = track!.scrollWidth / 2
      if (x <= -half) x += half
      track!.style.transform = `translateX(${x}px)`
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay.texts?.join('|'), overlay.speed])

  if (!items.length) return null

  const sep = <span style={{ margin: '0 2.5rem', opacity: 0.35 }}>◆</span>
  const band = items.map((t, i) => <React.Fragment key={i}>{t}{sep}</React.Fragment>)

  return (
    <div ref={containerRef}
      className="absolute bottom-0 left-0 right-0 z-50 overflow-hidden select-none flex items-center"
      style={{ height: 'clamp(52px, 6.5vh, 88px)', background: s.bg, borderTop: `1px solid ${s.border}` }}>
      <div ref={trackRef}
        className="inline-flex shrink-0 whitespace-nowrap font-light"
        style={{ color: s.text, fontSize: 'clamp(1.1rem,2vw,1.7rem)', willChange: 'transform' }}>
        {/* two identical copies — when copy 1 exits left, copy 2 is exactly where copy 1 started */}
        <span className="inline-flex">{band}</span>
        <span className="inline-flex">{band}</span>
      </div>
    </div>
  )
}
