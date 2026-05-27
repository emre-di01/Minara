import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../components/Layout'
import type { Playlist, Slide, SlideTransition, PrayerTheme, TickerOverlay, PrayerSource } from '../../types'
import { LANGUAGES, type LangCode } from '../../lib/i18n'
import { useCmsT } from '../../lib/cms-lang'
import { tplNamed } from '../../lib/cms-i18n'
import LocationPicker from '../components/LocationPicker'

const SLIDE_TYPES: { type: Slide['type']; label: string; icon: string }[] = [
  { type: 'prayer_times',  label: 'Gebetszeiten',    icon: '🕌' },
  { type: 'media',         label: 'Bild / Video',    icon: '🖼️' },
  { type: 'ticker',        label: 'Lauftext',        icon: '📰' },
  { type: 'rss',           label: 'RSS Feed',        icon: '📡' },
  { type: 'weather',       label: 'Wetter',          icon: '🌤️' },
  { type: 'hadith',        label: 'Hadith',          icon: '📖' },
  { type: 'quran',         label: 'Quran-Vers',      icon: '🌙' },
  { type: 'asmaul_husna',  label: 'Asmaul Husna',   icon: '✨' },
  { type: 'events',        label: 'Veranstaltungen', icon: '📅' },
  { type: 'donation',      label: 'Spendenaufruf',   icon: '💝' },
  { type: 'social_follow', label: 'Social Media',    icon: '📱' },
  { type: 'instagram_feed',label: 'Instagram Feed',  icon: '📸' },
  { type: 'ramadan',       label: 'Ramadan',         icon: '☽' },
  { type: 'jumu_a',        label: "Jumu'a · Freitag",icon: '📿' },
]

const SLIDE_PREVIEW_COLORS: Partial<Record<Slide['type'], Record<string, string>>> = {
  prayer_times: { madinah: '#1a1200', bosphorus: '#0a1428', mekka: '#100820', night: '#050505' },
  hadith:       { forest: '#060e08', midnight: '#050505', warm: '#fdf8f0' },
  quran:        { violet: '#1a0a2e', madinah: '#1a1200', emerald: '#031208' },
  asmaul_husna: { amber: '#1c1400', teal: '#041414', indigo: '#060824' },
  events:       { dark: '#080808', green: '#030f07', gold: '#090700', blue: '#030810', purple: '#08040f', night: '#000000' },
  donation:     { gold: '#090600', green: '#030a05', teal: '#020a0a', purple: '#07040f', warm: '#0f0703' },
  social_follow:{ dark: '#070709', light: '#f8f9fa', colorful: '#1a0a14' },
  ramadan:      { madinah: '#1a1000', night: '#0a0d1a', emerald: '#041208' },
  jumu_a:       { dark: '#0a0f0a', gold: '#1a1200', blue: '#050d1a' },
}

function getSlidePreviewColor(slide: Slide): string {
  const theme = (slide.config.theme as string) ?? (slide.config.prayerTheme as string) ?? ''
  return SLIDE_PREVIEW_COLORS[slide.type]?.[theme] ?? '#1a1a1a'
}

const PRAYER_THEMES: { id: PrayerTheme; label: string; desc: string; color: string }[] = [
  { id: 'madinah',   label: 'Madinah',   desc: 'Dunkel · Gold',       color: '#d4a843' },
  { id: 'bosphorus', label: 'Bosphorus', desc: 'Foto-Sidebar · Gold',  color: '#f0c040' },
  { id: 'mekka',     label: 'Mekka',     desc: 'Kosmisch · Gold',     color: '#d4af37' },
  { id: 'night',     label: 'Night',     desc: 'Cinematic · Weiß',    color: '#ffffff' },
]

// ─── Design / layout options ──────────────────────────────────────────────────

const MEDIA_LAYOUTS = [
  { id: 'fullscreen', label: 'Vollbild',   desc: 'Bild füllt den gesamten Bildschirm', color: '#1a1a1a' },
  { id: 'centered',   label: 'Zentriert',  desc: 'Bild mit Rand und weichem Hintergrund', color: '#1a1424' },
  { id: 'split',      label: 'Geteilt',    desc: 'Beschriftung links — Bild rechts', color: '#141a14' },
]

const TICKER_LAYOUTS = [
  { id: 'billboard', label: 'Anzeige',  desc: 'Großer Text zentriert · ideal für ältere Besucher', color: '#0a1a0a' },
  { id: 'scroll',    label: 'Laufband', desc: 'Animierter Lauftext am unteren Bildschirmrand',      color: '#141414' },
]

const RSS_LAYOUTS = [
  { id: 'editorial', label: 'Editorial', desc: 'Bild als Hintergrund mit Textpanel', color: '#111' },
  { id: 'card',      label: 'Karte',     desc: 'Klare Karte, kein Hintergrundbild', color: '#111129' },
]

const WEATHER_LAYOUTS = [
  { id: 'cinematic', label: 'Kino',       desc: 'Stadtfoto + Animationen — maximaler Wow-Faktor', color: '#0a0a0a' },
  { id: 'forecast',  label: 'Vorhersage', desc: '5-Tage-Prognose im Apple-Stil',                  color: '#0a1a2e' },
  { id: 'minimal',   label: 'Minimal',    desc: 'Große Temperatur + dynamischer Hintergrund',       color: '#0a3a6a' },
  { id: 'panel',     label: 'Kacheln',    desc: 'Glassmorphismus-Karten mit Animationen',           color: '#1a2a3e' },
]

const HADITH_THEMES = [
  { id: 'forest',   label: 'Wald',       desc: 'Dunkelgrün — klassisch', color: '#0a1a0e' },
  { id: 'midnight', label: 'Mitternacht', desc: 'Sehr dunkel mit Gold', color: '#050505', accent: '#d4a843' },
  { id: 'warm',     label: 'Warm',        desc: 'Heller Hintergrund — sehr gut lesbar', color: '#fdf8f0', textDark: true },
]

const QURAN_THEMES = [
  { id: 'violet',  label: 'Violett', desc: 'Dunkel-violett — mystisch', color: '#1a0a2e' },
  { id: 'madinah', label: 'Madinah', desc: 'Dunkel mit Goldakzenten', color: '#1a1200' },
  { id: 'emerald', label: 'Smaragd', desc: 'Dunkelgrün — elegant', color: '#031208' },
]

const ASMAUL_THEMES = [
  { id: 'amber',  label: 'Amber',  desc: 'Gold auf Dunkel — klassisch', color: '#1c1400' },
  { id: 'teal',   label: 'Türkis', desc: 'Grün-Blau', color: '#041414' },
  { id: 'indigo', label: 'Indigo', desc: 'Nachtblau', color: '#060824' },
]

const EVENTS_THEMES = [
  { id: 'dark',   label: 'Dunkel', desc: 'Schwarz mit Smaragd-Akzenten', color: '#080808' },
  { id: 'green',  label: 'Grün',   desc: 'Dunkelgrün — frisch',          color: '#030f07' },
  { id: 'gold',   label: 'Gold',   desc: 'Dunkel mit Gold-Akzenten',     color: '#090700' },
  { id: 'blue',   label: 'Blau',   desc: 'Dunkel mit Blau-Akzenten',     color: '#030810' },
  { id: 'purple', label: 'Lila',   desc: 'Dunkel mit Lila-Akzenten',     color: '#08040f' },
  { id: 'night',  label: 'Nacht',  desc: 'Reines Schwarz · Weiß',        color: '#000000' },
]

const DONATION_THEMES = [
  { id: 'gold',   label: 'Gold',   desc: 'Warm-dunkel mit Gold',  color: '#090600' },
  { id: 'green',  label: 'Grün',   desc: 'Dunkel mit Smaragd',    color: '#030a05' },
  { id: 'teal',   label: 'Türkis', desc: 'Dunkel mit Türkis',     color: '#020a0a' },
  { id: 'purple', label: 'Lila',   desc: 'Dunkel mit Lila',       color: '#07040f' },
  { id: 'warm',   label: 'Warm',   desc: 'Dunkel mit Orange',     color: '#0f0703' },
]

const SOCIAL_THEMES = [
  { id: 'dark',     label: 'Dunkel',  desc: 'Schwarz mit Akzenten je Plattform', color: '#070709' },
  { id: 'light',    label: 'Hell',    desc: 'Hell · ideal bei viel Umgebungslicht', color: '#f8f9fa', textDark: true },
  { id: 'colorful', label: 'Bunt',    desc: 'Plattform-Farben dominanter',  color: '#1a0a14' },
]

const RAMADAN_THEMES = [
  { id: 'madinah', label: 'Madinah', desc: 'Dunkel · Gold', color: '#1a1000' },
  { id: 'night',   label: 'Nacht',   desc: 'Dunkel · Blau', color: '#0a0d1a' },
  { id: 'emerald', label: 'Smaragd', desc: 'Dunkel · Grün', color: '#041208' },
]

const JUMUA_THEMES = [
  { id: 'dark', label: 'Dunkel', desc: 'Schwarz · Smaragd', color: '#0a0f0a' },
  { id: 'gold', label: 'Gold',   desc: 'Dunkel · Gold',     color: '#1a1200' },
  { id: 'blue', label: 'Blau',   desc: 'Dunkel · Blau',     color: '#050d1a' },
]

const LANG_LOCALE_MAP: Record<string, string> = {
  de: 'de-DE', en: 'en-US', tr: 'tr-TR', ar: 'ar-SA',
  fr: 'fr-FR', nl: 'nl-NL', bs: 'bs-BA', ur: 'ur-PK',
  id: 'id-ID', ms: 'ms-MY', sq: 'sq-AL', az: 'az-AZ',
}

function formatEventDate(isoDate: string, lang: string): string {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate + 'T12:00:00')
    const locale = LANG_LOCALE_MAP[lang] ?? 'de-DE'
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })
  } catch { return isoDate }
}

function newSlide(type: Slide['type']): Slide {
  const defaultConfigs: Partial<Record<Slide['type'], Record<string, unknown>>> = {
    prayer_times:  { prayerTheme: 'madinah' },
    events:        { title: 'Veranstaltungen', theme: 'dark', lang: 'de', events: [] },
    donation:      { title: 'Spendenaufruf', theme: 'gold', currency: '€', goal: 10000, current: 0 },
    social_follow: { title: 'Folgt uns!', theme: 'dark', channels: [] },
    instagram_feed:{ handle: '', token: '', posts: [] },
    ramadan:       { theme: 'madinah', lang: 'de' },
    jumu_a:        { time: '13:00', theme: 'dark', lang: 'de' },
  }
  return {
    id: Math.random().toString(36).slice(2),
    type,
    duration: type === 'prayer_times' ? 0 : 15,
    config: defaultConfigs[type] ?? {},
  }
}

export default function PlaylistBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useCmsT()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<'list' | 'config'>('list')
  const [showSlideChooser, setShowSlideChooser] = useState(false)
  const [tickerOverlay, setTickerOverlay] = useState<TickerOverlay>({ enabled: false, texts: [''], style: 'dark', speed: 25 })
  const [dragId, setDragId]         = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('playlists').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) { navigate('/admin/playlists'); return }
        const pl = data as Playlist
        setPlaylist(pl)
        setSlides((pl.slides ?? []) as Slide[])
        const ov = pl.ticker_overlay
        // migrate old single-text format
        const loadedOv = ov
          ? { ...ov, texts: ov.texts ?? [(ov as unknown as { text?: string }).text ?? ''] }
          : { enabled: false, texts: [''], style: 'dark' as const, speed: 25 }
        setTickerOverlay(loadedOv)
      })
  }, [id, navigate])

  async function save() {
    if (!id) return
    setSaving(true)
    await supabase.from('playlists').update({ slides, ticker_overlay: tickerOverlay }).eq('id', id)
    setSaving(false)
  }

  function updateOverlay<K extends keyof TickerOverlay>(key: K, value: TickerOverlay[K]) {
    setTickerOverlay(t => ({ ...t, [key]: value }))
  }

  function selectItem(itemId: string) {
    setSelected(itemId)
    setMobilePanel('config')
  }

  function addSlide(type: Slide['type']) { const s = newSlide(type); setSlides(sl => [...sl, s]); selectItem(s.id); setShowSlideChooser(false) }
  function removeSlide(sId: string) { setSlides(sl => sl.filter(x => x.id !== sId)); if (selected === sId) { setSelected(null); setMobilePanel('list') } }
  function moveSlide(sId: string, dir: -1 | 1) {
    setSlides(sl => {
      const i = sl.findIndex(x => x.id === sId)
      const j = i + dir
      if (j < 0 || j >= sl.length) return sl
      const next = [...sl]; [next[i], next[j]] = [next[j], next[i]]; return next
    })
  }
  function updateSlideConfig(sId: string, key: string, value: unknown) {
    setSlides(sl => sl.map(x => x.id === sId ? { ...x, config: { ...x.config, [key]: value } } : x))
  }
  function updateSlideDuration(sId: string, value: number) {
    setSlides(sl => sl.map(x => x.id === sId ? { ...x, duration: value } : x))
  }
  function updateSlideTransition(sId: string, t: Slide['transition']) {
    setSlides(sl => sl.map(x => x.id === sId ? { ...x, transition: t } : x))
  }
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    setSlides(sl => {
      const from = sl.findIndex(x => x.id === dragId)
      const to   = sl.findIndex(x => x.id === targetId)
      if (from < 0 || to < 0) return sl
      const next = [...sl]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setDragId(null)
    setDragOverId(null)
  }

  if (!playlist) return <Layout><div className="p-6 text-gray-500">{t.pb.loading}</div></Layout>

  const selectedSlide = slides.find(s => s.id === selected)
  const showList   = mobilePanel === 'list'
  const showConfig = mobilePanel === 'config'
  // Translated slide types
  const slideTypes = SLIDE_TYPES.map(s => ({ ...s, label: t.pb.types[s.type] ?? s.label }))

  return (
    <Layout>
      <div className="flex flex-col md:h-screen">

        {/* ── Breadcrumb header ── */}
        <div className="shrink-0 flex items-center gap-2 px-4 h-13 min-h-[3.25rem] border-b border-gray-800 bg-gray-900">
          <Link to="/admin/playlists"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition shrink-0">
            {t.pb.back}
          </Link>
          <span className="text-gray-700 text-xs shrink-0">/</span>
          <span className="text-white text-sm font-medium truncate flex-1 min-w-0">{playlist.name}</span>
          <button onClick={save} disabled={saving}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition">
            {saving ? '...' : t.pb.save}
          </button>
        </div>

        {/* ── Mobile panel tabs ── */}
        <div className="md:hidden shrink-0 flex bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setMobilePanel('list')}
            className={`flex-1 py-3 text-sm font-medium transition border-b-2 -mb-px ${
              mobilePanel === 'list' ? 'text-white border-emerald-500' : 'text-gray-500 border-transparent'
            }`}
          >
            {t.pb.tabSlides}{slides.length > 0 ? ` (${slides.length})` : ''}
          </button>
          <button
            onClick={() => selectedSlide && setMobilePanel('config')}
            className={`flex-1 py-3 text-sm font-medium transition border-b-2 -mb-px ${
              mobilePanel === 'config'
                ? 'text-white border-emerald-500'
                : !selectedSlide
                ? 'text-gray-700 border-transparent cursor-not-allowed'
                : 'text-gray-500 border-transparent'
            }`}
          >
            {selectedSlide
              ? `${SLIDE_TYPES.find(x => x.type === selectedSlide.type)?.icon} ${t.pb.tabSettings}`
              : t.pb.tabSettings}
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden min-h-0">

        {/* ── Left panel ── */}
        <div className={`${showConfig ? 'hidden' : 'flex'} md:flex w-full md:w-72 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 flex-col md:overflow-y-auto`}>

          {/* Add slide */}
          <div className="p-3 border-b border-gray-800">
            <button
              onClick={() => setShowSlideChooser(s => !s)}
              className="w-full flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-white transition"
            >
              <span>{t.pb.addSlide}</span>
              <span className="text-base leading-none">{showSlideChooser ? '✕' : '+'}</span>
            </button>
            {showSlideChooser && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {slideTypes.map(({ type, label, icon }) => (
                  <button key={type} onClick={() => addSlide(type)}
                    className="flex items-center gap-2 text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 rounded-lg px-2.5 py-2.5 transition">
                    <span className="shrink-0 text-sm">{icon}</span>
                    <span className="leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slide list */}
          <div className="flex-1 p-3 flex flex-col">
            {slides.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">{t.pb.noSlides}</p>}
            {slides.map((s, i) => {
              const meta = SLIDE_TYPES.find(x => x.type === s.type)
              const isDragging  = dragId === s.id
              const isDropTarget = dragOverId === s.id && dragId !== s.id
              return (
                <div key={s.id}>
                  {/* Slide card */}
                  <div
                    draggable
                    onDragStart={e => { e.stopPropagation(); setDragId(s.id) }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(s.id) }}
                    onDrop={e => { e.preventDefault(); handleDrop(s.id) }}
                    onClick={() => selectItem(s.id)}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2.5 cursor-pointer transition select-none
                      ${isDragging ? 'opacity-40' : ''}
                      ${isDropTarget ? 'ring-2 ring-emerald-400 ring-inset' : ''}
                      ${selected === s.id ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-gray-800 hover:bg-gray-750 border border-transparent'}`}>
                    {/* Drag handle + arrows */}
                    <div className="flex flex-col items-center gap-0.5 text-gray-600 shrink-0">
                      <button onClick={e => { e.stopPropagation(); moveSlide(s.id, -1) }}
                        className="hover:text-white transition leading-none text-xs">▲</button>
                      <span className="cursor-grab active:cursor-grabbing text-xs leading-none">⠿</span>
                      <button onClick={e => { e.stopPropagation(); moveSlide(s.id, 1) }}
                        className="hover:text-white transition leading-none text-xs">▼</button>
                    </div>
                    <div className="flex-1 flex items-center gap-2 text-sm min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/10"
                        style={{ background: getSlidePreviewColor(s) }} />
                      <span>{meta?.icon}</span>
                      <span className="text-gray-200 truncate">{t.pb.types[s.type] ?? meta?.label}</span>
                      <span className="text-gray-600 text-xs shrink-0">
                        {s.duration === 0 ? '∞' : `${s.duration}s`}
                      </span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeSlide(s.id) }}
                      className="text-gray-600 hover:text-red-400 text-xs transition shrink-0 p-1">✕</button>
                  </div>

                  {/* Transition connector (between slides, not after the last) */}
                  {i < slides.length - 1 && (
                    <div className="flex items-center justify-center gap-1 py-1 px-2">
                      {(['fade', 'slide', 'zoom', 'none'] as SlideTransition[]).map(tr => {
                        const active = (s.transition ?? 'fade') === tr
                        const transLabels: Record<SlideTransition, string> = {
                          fade: t.pb.transFade, slide: t.pb.transSlide,
                          zoom: t.pb.transZoom, none: t.pb.transCut,
                        }
                        return (
                          <button key={tr}
                            onClick={e => { e.stopPropagation(); updateSlideTransition(s.id, tr) }}
                            className={`text-xs px-2 py-0.5 rounded-full transition border ${active ? 'border-emerald-600 bg-emerald-900/40 text-emerald-400' : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}>
                            {transLabels[tr]}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Ticker overlay */}
          <div className="p-4 border-t border-gray-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.pb.tickerOverlay}</p>
              <button onClick={() => updateOverlay('enabled', !tickerOverlay.enabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${tickerOverlay.enabled ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tickerOverlay.enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {tickerOverlay.enabled && (
              <>
                {/* Text items */}
                <div className="flex flex-col gap-1.5">
                  {tickerOverlay.texts.map((msg, i) => (
                    <div key={i} className="flex gap-1.5 items-start">
                      <span className="text-gray-600 text-xs pt-2 w-4 shrink-0 text-right">{i + 1}.</span>
                      <textarea value={msg}
                        onChange={e => {
                          const next = [...tickerOverlay.texts]
                          next[i] = e.target.value
                          updateOverlay('texts', next)
                        }}
                        rows={2} placeholder={t.pb.tickerMsgPh}
                        className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-xs placeholder:text-gray-600 resize-none" />
                      {tickerOverlay.texts.length > 1 && (
                        <button onClick={() => updateOverlay('texts', tickerOverlay.texts.filter((_, j) => j !== i))}
                          className="text-gray-600 hover:text-red-400 text-xs pt-2 transition shrink-0">✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => updateOverlay('texts', [...tickerOverlay.texts, ''])}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition mt-0.5 ml-5">
                    <span className="text-base leading-none">+</span> {t.pb.addMsg}
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {(['dark', 'gold', 'green', 'light'] as const).map(s => (
                    <button key={s} onClick={() => updateOverlay('style', s)}
                      className={`flex-1 py-1 rounded-lg text-xs transition border ${tickerOverlay.style === s ? 'border-emerald-500 bg-emerald-900/30 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                      {s === 'dark' ? t.pb.dark : s === 'gold' ? t.pb.gold : s === 'green' ? t.pb.green : t.pb.light}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0">{t.pb.speed}</span>
                    <input type="range" min={10} max={60} value={tickerOverlay.speed}
                      onChange={e => updateOverlay('speed', +e.target.value)}
                      className="flex-1 accent-emerald-500" />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 px-0.5">
                    <span>{t.pb.fast}</span>
                    <span>{t.pb.slow}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save — desktop only */}
          <div className="hidden md:block p-4 border-t border-gray-800">
            <button onClick={save} disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
              {saving ? t.pb.saving : t.pb.save}
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-col flex-1 md:overflow-y-auto`}>
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            {!selectedSlide && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-16">
                <span className="text-4xl opacity-50">🎞️</span>
                <p className="text-gray-500 text-sm">{t.pb.selectSlide}</p>
              </div>
            )}
            {selectedSlide && (
              <SlideConfigurator slide={selectedSlide}
                onConfigChange={(k, v) => updateSlideConfig(selectedSlide.id, k, v)}
                onDurationChange={v => updateSlideDuration(selectedSlide.id, v)}
                onTransitionChange={v => updateSlideTransition(selectedSlide.id, v)} />
            )}
          </div>
        </div>
        </div>
      </div>
    </Layout>
  )
}

// ─── Slide configurator ───────────────────────────────────────────────────────

async function uploadMedia(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `backgrounds/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
  if (error) { console.error(error); return null }
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path)
  return publicUrl
}

type PickerOption = { id: string; label: string; desc: string; color: string; textDark?: boolean }

function OptionPicker({ label, options, value, onChange }: {
  label: string
  options: PickerOption[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(o => {
          const active = value === o.id
          return (
            <button key={o.id} onClick={() => onChange(o.id)}
              className={`flex flex-col items-start rounded-xl p-3 border transition text-left ${active ? 'border-emerald-500 bg-emerald-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
              <div className="w-6 h-6 rounded-lg mb-2 border border-white/10 shrink-0" style={{ background: o.color }} />
              <div className="text-white text-sm font-semibold leading-snug">{o.label}</div>
              <div className="text-gray-500 text-xs mt-0.5 leading-snug">{o.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const AI_TEMPLATES = [
  { label: 'Ramadan Ankündigung',    prompt: 'Ramadan Mubarak announcement poster, mosque at night, golden lanterns, crescent moon, Islamic geometric patterns, cinematic, 4K' },
  { label: 'Eid Mubarak',            prompt: 'Eid al-Fitr celebration poster, festive, green and gold, Islamic ornaments, joyful, elegant typography space, 4K' },
  { label: 'Freitagsgebet',          prompt: 'Jumu\'ah Friday prayer invitation, grand mosque architecture, sunset light, peaceful, cinematic photography, 4K' },
  { label: 'Iftar Einladung',        prompt: 'Iftar dinner invitation, dates and traditional food, warm amber light, community gathering, welcoming atmosphere, 4K' },
  { label: 'Islamischer Vortrag',    prompt: 'Islamic lecture event poster, open books, Arabic calligraphy, blue and gold, knowledge, elegant, 4K' },
  { label: 'Spendenaufruf',          prompt: 'Mosque fundraising campaign, community hands giving, warm light, hope, unity, professional poster design, 4K' },
  { label: 'Islamisches Neujahr',    prompt: 'Islamic New Year Hijri poster, crescent moon over city, stars, dark blue and silver, spiritual, 4K' },
  { label: 'Stadtfoto',              prompt: 'Cinematic city skyline at golden hour, dramatic clouds, architectural photography, 4K, award winning' },
]

function AiImageGenerator({ onUse }: { onUse: (url: string) => void }) {
  const t = useCmsT()
  const [format,     setFormat]     = useState<'16:9' | '9:16'>('16:9')
  const [prompt,     setPrompt]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [preview,    setPreview]    = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  async function handleGenerate() {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setError(null)
    setPreview(null)
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim(), format },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('No URL returned')
      setPreview(data.url as string)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[AI-Generator]', msg, e)
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1rem' }}>✨</span>
        <span className="text-sm font-semibold" style={{ color: '#a78bfa' }}>{t.pb.aiTitle}</span>
        <span className="text-xs text-gray-500 ml-1">via FLUX.1</span>
      </div>

      {/* Format */}
      <div className="flex gap-2">
        {(['16:9', '9:16'] as const).map(f => (
          <button key={f} onClick={() => setFormat(f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              background: format === f ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${format === f ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
              color: format === f ? '#c4b5fd' : '#6b7280',
            }}>
            <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{f === '16:9' ? '▬' : '▮'}</span>
            {f === '16:9' ? t.pb.aiLandscape : t.pb.aiPortrait}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="flex flex-wrap gap-1.5">
        {AI_TEMPLATES.map((tmpl, i) => (
          <button key={i} onClick={() => setPrompt(tmpl.prompt)}
            className="px-2.5 py-1 rounded-full text-xs transition"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
            {t.pb.aiTemplates[i] ?? tmpl.label}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
        placeholder={t.pb.aiPromptPh}
        className="rounded-lg px-3 py-2 text-sm resize-none outline-none"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.2)', color: '#fff' }} />

      {/* Generate */}
      <button onClick={handleGenerate} disabled={!prompt.trim() || generating}
        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition"
        style={{
          background: generating || !prompt.trim() ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.6)',
          color: generating || !prompt.trim() ? '#6b7280' : '#fff',
          cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
        }}>
        {generating ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
            {t.pb.aiGenerating}
          </>
        ) : t.pb.aiGenerate}
      </button>

      {/* Error */}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Preview */}
      {preview && (
        <div className="flex flex-col gap-2">
          <img src={preview} alt={t.pb.aiTitle} className="w-full rounded-lg object-cover"
            style={{ aspectRatio: format === '9:16' ? '9/16' : '16/9', maxHeight: 240 }} />
          <div className="flex gap-2">
            <button onClick={() => { onUse(preview); setPreview(null) }}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition"
              style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
              {t.pb.aiUse}
            </button>
            <button onClick={() => handleGenerate()}
              className="px-3 rounded-lg text-sm transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
              {t.pb.aiAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaPickerModal({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const t = useCmsT()
  const [files, setFiles] = useState<{ name: string; path: string; mimetype: string; publicUrl: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const all: { name: string; path: string; mimetype: string; publicUrl: string }[] = []
      for (const folder of ['backgrounds', 'logos']) {
        const { data } = await supabase.storage.from('media').list(folder, {
          limit: 200, sortBy: { column: 'created_at', order: 'desc' },
        })
        if (!data) continue
        for (const f of data) {
          if (!f.name || f.name === '.emptyFolderPlaceholder') continue
          const path = `${folder}/${f.name}`
          const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
          all.push({ name: f.name, path, mimetype: f.metadata?.mimetype ?? '', publicUrl })
        }
      }
      setFiles(all)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">{t.pb.libTitle}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t.pb.libEmpty}</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {files.map(f => (
                <button key={f.path} onClick={() => onSelect(f.publicUrl)}
                  className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500 transition text-left">
                  <div className="aspect-video bg-gray-700 flex items-center justify-center overflow-hidden">
                    {f.mimetype.startsWith('image/') ? (
                      <img src={f.publicUrl} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : f.mimetype.startsWith('video/') ? (
                      <video src={f.publicUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <span className="text-2xl">📄</span>
                    )}
                  </div>
                  <p className="px-2 py-1.5 text-xs text-gray-300 truncate">{f.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SlideConfigurator({ slide, onConfigChange, onDurationChange, onTransitionChange }: {
  slide: Slide
  onConfigChange: (key: string, value: unknown) => void
  onDurationChange: (v: number) => void
  onTransitionChange?: (v: SlideTransition) => void
}) {
  const t = useCmsT()
  const meta = SLIDE_TYPES.find(x => x.type === slide.type)
  const [uploading,  setUploading]  = useState(false)
  const [showAiGen,  setShowAiGen]  = useState(false)
  const [mediaPicker, setMediaPicker] = useState<string | null>(null)

  // Translated option arrays
  const prayerThemes  = PRAYER_THEMES.map(o => ({ ...o, ...t.pb.opts.prayer?.[o.id]  }))
  const mediaLayouts  = MEDIA_LAYOUTS.map(o => ({ ...o, ...t.pb.opts.media?.[o.id]   }))
  const tickerLayouts = TICKER_LAYOUTS.map(o => ({ ...o, ...t.pb.opts.ticker?.[o.id] }))
  const rssLayouts    = RSS_LAYOUTS.map(o => ({ ...o, ...t.pb.opts.rss?.[o.id]       }))
  const weatherLayouts= WEATHER_LAYOUTS.map(o => ({ ...o, ...t.pb.opts.weather?.[o.id]}))
  const hadithThemes  = HADITH_THEMES.map(o => ({ ...o, ...t.pb.opts.hadith?.[o.id]  }))
  const quranThemes   = QURAN_THEMES.map(o => ({ ...o, ...t.pb.opts.quran?.[o.id]    }))
  const asmaulThemes  = ASMAUL_THEMES.map(o => ({ ...o, ...t.pb.opts.asmaul?.[o.id]  }))
  const eventsThemes  = EVENTS_THEMES.map(o => ({ ...o, ...t.pb.opts.events?.[o.id]  }))
  const donationThemes= DONATION_THEMES.map(o => ({ ...o, ...t.pb.opts.donation?.[o.id]}))
  const socialThemes  = SOCIAL_THEMES.map(o => ({ ...o, ...t.pb.opts.social?.[o.id]  }))
  const ramadanThemes = RAMADAN_THEMES.map(o => ({ ...o, ...t.pb.opts.ramadan?.[o.id] }))
  const jumuaThemes   = JUMUA_THEMES.map(o => ({ ...o, ...t.pb.opts.jumua?.[o.id]    }))

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, configKey: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadMedia(file)
    setUploading(false)
    if (url) onConfigChange(configKey, url)
  }

  return (
    <div className="max-w-lg flex flex-col gap-4">
      {mediaPicker !== null && (
        <MediaPickerModal
          onSelect={url => { onConfigChange(mediaPicker, url); setMediaPicker(null) }}
          onClose={() => setMediaPicker(null)}
        />
      )}
      <h2 className="text-white font-bold text-lg">{meta?.icon} {t.pb.types[slide.type] ?? meta?.label}</h2>

      {/* Duration + Transition */}
      <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
        <div>
          <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">{t.pb.duration}</p>
          <div className="flex items-center gap-3">
            <input type="number" min={0} max={3600} value={slide.duration}
              onChange={e => onDurationChange(+e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm w-24" />
            <span className="text-gray-400 text-sm">{t.pb.durationHint}</span>
          </div>
        </div>

        {/* Transition to next slide */}
        {onTransitionChange && (
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">{t.pb.transitionLabel}</p>
            <div className="flex gap-2">
              {(['fade', 'slide', 'zoom', 'none'] as SlideTransition[]).map(tr => {
                const active = (slide.transition ?? 'fade') === tr
                const labels: Record<SlideTransition, string> = {
                  fade: t.pb.transFade, slide: t.pb.transSlide,
                  zoom: t.pb.transZoom, none: t.pb.transCut,
                }
                return (
                  <button key={tr} onClick={() => onTransitionChange(tr)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition border
                      ${active
                        ? 'border-emerald-500 bg-emerald-900/40 text-emerald-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
                    {labels[tr]}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Prayer times config */}
      {slide.type === 'prayer_times' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">

          {/* ── Gebetszeiten-Quelle ── */}
          <div className="flex flex-col gap-2">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.pb.prayerSource}</span>
            {/* Current source badge */}
            {(slide.config.source as string) === 'calculated' ? (
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/40 rounded-lg px-3 py-2">
                <span className="text-blue-300 text-xs">📐</span>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-200 text-xs font-medium truncate">{(slide.config.locationName as string) || '—'}</p>
                  <p className="text-blue-400 text-xs opacity-70">{t.pb.prayerSourceCalc} · {(slide.config.method as string) ?? 'MWL'}</p>
                </div>
                <button onClick={() => onConfigChange('_showLocationPicker', true)} className="shrink-0 text-gray-400 hover:text-gray-200 text-xs transition">{t.pb.change}</button>
              </div>
            ) : (slide.config.source as string) === 'diyanet' ? (
              <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/40 rounded-lg px-3 py-2">
                <span className="text-emerald-400 text-xs">🕌</span>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-200 text-xs font-medium truncate">{(slide.config.cityName as string) || `ID: ${slide.config.cityId}`}</p>
                  <p className="text-emerald-400 text-xs opacity-70">Diyanet</p>
                </div>
                <button onClick={() => onConfigChange('_showLocationPicker', true)} className="shrink-0 text-gray-400 hover:text-gray-200 text-xs transition">{t.pb.change}</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <span className="text-gray-500 text-xs">📍</span>
                <p className="text-gray-500 text-xs flex-1">{t.pb.prayerSourceHint}</p>
                <button onClick={() => onConfigChange('_showLocationPicker', true)} className="shrink-0 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition">{t.pb.set}</button>
              </div>
            )}
            {/* LocationPicker inline */}
            {(slide.config._showLocationPicker as boolean) && (
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <LocationPicker
                  current={slide.config.source ? { source: slide.config.source, ...(slide.config as Record<string, unknown>) } as unknown as PrayerSource : null}
                  onSelect={src => {
                    // Clear old source fields, apply new source
                    const base: Record<string, unknown> = {
                      _showLocationPicker: false,
                      source: src.source,
                      cityId: null, cityName: null,
                      lat: null, lng: null, method: null, locationName: null,
                    }
                    if (src.source === 'diyanet') {
                      base.cityId = src.cityId
                      base.cityName = src.cityName ?? ''
                    } else {
                      base.lat = src.lat
                      base.lng = src.lng
                      base.method = src.method
                      base.locationName = src.locationName ?? ''
                    }
                    Object.entries(base).forEach(([k, v]) => onConfigChange(k, v))
                  }}
                  onCancel={() => onConfigChange('_showLocationPicker', false)}
                />
              </div>
            )}
          </div>

          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.pb.design}</p>
          <div className="grid grid-cols-2 gap-2">
            {prayerThemes.map(th => (
              <button key={th.id} onClick={() => onConfigChange('prayerTheme', th.id)}
                className={`flex flex-col items-start rounded-xl p-3 border transition ${slide.config.prayerTheme === th.id ? 'border-emerald-500 bg-emerald-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                <div className="w-5 h-5 rounded-full mb-2" style={{ background: th.color }} />
                <div className="text-white text-sm font-semibold">{th.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{th.desc}</div>
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.mosqueName}</span>
            <input type="text" value={(slide.config.mosqueName as string) ?? ''} onChange={e => onConfigChange('mosqueName', e.target.value)}
              placeholder="z.B. Al-Nour Moschee" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.mosqueAddr}</span>
            <input type="text" value={(slide.config.mosqueAddress as string) ?? ''} onChange={e => onConfigChange('mosqueAddress', e.target.value)}
              placeholder="Musterstraße 1, 12345 Berlin" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          {/* ── Logo ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-gray-400 text-xs">{t.pb.mosqueLogo}</span>
            <div className="flex items-center gap-2">
              {(slide.config.logoUrl as string) ? (
                <img src={slide.config.logoUrl as string} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-600" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                  <span className="text-gray-500 text-lg">🕌</span>
                </div>
              )}
              <div className="flex gap-1.5 flex-1">
                <button onClick={() => setMediaPicker('logoUrl')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
                  🖼 {t.pb.lib}
                </button>
                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${uploading ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  {uploading ? '⏳' : '📁'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => handleFileUpload(e, 'logoUrl')} />
                </label>
                {(slide.config.logoUrl as string) && (
                  <button onClick={() => onConfigChange('logoUrl', '')} className="text-gray-500 hover:text-red-400 text-xs transition px-1">{t.pb.remove}</button>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-xs">{t.pb.mosqueLogoHint}</p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.bgImg}</span>
            <div className="flex gap-2">
              <input type="url" value={(slide.config.bgImage as string) ?? ''} onChange={e => onConfigChange('bgImage', e.target.value)}
                placeholder="https://..." className="flex-1 min-w-0 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
              <button onClick={() => setMediaPicker('bgImage')}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
                🖼 {t.pb.lib}
              </button>
              <label className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${uploading ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {uploading ? '⏳' : '📁'}
                <span>{uploading ? t.pb.uploading : t.pb.file_}</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => handleFileUpload(e, 'bgImage')} />
              </label>
            </div>
            {!!(slide.config.bgImage) && (
              <div className="flex items-center gap-2 mt-1">
                <img src={slide.config.bgImage as string} className="w-12 h-8 object-cover rounded opacity-70" />
                <button onClick={() => onConfigChange('bgImage', '')} className="text-gray-500 hover:text-red-400 text-xs transition">{t.pb.remove}</button>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.tickerField}</span>
            <input type="text" value={(slide.config.ticker as string) ?? ''} onChange={e => onConfigChange('ticker', e.target.value)}
              placeholder="…" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{t.pb.lang}</span>
              <select value={(slide.config.lang as string) ?? 'de'} onChange={e => onConfigChange('lang', e.target.value as LangCode)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{t.pb.lang2}</span>
              <select value={(slide.config.lang2 as string) ?? ''} onChange={e => onConfigChange('lang2', e.target.value || null)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                <option value="">{t.pb.noLang2}</option>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.clock}</span>
            <select value={(slide.config.clockStyle as string) ?? 'digital'} onChange={e => onConfigChange('clockStyle', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
              <option value="digital">Digital</option>
              <option value="analog">Analog</option>
              <option value="none">{t.pb.clockHide}</option>
            </select>
          </label>

          {/* ── Prayer time correction offsets ── */}
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-gray-400 text-xs font-medium">{t.pb.offsetsTitle}</span>
              <p className="text-gray-600 text-xs mt-0.5">{t.pb.offsetsHint}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['fajr','sunrise','dhuhr','asr','maghrib','isha'] as const).map(key => {
                const offsets = (slide.config.offsets as Record<string, number> | undefined) ?? {}
                const val = offsets[key] ?? 0
                return (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs capitalize">{key}</span>
                    <input
                      type="number"
                      min={-60} max={120} step={1}
                      value={val === 0 ? '' : val}
                      placeholder="0"
                      onChange={e => {
                        const n = parseInt(e.target.value, 10)
                        const prev = (slide.config.offsets as Record<string, number> | undefined) ?? {}
                        const next = { ...prev, [key]: isNaN(n) ? 0 : n }
                        // clean up zeros to keep config lean
                        if (next[key] === 0) delete next[key]
                        onConfigChange('offsets', Object.keys(next).length ? next : null)
                      }}
                      className="bg-gray-800 text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right tabular-nums"
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Media ── */}
      {slide.type === 'media' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={mediaLayouts}
            value={(slide.config.layout as string) ?? 'fullscreen'}
            onChange={v => onConfigChange('layout', v)} />

          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.mediaUrl}</span>
            <div className="flex gap-2">
              <input type="url" value={(slide.config.url as string) ?? ''} onChange={e => onConfigChange('url', e.target.value)}
                placeholder="https://…"
                className="flex-1 min-w-0 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
              <button onClick={() => setMediaPicker('url')}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
                🖼 {t.pb.lib}
              </button>
              <label className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${uploading ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {uploading ? '⏳' : '📁'}
                <span>{uploading ? t.pb.uploading : t.pb.file_}</span>
                <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" disabled={uploading} onChange={e => handleFileUpload(e, 'url')} />
              </label>
            </div>
            {!!(slide.config.url) && /\.(jpg|jpeg|png|webp|gif)$/i.test(slide.config.url as string) && (
              <img src={slide.config.url as string} className="w-full h-20 object-cover rounded mt-1 opacity-70" />
            )}
          </div>

          <button onClick={() => setShowAiGen(v => !v)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition w-full"
            style={{
              background: showAiGen ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)',
              border: `1px solid ${showAiGen ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)'}`,
              color: '#a78bfa',
            }}>
            <span>✨</span>
            <span>{t.pb.aiBtn}</span>
            <span className="ml-auto text-purple-600">{showAiGen ? '▲' : '▼'}</span>
          </button>

          {showAiGen && (
            <AiImageGenerator onUse={url => {
              onConfigChange('url', url)
              setShowAiGen(false)
            }} />
          )}

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.caption}</span>
            <input type="text" value={(slide.config.caption as string) ?? ''} onChange={e => onConfigChange('caption', e.target.value)}
              placeholder={t.pb.captionPh}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        </div>
      )}

      {/* ── Ticker ── */}
      {slide.type === 'ticker' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={tickerLayouts}
            value={(slide.config.layout as string) ?? 'scroll'}
            onChange={v => onConfigChange('layout', v)} />

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.text}</span>
            <textarea value={(slide.config.text as string) ?? ''} onChange={e => onConfigChange('text', e.target.value)}
              rows={3} placeholder={t.pb.tickerMsgPh}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600 resize-none" />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.color}</span>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'dark',  label: t.pb.dark,  swatch: '#0a0a0a' },
                { id: 'gold',  label: t.pb.gold,  swatch: '#f5d87a' },
                { id: 'green', label: t.pb.green, swatch: '#6ee7b7' },
                { id: 'light', label: t.pb.light, swatch: '#f3f4f6' },
              ].map(s => {
                const active = ((slide.config.style as string) ?? 'dark') === s.id
                return (
                  <button key={s.id} onClick={() => onConfigChange('style', s.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition border ${active ? 'border-emerald-500 bg-emerald-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                    <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ background: s.swatch }} />
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RSS ── */}
      {slide.type === 'rss' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={rssLayouts}
            value={(slide.config.layout as string) ?? 'editorial'}
            onChange={v => onConfigChange('layout', v)} />

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.rssFeedUrl}</span>
            <input type="url" value={(slide.config.url as string) ?? ''} onChange={e => onConfigChange('url', e.target.value)}
              placeholder="https://…"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.rssLang}</span>
            <select value={(slide.config.lang as string) ?? 'de'} onChange={e => onConfigChange('lang', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* ── Weather ── */}
      {slide.type === 'weather' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={weatherLayouts}
            value={(slide.config.layout as string) ?? 'cinematic'}
            onChange={v => onConfigChange('layout', v)} />

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.city}</span>
            <input type="text" value={(slide.config.city as string) ?? ''} onChange={e => onConfigChange('city', e.target.value)}
              placeholder="Frankfurt"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        </div>
      )}

      {/* ── Hadith ── */}
      {slide.type === 'hadith' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-gray-500 text-xs">{t.pb.hadithSrc}</p>
          <OptionPicker label={t.pb.design} options={hadithThemes}
            value={(slide.config.theme as string) ?? 'forest'}
            onChange={v => onConfigChange('theme', v)} />
        </div>
      )}

      {/* ── Quran ── */}
      {slide.type === 'quran' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={quranThemes}
            value={(slide.config.theme as string) ?? 'violet'}
            onChange={v => onConfigChange('theme', v)} />

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.translLang}</span>
            <select value={(slide.config.lang as string) ?? 'de'} onChange={e => onConfigChange('lang', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
              {LANGUAGES.filter(l => ['de','en','fr','tr','id','nl','bs','ur','ms'].includes(l.code)).map(l =>
                <option key={l.code} value={l.code}>{l.label}</option>
              )}
            </select>
          </label>
        </div>
      )}

      {/* ── Asmaul Husna ── */}
      {slide.type === 'asmaul_husna' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-gray-500 text-sm">{t.pb.asmaulDesc}</p>
          <OptionPicker label={t.pb.design} options={asmaulThemes}
            value={(slide.config.theme as string) ?? 'amber'}
            onChange={v => onConfigChange('theme', v)} />
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.meaningLang}</span>
            <select value={(slide.config.lang as string) ?? 'de'} onChange={e => onConfigChange('lang', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
              {LANGUAGES.filter(l => ['de','en','tr','fr','nl'].includes(l.code)).map(l =>
                <option key={l.code} value={l.code}>{l.label}</option>
              )}
            </select>
          </label>
        </div>
      )}

      {/* ── Events ── */}
      {slide.type === 'events' && (() => {
        type EvItem = { title: string; date: string; dateRaw?: string; time?: string; description?: string }
        const evLang = (slide.config.lang as string) ?? 'de'
        const evList = (slide.config.events as EvItem[]) ?? []

        function updateEvent(i: number, key: string, val: string) {
          onConfigChange('events', evList.map((e, j) => j === i ? { ...e, [key]: val } : e))
        }
        function pickDate(i: number, iso: string) {
          const formatted = formatEventDate(iso, evLang)
          onConfigChange('events', evList.map((e, j) => j === i ? { ...e, dateRaw: iso, date: formatted } : e))
        }
        function removeEvent(i: number) {
          onConfigChange('events', evList.filter((_, j) => j !== i))
        }

        return (
          <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
            <OptionPicker label={t.pb.design} options={eventsThemes}
              value={(slide.config.theme as string) ?? 'dark'}
              onChange={v => onConfigChange('theme', v)} />

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-gray-400 text-xs">{t.pb.evTitle}</span>
                <input type="text" value={(slide.config.title as string) ?? 'Veranstaltungen'}
                  onChange={e => onConfigChange('title', e.target.value)}
                  className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-400 text-xs">{t.pb.evLang}</span>
                <select value={evLang}
                  onChange={e => {
                    const newLang = e.target.value
                    onConfigChange('lang', newLang)
                    const reformatted = evList.map(ev =>
                      ev.dateRaw ? { ...ev, date: formatEventDate(ev.dateRaw, newLang) } : ev
                    )
                    onConfigChange('events', reformatted)
                  }}
                  className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.pb.evList}</p>
              {evList.map((ev, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">#{i + 1}</span>
                    <button onClick={() => removeEvent(i)} className="text-gray-600 hover:text-red-400 text-xs transition">{t.pb.evRemove}</button>
                  </div>

                  <input type="text" value={ev.title} onChange={e => updateEvent(i, 'title', e.target.value)}
                    placeholder={t.pb.evTitlePh}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs">{t.pb.evDate}</span>
                      <input type="date" value={ev.dateRaw ?? ''}
                        onChange={e => pickDate(i, e.target.value)}
                        className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm [color-scheme:dark]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs">{t.pb.evTime}</span>
                      <input type="time" value={ev.time ?? ''}
                        onChange={e => updateEvent(i, 'time', e.target.value)}
                        className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm [color-scheme:dark]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs">{t.pb.evDisplay}</span>
                    <input type="text" value={ev.date ?? ''} onChange={e => updateEvent(i, 'date', e.target.value)}
                      placeholder="Fr, 30. Mai"
                      className="bg-gray-800 text-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
                  </div>

                  <input type="text" value={ev.description ?? ''} onChange={e => updateEvent(i, 'description', e.target.value)}
                    placeholder="…"
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
                </div>
              ))}
              {evList.length < 4 && (
                <button
                  onClick={() => onConfigChange('events', [...evList, { title: '', date: '', time: '', description: '' }])}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition mt-0.5">
                  <span className="text-base leading-none">+</span> {t.pb.evAdd}
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Donation ── */}
      {slide.type === 'donation' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={donationThemes}
            value={(slide.config.theme as string) ?? 'gold'}
            onChange={v => onConfigChange('theme', v)} />
          <p className="text-gray-500 text-xs">{t.pb.donDesc}</p>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.evTitle}</span>
            <input type="text" value={(slide.config.title as string) ?? 'Spendenaufruf'}
              onChange={e => onConfigChange('title', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.donSubtitle}</span>
            <input type="text" value={(slide.config.subtitle as string) ?? ''}
              onChange={e => onConfigChange('subtitle', e.target.value)}
              placeholder="…"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.donDescription}</span>
            <textarea value={(slide.config.description as string) ?? ''} rows={2}
              onChange={e => onConfigChange('description', e.target.value)}
              placeholder="…"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600 resize-none" />
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{t.pb.donGoal}</span>
              <input type="number" min={0} value={(slide.config.goal as number) ?? 10000}
                onChange={e => onConfigChange('goal', +e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{t.pb.donCurrent}</span>
              <input type="number" min={0} value={(slide.config.current as number) ?? 0}
                onChange={e => onConfigChange('current', +e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{t.pb.donCurrency}</span>
              <input type="text" value={(slide.config.currency as string) ?? '€'}
                onChange={e => onConfigChange('currency', e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.donLink}</span>
            <input type="url" value={(slide.config.url as string) ?? ''}
              onChange={e => onConfigChange('url', e.target.value)}
              placeholder="https://…"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        </div>
      )}

      {/* ── Social Follow ── */}
      {slide.type === 'social_follow' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <OptionPicker label={t.pb.design} options={socialThemes}
            value={(slide.config.theme as string) ?? 'dark'}
            onChange={v => onConfigChange('theme', v)} />

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.evTitle}</span>
            <input type="text" value={(slide.config.title as string) ?? 'Folgt uns!'}
              onChange={e => onConfigChange('title', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.pb.channels}</p>
            {((slide.config.channels as Array<{ platform: string; handle: string; url: string }>) ?? []).map((ch, i) => {
              const channels = (slide.config.channels as Array<{ platform: string; handle: string; url: string }>) ?? []
              function updateChannel(key: string, val: string) {
                const next = channels.map((c, j) => j === i ? { ...c, [key]: val } : c)
                onConfigChange('channels', next)
              }
              function removeChannel() {
                onConfigChange('channels', channels.filter((_, j) => j !== i))
              }
              return (
                <div key={i} className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">{tplNamed(t.pb.channelN, { n: String(i + 1) })}</span>
                    <button onClick={removeChannel} className="text-gray-600 hover:text-red-400 text-xs transition">{t.pb.chRemove}</button>
                  </div>
                  <select value={ch.platform}
                    onChange={e => updateChannel('platform', e.target.value)}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="tiktok">TikTok</option>
                    <option value="website">Website</option>
                  </select>
                  <input type="text" value={ch.handle} onChange={e => updateChannel('handle', e.target.value)}
                    placeholder={t.pb.chHandlePh}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
                  <input type="url" value={ch.url} onChange={e => updateChannel('url', e.target.value)}
                    placeholder="https://…"
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
                </div>
              )
            })}
            {((slide.config.channels as unknown[]) ?? []).length < 4 && (
              <button
                onClick={() => {
                  const channels = (slide.config.channels as Array<{ platform: string; handle: string; url: string }>) ?? []
                  onConfigChange('channels', [...channels, { platform: 'instagram', handle: '', url: '' }])
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition mt-0.5">
                <span className="text-base leading-none">+</span> {t.pb.chAdd}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Ramadan ── */}
      {slide.type === 'ramadan' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-gray-500 text-xs">{t.pb.ramDesc}</p>
          <OptionPicker label={t.pb.design} options={ramadanThemes}
            value={(slide.config.theme as string) ?? 'madinah'}
            onChange={v => onConfigChange('theme', v)} />
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.ramLang}</span>
            <select value={(slide.config.lang as string) ?? 'de'} onChange={e => onConfigChange('lang', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
              {LANGUAGES.filter(l => ['de','en','ar','tr','fr','nl','id','ms','ur'].includes(l.code)).map(l =>
                <option key={l.code} value={l.code}>{l.label}</option>
              )}
            </select>
          </label>
          <p className="text-xs text-amber-500/80 bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-700/30">
            {t.pb.ramNote}
          </p>
        </div>
      )}

      {/* ── Jumu'a ── */}
      {slide.type === 'jumu_a' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-gray-500 text-xs">{t.pb.jumuDesc}</p>
          <OptionPicker label={t.pb.design} options={jumuaThemes}
            value={(slide.config.theme as string) ?? 'dark'}
            onChange={v => onConfigChange('theme', v)} />
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">{t.pb.jumuTime}</span>
            <input type="time" value={(slide.config.time as string) ?? '13:00'}
              onChange={e => onConfigChange('time', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm [color-scheme:dark]" />
          </label>
        </div>
      )}

      {/* ── Instagram Feed ── */}
      {slide.type === 'instagram_feed' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Instagram Handle</span>
            <input type="text" value={(slide.config.handle as string) ?? ''}
              onChange={e => onConfigChange('handle', e.target.value)}
              placeholder={t.pb.igHandlePh}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          {/* Access Token */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{t.pb.igToken}</span>
              <input type="password" value={(slide.config.token as string) ?? ''}
                onChange={e => onConfigChange('token', e.target.value)}
                placeholder="IGQVJ…"
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600 font-mono" />
            </label>
            <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <p className="text-blue-300 text-xs font-medium">{t.pb.igHowTo}</p>
              <ol className="text-gray-400 text-xs flex flex-col gap-1 list-decimal list-inside">
                <li>{t.pb.igStep1}</li>
                <li>{t.pb.igStep2}</li>
                <li>{t.pb.igStep3}</li>
                <li>{t.pb.igStep4}</li>
                <li>{t.pb.igStep5}</li>
              </ol>
              <p className="text-gray-600 text-xs">{t.pb.igAlt}</p>
            </div>
          </div>

          {/* Fallback: manual posts when no token */}
          {!(slide.config.token as string) && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-600 text-xs">{t.pb.igManualOr}</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <p className="text-gray-600 text-xs">{t.pb.igManualHint}</p>
              {((slide.config.posts as Array<{ image_url: string; caption?: string; date?: string; likes?: number }>) ?? []).map((post, i) => {
                const posts = (slide.config.posts as Array<{ image_url: string; caption?: string; date?: string; likes?: number }>) ?? []
                return (
                  <div key={i} className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">{tplNamed(t.pb.igPostN, { n: String(i + 1) })}</span>
                      <button onClick={() => onConfigChange('posts', posts.filter((_, j) => j !== i))}
                        className="text-gray-600 hover:text-red-400 text-xs transition">✕</button>
                    </div>
                    <input type="url" value={post.image_url ?? ''}
                      onChange={e => onConfigChange('posts', posts.map((p, j) => j === i ? { ...p, image_url: e.target.value } : p))}
                      placeholder={t.pb.igImageUrlPh}
                      className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
                    {!!post.image_url && <img src={post.image_url} className="w-full h-16 object-cover rounded opacity-70" alt="" />}
                    <input type="text" value={post.caption ?? ''}
                      onChange={e => onConfigChange('posts', posts.map((p, j) => j === i ? { ...p, caption: e.target.value } : p))}
                      placeholder={t.pb.igCaptionPh}
                      className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
                  </div>
                )
              })}
              {((slide.config.posts as unknown[]) ?? []).length < 4 && (
                <button onClick={() => {
                  const posts = (slide.config.posts as Array<{ image_url: string; caption?: string }>) ?? []
                  onConfigChange('posts', [...posts, { image_url: '', caption: '' }])
                }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition">
                  <span className="text-base leading-none">+</span> {t.pb.igAddPost}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
