import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPrayerTimes } from '../lib/prayertimes'
import type { AzanConfig, AzanPrayer, MosqueProfile, Playlist, PrayerSource, PrayerTimes, Screen, ScheduleEntry, Slide, TickerOverlay } from '../types'
import SlideRenderer from '../slides/SlideRenderer'
import { loadScreenConfig, saveScreenConfig } from '../lib/offline-cache'

// Audio-Unlock: Browser blockiert Autoplay bis zur ersten Nutzer-Geste.
// Beim ersten Touch/Click eine stille Audio-Datei abspielen → entsperrt Audio global für diese Session.
// Danach funktioniert audio.play() ohne weitere Geste (z.B. beim Ezan).
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='
let _audioUnlocked = false
function unlockAudio() {
  if (_audioUnlocked) return
  _audioUnlocked = true
  const a = new Audio(SILENT_WAV)
  a.volume = 0
  a.play().catch(() => {})
}
document.addEventListener('click',      unlockAudio, { capture: true, passive: true, once: true })
document.addEventListener('touchstart', unlockAudio, { capture: true, passive: true, once: true })
document.addEventListener('keydown',    unlockAudio, { capture: true, passive: true, once: true })

interface Props {
  hardwareId: string
}

const AZAN_PRAYERS: AzanPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export default function ScreenPlayer({ hardwareId }: Props) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [profile, setProfile] = useState<MosqueProfile | null>(null)
  const playlistIdRef = React.useRef<string | null>(null)
  // Merkt ob aktuelle Daten aus Online-Quelle stammen (für Cache-Speicherung)
  const loadedOnlineRef = useRef(false)

  async function fetchPlaylist(playlistId: string) {
    const { data } = await supabase.from('playlists').select('*').eq('id', playlistId).single()
    if (data) setPlaylist(data as Playlist)
  }

  // Cache speichern sobald screen + playlist aus Online-Quelle vollständig sind
  useEffect(() => {
    if (!loadedOnlineRef.current || !screen || !playlist) return
    saveScreenConfig(hardwareId, { screen, playlist, profile })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen?.id, playlist?.id, profile?.user_id])

  useEffect(() => {
    async function load() {
      // 3-Sekunden-Timeout: bei Supabase-Fehler oder Netz-Ausfall sofort auf Cache zurückfallen
      let screenData: Screen | null = null
      try {
        const result = await Promise.race([
          supabase.from('screens').select('*').eq('hardware_id', hardwareId).single(),
          new Promise<{ data: null }>((resolve) =>
            setTimeout(() => resolve({ data: null }), 3000)
          ),
        ]) as { data: Screen | null }
        screenData = result.data
      } catch { /* Netzwerkfehler */ }

      if (!screenData) {
        // Offline-Fallback: letzten bekannten Zustand aus IndexedDB laden
        const cached = await loadScreenConfig(hardwareId)
        if (cached) {
          setScreen(cached.screen)
          setProfile(cached.profile)
          setPlaylist(cached.playlist)
          playlistIdRef.current = cached.playlist?.id ?? null
        }
        return
      }

      loadedOnlineRef.current = true
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
      supabase.from('screens').update({ last_seen_at: new Date().toISOString() }).eq('hardware_id', hardwareId).then(() => {})
    }
    beat()
    const heartbeat = setInterval(beat, 30_000)

    // Sofortiger Beat wenn Tab wieder sichtbar wird (mobile Browser drosseln Intervalle im Hintergrund)
    function onVisible() { if (document.visibilityState === 'visible') beat() }
    document.addEventListener('visibilitychange', onVisible)

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
      document.removeEventListener('visibilitychange', onVisible)
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

  // Web Wake Lock — verhindert Bildschirm-Abschalten im Kiosk-Modus
  useEffect(() => {
    const wl = (navigator as any).wakeLock
    if (!wl) return

    let lock: any = null

    async function acquire() {
      try {
        lock = await wl.request('screen')
      } catch {
        // ignorieren — z.B. wenn Tab im Hintergrund
      }
    }

    acquire()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      lock?.release()
    }
  }, [])

  if (!screen) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    // playlist_id ist gesetzt aber Fetch läuft noch → Spinner statt NoPlaylistScreen
    if (screen.playlist_id || playlistIdRef.current) {
      return (
        <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )
    }
    return <NoPlaylistScreen hardwareId={hardwareId} />
  }

  // Build effective prayer source: screen override → profile source → profile legacy city_id
  const profileSource = profile?.prayer_source ?? null
  const profileCityId = profileSource?.source === 'diyanet' ? profileSource.cityId : (profile?.city_id ?? null)
  const effectiveCityId = screen.city_id ?? profileCityId ?? 0
  const effectivePrayerSource = profileSource

  return (
    <ScreenContent
      screen={screen}
      playlist={playlist}
      profile={profile}
      cityId={effectiveCityId}
      prayerSource={effectivePrayerSource}
    />
  )
}

// ── ScreenContent: SlidePlayer + Ezan-Trigger ────────────────────────────────

function ScreenContent({
  screen, playlist, profile, cityId, prayerSource,
}: {
  screen: Screen
  playlist: Playlist
  profile: MosqueProfile | null
  cityId: number
  prayerSource: PrayerSource | null
}) {
  const azanConfig = screen.azan_config ?? null
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
  const [activeAzan, setActiveAzan] = useState<AzanPrayer | null>(() => {
    const p = new URLSearchParams(window.location.search).get('test_azan')
    return (p && ['fajr','dhuhr','asr','maghrib','isha'].includes(p)) ? p as AzanPrayer : null
  })
  const lastAzanRef = useRef<string | null>(null) // "fajr-2024-05-27" — verhindert Doppel-Trigger

  // ── Gebetszeiten laden ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!azanConfig?.enabled) return
    if (!prayerSource && !cityId) return

    function load() {
      getPrayerTimes(prayerSource, cityId || undefined).then(t => {
        if (t) setPrayerTimes(t)
      }).catch(console.error)
    }
    load()

    // Täglich um Mitternacht neu laden
    function scheduleMidnight(): ReturnType<typeof setTimeout> {
      const n = new Date()
      const ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime()
      return setTimeout(() => { load(); timer = scheduleMidnight() }, ms)
    }
    let timer = scheduleMidnight()
    return () => clearTimeout(timer)
  }, [azanConfig?.enabled, prayerSource, cityId])

  // ── Ezan Test-Trigger via device_commands ────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`azan-cmd:${screen.hardware_id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'device_commands',
        filter: `hardware_id=eq.${screen.hardware_id}`,
      }, ({ new: cmd }) => {
        if (cmd.command === 'trigger_azan') {
          const prayer = (cmd.payload as { prayer?: string })?.prayer
          if (prayer && AZAN_PRAYERS.includes(prayer as AzanPrayer)) {
            setActiveAzan(prayer as AzanPrayer)
          }
          supabase.from('device_commands')
            .update({ executed_at: new Date().toISOString(), status: 'done' })
            .eq('id', cmd.id)
            .then(() => {})
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [screen.hardware_id])

  // ── Ezan-Trigger: Hybrid-Ansatz ─────────────────────────────────────────────
  // 1. setTimeout schläft bis 30s vor dem Gebet     → null CPU-Last dazwischen
  // 2. Dann setInterval(500ms) für präzise Erkennung → fängt auch verspätete Timer auf
  // Fenster: -30s bis +120s um die Gebetsminute (robust gegen Timer-Drift)
  useEffect(() => {
    if (!azanConfig?.enabled || !prayerTimes) return

    let sleepTimer: ReturnType<typeof setTimeout> | null = null
    let watchTimer: ReturnType<typeof setInterval> | null = null

    function cleanup() {
      if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null }
      if (watchTimer) { clearInterval(watchTimer); watchTimer = null }
    }

    function scheduleNext() {
      cleanup()
      const now = new Date()
      const dateKey = now.toISOString().slice(0, 10)

      for (const prayer of AZAN_PRAYERS) {
        const prayerTime = prayerTimes![prayer] as string | undefined
        if (!prayerTime) continue
        if (!azanConfig!.prayers?.[prayer]?.url && !azanConfig!.overlay) continue

        const [h, m] = prayerTime.split(':').map(Number)
        const target = new Date(now)
        target.setHours(h, m, 0, 0)
        const triggerKey = `${prayer}-${dateKey}`

        if (lastAzanRef.current === triggerKey) continue // heute schon ausgelöst

        const msToTarget = target.getTime() - now.getTime()

        if (msToTarget < -120_000) continue // mehr als 2 Min vorbei → skip

        if (msToTarget > 30_000) {
          // Weit weg → schlafen bis 30s vor dem Gebet, dann neu prüfen
          sleepTimer = setTimeout(scheduleNext, msToTarget - 30_000)
          return
        }

        // ≤ 30s vor oder bis 2 Min nach Gebetszeit: präzise mit 500ms-Takt wachen
        watchTimer = setInterval(() => {
          const n = new Date()
          const hhmm = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`

          if (hhmm === prayerTime && lastAzanRef.current !== triggerKey) {
            clearInterval(watchTimer!); watchTimer = null
            lastAzanRef.current = triggerKey
            setActiveAzan(prayer)
            // Nächstes Gebet einplanen sobald dieses vorbei ist
            sleepTimer = setTimeout(scheduleNext, 3 * 60_000)
            return
          }

          // Fenster abgelaufen ohne Match → weiter zum nächsten Gebet
          if (n.getTime() > target.getTime() + 120_000) scheduleNext()
        }, 500)
        return
      }

      // Alle heutigen Gebete vorbei → kurz nach Mitternacht neu starten
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 10, 0)
      sleepTimer = setTimeout(scheduleNext, tomorrow.getTime() - now.getTime())
    }

    scheduleNext()
    return cleanup
  }, [azanConfig, prayerTimes])

  // ── OLED Pixel-Shift ─────────────────────────────────────────────────────────
  const [shift, setShift] = useState({ x: 0, y: 0 })
  const oled = screen.oled_config ?? null
  useEffect(() => {
    if (!oled?.pixelShift) { setShift({ x: 0, y: 0 }); return }
    const ms = (oled.intervalMinutes ?? 3) * 60_000
    const id = setInterval(() => {
      setShift({
        x: Math.round((Math.random() * 4) - 2),
        y: Math.round((Math.random() * 4) - 2),
      })
    }, ms)
    return () => clearInterval(id)
  }, [oled?.pixelShift, oled?.intervalMinutes])

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ transform: `translate(${shift.x}px, ${shift.y}px)`, transition: 'transform 2s ease-in-out' }}
    >
      <SlidePlayer
        playlist={playlist}
        cityId={cityId}
        defaultPrayerSource={prayerSource}
        profile={profile}
      />
      {activeAzan && (
        <AzanOverlay
          prayer={activeAzan}
          config={azanConfig ?? { enabled: true, overlay: true, prayers: {} }}
          profile={profile}
          onEnd={() => setActiveAzan(null)}
        />
      )}
    </div>
  )
}

// ── Ezan Overlay ─────────────────────────────────────────────────────────────

const ARABIC_PRAYER: Record<AzanPrayer, string> = {
  fajr:    'الفجر',
  dhuhr:   'الظهر',
  asr:     'العصر',
  maghrib: 'المغرب',
  isha:    'العشاء',
}

const PRAYER_LABEL_DE: Record<AzanPrayer, string> = {
  fajr:    'Sabah · Fajr',
  dhuhr:   'Öğle · Dhuhr',
  asr:     'İkindi · Asr',
  maghrib: 'Akşam · Mağrib',
  isha:    'Yatsı · Işa',
}

function AzanOverlay({
  prayer, config, profile, onEnd,
}: {
  prayer: AzanPrayer
  config: AzanConfig
  profile: MosqueProfile | null
  onEnd: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const audioUrl = config.prayers?.[prayer]?.url ?? null
  const mosqueName = profile?.name ?? ''
  const [audioBlocked, setAudioBlocked] = useState(false)

  // Fallback: immer nach 10 Minuten schließen
  useEffect(() => {
    const t = setTimeout(onEnd, 10 * 60 * 1000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Audio laden + abspielen — Blob-URL wegen Range-Request-Problem des Reverse Proxy
  useEffect(() => {
    if (!audioUrl) return
    let cancelled = false
    fetch(audioUrl, { mode: 'cors', cache: 'no-store' })
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl
        const audio = new Audio(blobUrl)
        audioRef.current = audio
        audio.addEventListener('ended', onEnd)
        audio.play().catch(err => {
          if ((err as DOMException).name === 'NotAllowedError') {
            setAudioBlocked(true)
          } else {
            console.warn('Azan audio error:', err)
          }
        })
      })
      .catch(err => console.warn('Azan audio fetch failed:', err))
    return () => {
      cancelled = true
      audioRef.current?.removeEventListener('ended', onEnd)
      audioRef.current?.pause()
      audioRef.current = null
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    }
  }, [audioUrl])

  // Retry-Loop: wenn geblockt, alle 1.5s erneut versuchen.
  // Sobald Audio durch Nutzer-Geste entsperrt wurde (unlockAudio), klappt der nächste Versuch.
  useEffect(() => {
    if (!audioBlocked) return
    const id = setInterval(() => {
      if (!blobUrlRef.current) return
      const audio = new Audio(blobUrlRef.current)
      audio.addEventListener('ended', onEnd)
      audio.play().then(() => {
        audioRef.current?.removeEventListener('ended', onEnd)
        audioRef.current?.pause()
        audioRef.current = audio
        setAudioBlocked(false)
      }).catch(() => {})
    }, 1500)
    return () => clearInterval(id)
  }, [audioBlocked, onEnd])

  function handleUnlock() {
    if (!audioBlocked || !blobUrlRef.current) return
    const audio = new Audio(blobUrlRef.current)
    audioRef.current?.removeEventListener('ended', onEnd)
    audioRef.current?.pause()
    audio.addEventListener('ended', onEnd)
    audioRef.current = audio
    audio.play()
      .then(() => setAudioBlocked(false))
      .catch(err => console.warn('Azan unlock failed:', err))
  }

  if (!config.overlay) return null

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center select-none"
      style={{
        zIndex: 100,
        background: 'radial-gradient(ellipse at 50% 40%, #0d1a0f 0%, #050d07 60%, #000 100%)',
        animation: 'az-fadein 1.2s ease forwards',
        cursor: audioBlocked ? 'pointer' : 'default',
      }}
      onClick={handleUnlock}
    >
      <style>{`
        @keyframes az-fadein  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes az-pulse   { 0%,100% { opacity: 0.6; transform: scale(1) } 50% { opacity: 1; transform: scale(1.04) } }
        @keyframes az-rise    { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes az-shimmer { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }
        @keyframes az-tapfade { 0%,100% { opacity: 0.4 } 50% { opacity: 0.85 } }
      `}</style>

      {/* Decorative stars */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {[...Array(24)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: '#fff',
            left: `${(i * 17 + 7) % 97}%`,
            top: `${(i * 23 + 11) % 85}%`,
            opacity: 0.15 + (i % 5) * 0.08,
            animation: `az-shimmer ${2.5 + (i % 4) * 0.7}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 2}s`,
          }} />
        ))}
      </div>

      {/* Crescent moon */}
      <div style={{ animation: 'az-pulse 3s ease-in-out infinite', marginBottom: '3vh' }} aria-hidden>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <path
            d="M52 36C52 25.5 44.5 17 35 16C38.5 18.5 41 23.5 41 29.5C41 40 33 48.5 22.5 49C25 55 30.5 59 37 59C46 59 52 48.5 52 36Z"
            fill="#c9921a"
            opacity="0.95"
          />
          <circle cx="50" cy="20" r="3.5" fill="#c9921a" opacity="0.8" />
        </svg>
      </div>

      {/* الأذان */}
      <div style={{
        color: 'rgba(201,146,26,0.55)',
        fontSize: 'clamp(1rem, 2.5vw, 1.8rem)',
        letterSpacing: '0.35em',
        fontWeight: 300,
        textTransform: 'uppercase',
        animation: 'az-rise 1.5s ease forwards',
        marginBottom: '1.5vh',
      }}>
        الأذان
      </div>

      {/* Arabic prayer name */}
      <div style={{
        fontFamily: '"Scheherazade New", "Noto Naskh Arabic", serif',
        fontSize: 'clamp(4rem, 14vw, 10rem)',
        color: '#fff',
        fontWeight: 400,
        lineHeight: 1,
        direction: 'rtl',
        animation: 'az-rise 1s 0.3s ease both',
        textShadow: '0 0 80px rgba(201,146,26,0.3)',
        marginBottom: '2vh',
      }}>
        {ARABIC_PRAYER[prayer]}
      </div>

      {/* Prayer label (DE/TR) */}
      <div style={{
        color: 'rgba(255,255,255,0.45)',
        fontSize: 'clamp(0.9rem, 2.2vw, 1.5rem)',
        letterSpacing: '0.2em',
        fontWeight: 300,
        animation: 'az-rise 1s 0.6s ease both',
        marginBottom: '6vh',
      }}>
        {PRAYER_LABEL_DE[prayer]}
      </div>

      {/* Divider */}
      <div style={{
        width: 'clamp(120px, 20vw, 280px)',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(201,146,26,0.4), transparent)',
        marginBottom: '4vh',
        animation: 'az-rise 1s 0.8s ease both',
      }} />

      {/* Mosque name */}
      {mosqueName && (
        <div style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: 'clamp(0.75rem, 1.6vw, 1.1rem)',
          letterSpacing: '0.25em',
          fontWeight: 400,
          textTransform: 'uppercase',
          animation: 'az-rise 1s 1s ease both',
        }}>
          {mosqueName}
        </div>
      )}

      {/* Tap-to-play Hinweis — nur wenn Browser Autoplay blockiert hat */}
      {audioBlocked && (
        <div style={{
          position: 'absolute',
          bottom: '10vh',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'rgba(201,146,26,0.7)',
          fontSize: 'clamp(0.75rem, 1.8vw, 1rem)',
          letterSpacing: '0.15em',
          animation: 'az-tapfade 1.8s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '1.2em' }}>🔊</span>
          Tippen zum Abspielen
        </div>
      )}

      {/* Close button */}
      <button
        onClick={e => { e.stopPropagation(); onEnd() }}
        className="absolute bottom-8 right-8 text-white/20 hover:text-white/50 text-sm transition"
        style={{ letterSpacing: '0.1em' }}
      >
        ✕
      </button>
    </div>
  )
}

// ── Rest (unverändert) ────────────────────────────────────────────────────────

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
    ).then(() => {})
    return () => {
      supabase.from('pairing_codes').delete().eq('hardware_id', hardwareId).then(() => {})
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
      {prevIdx !== null && (
        <div key={`exit-${prevIdx}`} style={exitStyle(activeTrans, TRANS_DURATION)}>
          <SlideRenderer slide={slides[prevIdx]} cityId={cityId} defaultPrayerSource={defaultPrayerSource} profile={profile} />
        </div>
      )}
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

    const pxPerSec = 3000 / Math.max(10, Math.min(60, overlay.speed ?? 25))

    let x = container.clientWidth
    let lastT: number | null = null
    let rafId: number

    function tick(t: number) {
      if (lastT === null) lastT = t
      x -= pxPerSec * ((t - lastT) / 1000)
      lastT = t
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
        <span className="inline-flex">{band}</span>
        <span className="inline-flex">{band}</span>
      </div>
    </div>
  )
}
