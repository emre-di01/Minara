import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import Layout from '../components/Layout'
import CityPicker from '../components/CityPicker'
import type { AzanConfig, AzanPrayer, DeviceCommand, Screen, Playlist, ScheduleEntry } from '../../types'
import { useCmsT } from '../../lib/cms-lang'
import { tpl, tplNamed } from '../../lib/cms-i18n'

export default function Screens() {
  const { user } = useAuth()
  const t = useCmsT()
  const [screens, setScreens] = useState<Screen[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [showPairing, setShowPairing] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkPlaylistId, setBulkPlaylistId] = useState('')
  const [bulkAssigning, setBulkAssigning] = useState(false)

  useEffect(() => {
    if (!user) return

    supabase.from('screens').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setScreens(data ?? []))
    supabase.from('playlists').select('id, name').order('created_at', { ascending: false })
      .then(({ data }) => setPlaylists(data as Playlist[] ?? []))

    const channel = supabase
      .channel('cms-screens-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screens' }, ({ new: updated }) => {
        setScreens(prev => prev.map(s => s.id === (updated as Screen).id ? { ...s, ...(updated as Screen) } : s))
      })
      .subscribe()

    // Fallback: re-fetch last_seen_at every 30s in case realtime is not enabled
    const poll = setInterval(() => {
      supabase.from('screens').select('id, last_seen_at').then(({ data }) => {
        if (!data) return
        setScreens(prev => prev.map(s => {
          const fresh = (data as { id: string; last_seen_at: string | null }[]).find(r => r.id === s.id)
          return fresh ? { ...s, last_seen_at: fresh.last_seen_at } : s
        }))
      })
    }, 30_000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [user])

  function onPaired(screen: Screen) {
    setScreens(prev => [screen, ...prev])
    setShowPairing(false)
  }

  async function assignPlaylist(screenId: string, playlistId: string | null) {
    const { data } = await supabase.from('screens').update({ playlist_id: playlistId })
      .eq('id', screenId).select().single()
    if (data) setScreens(prev => prev.map(s => s.id === screenId ? data as Screen : s))
  }

  async function remove(screenId: string) {
    setDeleting(screenId)
    await supabase.from('screens').delete().eq('id', screenId)
    setScreens(prev => prev.filter(s => s.id !== screenId))
    setDeleting(null)
  }

  async function assignCity(screenId: string, cityId: number | null) {
    const { data } = await supabase.from('screens').update({ city_id: cityId })
      .eq('id', screenId).select().single()
    if (data) setScreens(prev => prev.map(s => s.id === screenId ? data as Screen : s))
  }

  async function bulkAssign() {
    if (!bulkPlaylistId || !screens.length) return
    setBulkAssigning(true)
    await supabase.from('screens').update({ playlist_id: bulkPlaylistId }).in('id', screens.map(s => s.id))
    setScreens(prev => prev.map(s => ({ ...s, playlist_id: bulkPlaylistId })))
    setBulkAssigning(false)
  }

  async function saveSchedule(screenId: string, schedule: ScheduleEntry[]) {
    const { data } = await supabase.from('screens').update({ schedule }).eq('id', screenId).select().single()
    if (data) setScreens(prev => prev.map(s => s.id === screenId ? data as Screen : s))
  }

  async function saveAzan(screenId: string, azanConfig: AzanConfig) {
    const { data } = await supabase.from('screens').update({ azan_config: azanConfig }).eq('id', screenId).select().single()
    if (data) setScreens(prev => prev.map(s => s.id === screenId ? data as Screen : s))
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">{t.sc.title}</h1>
          <button
            onClick={() => setShowPairing(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {t.sc.add}
          </button>
        </div>

        {screens.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-4xl">📺</span>
            <p className="text-white font-medium">{t.sc.noScreens}</p>
            <p className="text-gray-500 text-sm max-w-xs">{t.sc.noScreensHint}</p>
            <button onClick={() => setShowPairing(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition mt-1">
              {t.sc.add}
            </button>
          </div>
        ) : (
          <>
            {screens.length > 1 && (
              <div className="mb-6 flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3">
                <span className="text-gray-400 text-sm shrink-0">{t.sc.allScreens}</span>
                <select value={bulkPlaylistId} onChange={e => setBulkPlaylistId(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">{t.sc.choosePlaylist}</option>
                  {playlists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </select>
                <button onClick={bulkAssign} disabled={!bulkPlaylistId || bulkAssigning}
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                  {bulkAssigning ? '...' : t.sc.assign}
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {screens.map(s => (
                <ScreenCard key={s.id} screen={s} playlists={playlists}
                  onAssign={assignPlaylist} onCityAssign={assignCity}
                  onScheduleSave={saveSchedule}
                  onAzanSave={saveAzan}
                  onDelete={() => window.confirm(tplNamed(t.sc.confirmDelete, { name: s.name })) && remove(s.id)}
                  deleting={deleting === s.id} />
              ))}
            </div>
          </>
        )}
      </div>

      {showPairing && (
        <PairingDialog onPaired={onPaired} onClose={() => setShowPairing(false)} />
      )}
    </Layout>
  )
}

function ScreenCard({ screen, playlists, onAssign, onCityAssign, onScheduleSave, onAzanSave, onDelete, deleting }: {
  screen: Screen
  playlists: Playlist[]
  onAssign: (screenId: string, playlistId: string | null) => void
  onCityAssign: (screenId: string, cityId: number | null) => void
  onScheduleSave: (screenId: string, schedule: ScheduleEntry[]) => void
  onAzanSave: (screenId: string, config: AzanConfig) => void
  onDelete: () => void
  deleting: boolean
}) {
  const t = useCmsT()
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showAzan, setShowAzan] = useState(false)
  const [showAzanTest, setShowAzanTest] = useState(false)
  const [showRemote, setShowRemote] = useState(false)
  const [cmdSending, setCmdSending] = useState<string | null>(null)
  const [lastCmd, setLastCmd] = useState<{ text: string, ok: boolean } | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(interval)
  }, [])

  const isOnline = screen.last_seen_at
    ? now - new Date(screen.last_seen_at).getTime() < 180_000
    : false

  useEffect(() => {
    if (screen.playlist_id) { setPairingCode(null); return }
    supabase.from('pairing_codes').select('code').eq('hardware_id', screen.hardware_id).maybeSingle()
      .then(({ data }) => setPairingCode(data?.code ?? null))
  }, [screen.playlist_id, screen.hardware_id])

  const scheduleCount = screen.schedule?.length ?? 0

  async function sendCommand(command: DeviceCommand['command'], payload: Record<string, unknown> = {}) {
    setCmdSending(command)
    setLastCmd(null)
    const { error } = await supabase.from('device_commands').insert({
      hardware_id: screen.hardware_id,
      command,
      payload,
    })
    setLastCmd({ text: error ? error.message : 'Befehl gesendet', ok: !error })
    setCmdSending(null)
    setTimeout(() => setLastCmd(null), 4000)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">{screen.name}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-900 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
            {isOnline ? t.sc.online : t.sc.offline}
          </span>
          <button
            onClick={() => setShowRemote(v => !v)}
            title="Remote-Befehle"
            className={`text-sm p-0.5 transition ${showRemote ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            📡
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition text-sm p-0.5"
            title={t.sc.deleteTitle}
          >
            {deleting ? '…' : '🗑'}
          </button>
        </div>
      </div>
      <div className="text-gray-500 text-xs">
        {screen.orientation === 'landscape' ? '⬛ 16:9' : '▮ 9:16'}
      </div>

      {!screen.playlist_id && pairingCode && (
        <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
          <div className="text-gray-500 text-xs mb-1">{t.sc.pairingCode}</div>
          <div className="font-mono text-2xl font-bold text-white tracking-[0.2em]">{pairingCode}</div>
        </div>
      )}

      <select
        value={screen.playlist_id ?? ''}
        onChange={e => onAssign(screen.id, e.target.value || null)}
        className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">{t.sc.noPlaylist}</option>
        {playlists.map(pl => (
          <option key={pl.id} value={pl.id}>{pl.name}</option>
        ))}
      </select>

      <div className="border-t border-gray-800 pt-2">
        {showCityPicker ? (
          <CityPicker
            onSelect={(cityId) => { onCityAssign(screen.id, cityId); setShowCityPicker(false) }}
            onCancel={() => setShowCityPicker(false)}
          />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">
              🕌 {screen.city_id ? `ID: ${screen.city_id}` : t.sc.noPrayerCity}
            </span>
            <button
              onClick={() => setShowCityPicker(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition"
            >
              {screen.city_id ? t.sc.changeCity : t.sc.addCity}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">
            🕐 {scheduleCount > 0 ? tpl(t.sc.scheduleRules, scheduleCount) : t.sc.noSchedule}
          </span>
          <button onClick={() => setShowSchedule(s => !s)}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition">
            {showSchedule ? t.sc.closeSchedule : t.sc.schedule}
          </button>
        </div>
        {showSchedule && (
          <ScheduleEditor
            schedule={screen.schedule ?? []}
            playlists={playlists}
            onSave={s => { onScheduleSave(screen.id, s); setShowSchedule(false) }}
          />
        )}
      </div>

      {/* Ezan */}
      <div className="border-t border-gray-800 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">
            🔊 {screen.azan_config?.enabled ? t.sc.azanEnabled : t.sc.azan}
            {screen.azan_config?.enabled && (
              <span className="ml-1.5 text-emerald-500">●</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAzanTest(s => !s); setShowAzan(false) }}
              className="text-xs text-yellow-500 hover:text-yellow-400 transition"
              title="Ezan testen"
            >
              ▶ Test
            </button>
            <button onClick={() => { setShowAzan(s => !s); setShowAzanTest(false) }}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition">
              {showAzan ? t.sc.azanClose : t.sc.azan}
            </button>
          </div>
        </div>

        {showAzanTest && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(['fajr','dhuhr','asr','maghrib','isha'] as const).map(prayer => (
              <button
                key={prayer}
                onClick={() => {
                  sendCommand('trigger_azan', { prayer })
                  setShowAzanTest(false)
                }}
                disabled={cmdSending === 'trigger_azan'}
                className="bg-yellow-900/40 hover:bg-yellow-800/60 disabled:opacity-40 text-yellow-300 text-xs px-2 py-1 rounded transition capitalize"
              >
                {prayer}
              </button>
            ))}
          </div>
        )}

        {showAzan && (
          <AzanEditor
            screenId={screen.id}
            config={screen.azan_config ?? null}
            onSave={cfg => { onAzanSave(screen.id, cfg); setShowAzan(false) }}
          />
        )}
      </div>

      {/* Remote-Befehle */}
      {showRemote && (
        <div className="border-t border-gray-800 pt-2">
          <p className="text-gray-500 text-xs mb-2">Remote-Befehle</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { cmd: 'restart_kiosk' as const, label: '🔄 Kiosk-Neustart' },
              { cmd: 'reboot'        as const, label: '⚡ Pi-Neustart'    },
              { cmd: 'clear_cache'   as const, label: '🧹 Cache leeren'   },
              { cmd: 'update_scripts'as const, label: '⬆️ Scripts updaten' },
            ] as { cmd: DeviceCommand['command']; label: string }[]).map(({ cmd, label }) => (
              <button
                key={cmd}
                onClick={() => sendCommand(cmd)}
                disabled={cmdSending !== null}
                className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-xs font-medium px-2 py-2 rounded-lg transition"
              >
                {cmdSending === cmd ? (
                  <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                ) : null}
                {label}
              </button>
            ))}
          </div>
          {lastCmd && (
            <p className={`text-xs mt-2 ${lastCmd.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {lastCmd.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ScheduleEditor({ schedule: initial, playlists, onSave }: {
  schedule: ScheduleEntry[]
  playlists: Playlist[]
  onSave: (s: ScheduleEntry[]) => void
}) {
  const t = useCmsT()
  const [entries, setEntries] = useState<ScheduleEntry[]>(initial)

  function add() {
    setEntries(e => [...e, { playlist_id: playlists[0]?.id ?? '', days: [5], start_time: '12:00', end_time: '14:00' }])
  }

  function update(i: number, patch: Partial<ScheduleEntry>) {
    setEntries(e => e.map((x, j) => j === i ? { ...x, ...patch } : x))
  }

  function toggleDay(i: number, day: number) {
    setEntries(e => e.map((x, j) => {
      if (j !== i) return x
      const days = x.days.includes(day) ? x.days.filter(d => d !== day) : [...x.days, day].sort()
      return { ...x, days }
    }))
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {entries.length === 0 && <p className="text-gray-600 text-xs">{t.sc.noRules}</p>}
      {entries.map((e, i) => (
        <div key={i} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">{t.sc.ruleLabel.replace('{n}', String(i + 1))}</span>
            <button onClick={() => setEntries(es => es.filter((_, j) => j !== i))}
              className="text-gray-600 hover:text-red-400 text-xs transition">✕</button>
          </div>
          <div className="flex gap-1">
            {t.sc.days.map((label, day) => (
              <button key={day} onClick={() => toggleDay(i, day)}
                className={`flex-1 py-1 rounded text-xs transition ${e.days.includes(day) ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-600 text-xs">{t.sc.from}</span>
              <input type="time" value={e.start_time} onChange={ev => update(i, { start_time: ev.target.value })}
                className="bg-gray-800 text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 text-xs [color-scheme:dark]" />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-600 text-xs">{t.sc.to}</span>
              <input type="time" value={e.end_time} onChange={ev => update(i, { end_time: ev.target.value })}
                className="bg-gray-800 text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 text-xs [color-scheme:dark]" />
            </label>
          </div>
          <select value={e.playlist_id} onChange={ev => update(i, { playlist_id: ev.target.value })}
            className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500">
            {playlists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <button onClick={add}
          className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition">
          + {t.sc.addRule}
        </button>
        <button onClick={() => onSave(entries)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
          {t.sc.save}
        </button>
      </div>
    </div>
  )
}


// ── AzanEditor ───────────────────────────────────────────────────────────────

const AZAN_PRAYERS: { key: AzanPrayer; labelKey: keyof ReturnType<typeof useCmsT>['sc'] }[] = [
  { key: 'fajr',    labelKey: 'azanFajr'    },
  { key: 'dhuhr',   labelKey: 'azanDhuhr'   },
  { key: 'asr',     labelKey: 'azanAsr'     },
  { key: 'maghrib', labelKey: 'azanMaghrib' },
  { key: 'isha',    labelKey: 'azanIsha'    },
]

const AUDIO_EXTS = ['mp3', 'aac', 'ogg', 'wav', 'm4a', 'opus', 'flac']

function AzanEditor({ config: initial, onSave }: {
  screenId?: string
  config: AzanConfig | null
  onSave: (cfg: AzanConfig) => void
}) {
  const t = useCmsT()
  const { user } = useAuth()
  const [cfg, setCfg] = useState<AzanConfig>(() => initial ?? {
    enabled: false,
    overlay: true,
    prayers: {},
  })
  const [uploading, setUploading]   = useState<AzanPrayer | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [playing, setPlaying]       = useState<AzanPrayer | null>(null)  // Audio-Vorschau
  const [playError, setPlayError]   = useState<string | null>(null)
  const [pickerFor, setPickerFor]   = useState<AzanPrayer | null>(null)  // Mediathek-Picker
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string }[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const fileRefs   = useRef<Partial<Record<AzanPrayer, HTMLInputElement | null>>>({})
  const audioRef   = useRef<HTMLAudioElement | null>(null)

  const blobUrlRef = useRef<string | null>(null)

  // ── Audio-Vorschau ─────────────────────────────────────────────────────────
  async function togglePreview(prayer: AzanPrayer, url: string) {
    setPlayError(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    if (playing === prayer) { setPlaying(null); return }

    try {
      // Blob-URL umgehen Range-Request-Problem des Reverse Proxy
      const resp = await fetch(url, { mode: 'cors', cache: 'no-store' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      blobUrlRef.current = blobUrl
      const audio = new Audio(blobUrl)
      audioRef.current = audio
      await audio.play()
      setPlaying(prayer)
      audio.onended = () => setPlaying(null)
    } catch (e) {
      setPlayError(`Wiedergabe fehlgeschlagen: ${(e as Error).message}`)
      setPlaying(null)
    }
  }

  // Cleanup bei Unmount
  useEffect(() => () => {
    audioRef.current?.pause()
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

  // ── Mediathek laden ────────────────────────────────────────────────────────
  async function openMediaPicker(prayer: AzanPrayer) {
    setPickerFor(prayer)
    if (mediaFiles.length > 0) return  // schon geladen
    setLoadingMedia(true)
    try {
      // backgrounds/ (MediaLibrary-Uploads) + azan/{userId}/ (direkte Ezan-Uploads)
      const userId = user?.id ?? ''
      const [{ data: bgFiles }, { data: azanFiles }] = await Promise.all([
        supabase.storage.from('media').list('backgrounds', { limit: 500 }),
        supabase.storage.from('media').list(`azan/${userId}`, { limit: 200 }),
      ])
      const all = [
        ...(bgFiles ?? []).map(f => ({ ...f, name: `backgrounds/${f.name}` })),
        ...(azanFiles ?? []).map(f => ({ ...f, name: `azan/${userId}/${f.name}` })),
      ]
      const audioFiles = all.filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
        return AUDIO_EXTS.includes(ext)
      })
      setMediaFiles(audioFiles.map(f => ({
        name: f.name,
        url: supabase.storage.from('media').getPublicUrl(f.name).data.publicUrl,
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMedia(false)
    }
  }

  function selectFromMedia(url: string, name: string) {
    if (!pickerFor) return
    setCfg(c => ({ ...c, prayers: { ...c.prayers, [pickerFor]: { url, name } } }))
    setPickerFor(null)
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function uploadAudio(prayer: AzanPrayer, file: File) {
    if (!user) return
    setUploading(prayer)
    setUploadError(null)
    try {
      // Alte Datei löschen (Pfad aus gespeicherter URL extrahieren)
      const oldUrl = cfg.prayers?.[prayer]?.url
      if (oldUrl) {
        const marker = '/object/public/media/'
        const idx = oldUrl.indexOf(marker)
        if (idx !== -1) await supabase.storage.from('media').remove([oldUrl.slice(idx + marker.length)])
      }
      // Dateinamen sanitieren: Leerzeichen + Sonderzeichen → Unterstrich
      const ext = file.name.split('.').pop() ?? 'mp3'
      const baseName = file.name.slice(0, -(ext.length + 1)).replace(/[^a-zA-Z0-9._-]/g, '_')
      const safeName = `${baseName}.${ext}`
      const path = `azan/${user.id}/${safeName}`
      const { error } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type || 'audio/mpeg',
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      setCfg(c => ({ ...c, prayers: { ...c.prayers, [prayer]: { url: publicUrl, name: file.name } } }))
      setMediaFiles([])
    } catch (e) {
      setUploadError(`Upload fehlgeschlagen: ${(e as Error).message}`)
    } finally {
      setUploading(null)
    }
  }

  async function removeAudio(prayer: AzanPrayer) {
    audioRef.current?.pause(); audioRef.current = null; setPlaying(null)
    setCfg(c => { const p = { ...c.prayers }; delete p[prayer]; return { ...c, prayers: p } })
  }

  async function handleSave() {
    setSaving(true)
    await onSave(cfg)
    setSaving(false)
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* Toggles */}
      <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {([
          { key: 'enabled', label: t.sc.azanEnabled, hint: null, val: cfg.enabled, toggle: () => setCfg(c => ({ ...c, enabled: !c.enabled })) },
          { key: 'overlay', label: t.sc.azanOverlay,  hint: t.sc.azanOverlayHint, val: cfg.overlay, toggle: () => setCfg(c => ({ ...c, overlay: !c.overlay })) },
        ] as const).map(({ key, label, hint, val, toggle }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div>
              <span className="text-gray-300 text-xs font-medium">{label}</span>
              {hint && <p className="text-gray-600 text-xs">{hint}</p>}
            </div>
            <div onClick={toggle} className={`relative w-10 h-5 rounded-full transition cursor-pointer shrink-0 ${val ? 'bg-emerald-600' : 'bg-gray-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${val ? 'left-5' : 'left-0.5'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Pro-Gebet Audio */}
      <div className="flex flex-col gap-1.5">
        {AZAN_PRAYERS.map(({ key, labelKey }) => {
          const audioUrl    = cfg.prayers?.[key]?.url ?? null
          const isUploading = uploading === key
          const isPlaying   = playing === key
          const fileName    = audioUrl
            ? (cfg.prayers?.[key]?.name ?? decodeURIComponent(audioUrl.split('/').pop()?.split('?')[0] ?? ''))
            : null

          return (
            <div key={key} className="rounded-lg p-2.5 flex flex-col gap-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Zeile 1: Name + Status + Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs font-medium w-20 shrink-0">
                  {t.sc[labelKey] as string}
                </span>

                <div className="flex-1 min-w-0">
                  {audioUrl ? (
                    <div className="flex items-center gap-1">
                      {/* Vorschau-Button */}
                      <button
                        onClick={() => togglePreview(key, audioUrl)}
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs transition
                          ${isPlaying ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title={isPlaying ? 'Stop' : 'Vorschau'}
                      >
                        {isPlaying ? '■' : '▶'}
                      </button>
                      <span className="text-emerald-400 text-xs truncate flex-1 min-w-0">{fileName}</span>
                      <button onClick={() => removeAudio(key)}
                        className="text-gray-600 hover:text-red-400 text-xs transition shrink-0">✕</button>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">{t.sc.azanNoAudio}</span>
                  )}
                </div>

                {/* Upload */}
                <input type="file" accept="audio/*,.mp3,.aac,.ogg,.wav,.m4a,.opus,.flac" className="hidden"
                  ref={el => { fileRefs.current[key] = el }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAudio(key, f); e.target.value = '' }}
                />
                <button onClick={() => fileRefs.current[key]?.click()} disabled={isUploading}
                  className="shrink-0 text-xs text-gray-500 hover:text-emerald-400 disabled:opacity-40 transition"
                  title={t.sc.azanUpload}>
                  {isUploading ? '…' : '⬆'}
                </button>

                {/* Mediathek */}
                <button onClick={() => openMediaPicker(key)}
                  className="shrink-0 text-xs text-gray-500 hover:text-emerald-400 transition"
                  title="Aus Mediathek wählen">
                  📂
                </button>
              </div>

              {/* Mediathek-Picker (aufgeklappt für dieses Gebet) */}
              {pickerFor === key && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0d1117' }}>
                  <div className="flex items-center justify-between px-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-gray-400 text-xs">Aus Mediathek wählen</span>
                    <button onClick={() => setPickerFor(null)} className="text-gray-600 hover:text-white text-xs">✕</button>
                  </div>
                  {loadingMedia ? (
                    <div className="p-3 text-gray-600 text-xs text-center">Lade…</div>
                  ) : mediaFiles.length === 0 ? (
                    <div className="p-3 text-gray-600 text-xs text-center">Keine Audio-Dateien in der Mediathek</div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto">
                      {mediaFiles.map(f => (
                        <button key={f.url} onClick={() => selectFromMedia(f.url, f.name.split('/').pop() ?? f.name)}
                          className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition truncate block">
                          🎵 {f.name.split('/').pop()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {uploadError && <p className="text-red-400 text-xs px-1">{uploadError}</p>}
      {playError && <p className="text-red-400 text-xs px-1">{playError}</p>}

      <button onClick={handleSave} disabled={saving}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
        {saving ? t.sc.azanSaving : t.sc.azanSave}
      </button>
    </div>
  )
}

function PairingDialog({ onPaired, onClose }: {
  onPaired: (s: Screen) => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const t = useCmsT()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function pair() {
    if (code.length !== 6) { setError(t.sc.errCode); return }
    if (!name.trim()) { setError(t.sc.errName); return }
    setError(null)
    setLoading(true)

    const { data: pairing, error: lookupErr } = await supabase
      .from('pairing_codes')
      .select('hardware_id')
      .eq('code', code.trim())
      .maybeSingle()

    if (lookupErr) {
      setError(`DB: ${lookupErr.message}`)
      setLoading(false)
      return
    }

    if (!pairing) {
      setError(tplNamed(t.sc.errNotFound, { code: code.trim() }))
      setLoading(false)
      return
    }

    const { data: screen, error: insertErr } = await supabase
      .from('screens')
      .upsert({
        hardware_id: pairing.hardware_id,
        owner_id: user!.id,
        name: name.trim(),
        orientation,
        paired: true,
      }, { onConflict: 'hardware_id' })
      .select()
      .single()

    if (insertErr || !screen) {
      setError(t.sc.errPair)
      setLoading(false)
      return
    }

    await supabase.from('pairing_codes').delete().eq('code', code)
    onPaired(screen as Screen)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-white font-bold text-lg">{t.sc.pairTitle}</h2>

        <input
          type="text"
          placeholder={t.sc.namePh}
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500"
        />

        <input
          type="text"
          placeholder={t.sc.codePh}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 font-mono text-xl tracking-widest text-center"
          maxLength={6}
        />

        <div className="flex gap-2">
          {(['landscape', 'portrait'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                orientation === o
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {o === 'landscape' ? '⬛ 16:9' : '▮ 9:16'}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm transition"
          >
            {t.sc.cancel}
          </button>
          <button
            onClick={pair}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            {loading ? '...' : t.sc.pair}
          </button>
        </div>
      </div>
    </div>
  )
}
