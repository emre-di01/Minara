import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../components/Layout'
import type { Playlist, WidgetConfig, WidgetType, ThemeId, Slide, PrayerTheme } from '../../types'
import { LANGUAGES, type LangCode } from '../../lib/i18n'

// ─── Widget mode constants ────────────────────────────────────────────────────

const WIDGET_TYPES: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'prayer_times', label: 'Gebetszeiten', icon: '🕌' },
  { type: 'media',        label: 'Bild / Video', icon: '🖼️' },
  { type: 'ticker',       label: 'Lauftext',     icon: '📰' },
  { type: 'weather',      label: 'Wetter',       icon: '🌤️' },
  { type: 'rss',          label: 'RSS Feed',     icon: '📡' },
]

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'classic',        label: 'Classic' },
  { id: 'modern-minimal', label: 'Modern Minimal' },
  { id: 'dark-elegant',   label: 'Dark Elegant' },
  { id: 'ramadan',        label: 'Ramadan' },
]

// ─── Slide mode constants ─────────────────────────────────────────────────────

const SLIDE_TYPES: { type: Slide['type']; label: string; icon: string }[] = [
  { type: 'prayer_times', label: 'Gebetszeiten',  icon: '🕌' },
  { type: 'media',        label: 'Bild / Video',  icon: '🖼️' },
  { type: 'ticker',       label: 'Lauftext',      icon: '📰' },
  { type: 'rss',          label: 'RSS Feed',      icon: '📡' },
  { type: 'weather',      label: 'Wetter',        icon: '🌤️' },
  { type: 'hadith',       label: 'Hadith',        icon: '📖' },
  { type: 'quran',        label: 'Quran-Vers',    icon: '🌙' },
  { type: 'asmaul_husna', label: 'Asmaul Husna',  icon: '✨' },
]

const PRAYER_THEMES: { id: PrayerTheme; label: string; desc: string; color: string }[] = [
  { id: 'madinah',   label: 'Madinah',   desc: 'Dunkel · Gold',        color: '#d4a843' },
  { id: 'bosphorus', label: 'Bosphorus', desc: 'Foto-Sidebar · Gold',   color: '#f0c040' },
  { id: 'mekka',     label: 'Mekka',     desc: 'Nacht · Lila',         color: '#a855f7' },
  { id: 'night',     label: 'Night',     desc: 'Cinematic · Weiß',     color: '#ffffff' },
]

function newWidget(type: WidgetType): WidgetConfig {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    colSpan: type === 'prayer_times' ? 4 : 8,
    rowSpan: type === 'ticker' ? 1 : 3,
    config: {},
  }
}

function newSlide(type: Slide['type']): Slide {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    duration: type === 'prayer_times' ? 0 : 15,
    config: type === 'prayer_times' ? { prayerTheme: 'madinah' } : {},
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlaylistBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [mode, setMode] = useState<'widgets' | 'slides'>('widgets')
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [theme, setTheme] = useState<ThemeId>('classic')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('playlists').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) { navigate('/admin/playlists'); return }
        const pl = data as Playlist
        setPlaylist(pl)
        setMode(pl.mode ?? 'widgets')
        setWidgets(pl.widgets as WidgetConfig[])
        setSlides((pl.slides ?? []) as Slide[])
        setTheme(pl.theme)
      })
  }, [id, navigate])

  async function save() {
    if (!id) return
    setSaving(true)
    await supabase.from('playlists').update({ widgets, slides, theme, mode }).eq('id', id)
    setSaving(false)
  }

  // Widget actions
  function addWidget(type: WidgetType) { setWidgets(w => [...w, newWidget(type)]) }
  function removeWidget(wId: string) { setWidgets(w => w.filter(x => x.id !== wId)); if (selected === wId) setSelected(null) }
  function updateWidgetConfig(wId: string, key: string, value: string) {
    setWidgets(w => w.map(x => x.id === wId ? { ...x, config: { ...x.config, [key]: value } } : x))
  }
  function updateSpan(wId: string, field: 'colSpan' | 'rowSpan', value: number) {
    setWidgets(w => w.map(x => x.id === wId ? { ...x, [field]: value } : x))
  }

  // Slide actions
  function addSlide(type: Slide['type']) { const s = newSlide(type); setSlides(sl => [...sl, s]); setSelected(s.id) }
  function removeSlide(sId: string) { setSlides(sl => sl.filter(x => x.id !== sId)); if (selected === sId) setSelected(null) }
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

  if (!playlist) return <Layout><div className="p-6 text-gray-500">Lade...</div></Layout>

  const selectedWidget = widgets.find(w => w.id === selected)
  const selectedSlide  = slides.find(s => s.id === selected)

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-white font-bold text-sm mb-3">{playlist.name}</h2>
            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              {(['widgets', 'slides'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setSelected(null) }}
                  className={`flex-1 text-xs py-1.5 transition font-medium ${mode === m ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {m === 'widgets' ? 'Widgets' : 'Slides'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'widgets' ? (
            <>
              {/* Theme */}
              <div className="p-4 border-b border-gray-800">
                <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Theme</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className={`text-xs py-1.5 px-2 rounded-lg transition ${theme === t.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add widget */}
              <div className="p-4 border-b border-gray-800">
                <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Widget hinzufügen</p>
                <div className="flex flex-col gap-1">
                  {WIDGET_TYPES.map(({ type, label, icon }) => (
                    <button key={type} onClick={() => addWidget(type)}
                      className="flex items-center gap-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg px-3 py-2 transition">
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Widget list */}
              <div className="flex-1 p-4 flex flex-col gap-2">
                {widgets.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">Keine Widgets</p>}
                {widgets.map((w, i) => {
                  const meta = WIDGET_TYPES.find(x => x.type === w.type)
                  return (
                    <div key={w.id} onClick={() => setSelected(w.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition ${selected === w.id ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-gray-800 hover:bg-gray-750'}`}>
                      <div className="flex items-center gap-2 text-sm">
                        <span>{meta?.icon}</span>
                        <span className="text-gray-200">{meta?.label}</span>
                        <span className="text-gray-600 text-xs">#{i + 1}</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeWidget(w.id) }}
                        className="text-gray-600 hover:text-red-400 text-xs transition">✕</button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Add slide */}
              <div className="p-4 border-b border-gray-800">
                <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Slide hinzufügen</p>
                <div className="flex flex-col gap-1">
                  {SLIDE_TYPES.map(({ type, label, icon }) => (
                    <button key={type} onClick={() => addSlide(type)}
                      className="flex items-center gap-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg px-3 py-2 transition">
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slide list */}
              <div className="flex-1 p-4 flex flex-col gap-2">
                {slides.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">Keine Slides</p>}
                {slides.map((s, i) => {
                  const meta = SLIDE_TYPES.find(x => x.type === s.type)
                  return (
                    <div key={s.id} onClick={() => setSelected(s.id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition ${selected === s.id ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-gray-800 hover:bg-gray-750'}`}>
                      <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                        <button onClick={e => { e.stopPropagation(); moveSlide(s.id, -1) }}
                          className="hover:text-white transition leading-none">▲</button>
                        <button onClick={e => { e.stopPropagation(); moveSlide(s.id, 1) }}
                          className="hover:text-white transition leading-none">▼</button>
                      </div>
                      <div className="flex-1 flex items-center gap-2 text-sm min-w-0">
                        <span>{meta?.icon}</span>
                        <span className="text-gray-200 truncate">{meta?.label}</span>
                        <span className="text-gray-600 text-xs shrink-0">
                          {s.duration === 0 ? '∞' : `${s.duration}s`}
                        </span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeSlide(s.id) }}
                        className="text-gray-600 hover:text-red-400 text-xs transition shrink-0">✕</button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Save */}
          <div className="p-4 border-t border-gray-800">
            <button onClick={save} disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* ── Right panel (configurator) ── */}
        <div className="flex-1 p-6 overflow-y-auto">
          {mode === 'widgets' && !selectedWidget && (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">Widget auswählen</div>
          )}
          {mode === 'widgets' && selectedWidget && (
            <WidgetConfigurator widget={selectedWidget}
              onConfigChange={(k, v) => updateWidgetConfig(selectedWidget.id, k, v)}
              onSpanChange={(f, v) => updateSpan(selectedWidget.id, f, v)} />
          )}
          {mode === 'slides' && !selectedSlide && (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">Slide auswählen oder hinzufügen</div>
          )}
          {mode === 'slides' && selectedSlide && (
            <SlideConfigurator slide={selectedSlide}
              onConfigChange={(k, v) => updateSlideConfig(selectedSlide.id, k, v)}
              onDurationChange={v => updateSlideDuration(selectedSlide.id, v)} />
          )}
        </div>
      </div>
    </Layout>
  )
}

// ─── Widget configurator (unchanged) ─────────────────────────────────────────

function WidgetConfigurator({ widget, onConfigChange, onSpanChange }: {
  widget: WidgetConfig
  onConfigChange: (key: string, value: string) => void
  onSpanChange: (field: 'colSpan' | 'rowSpan', value: number) => void
}) {
  const meta = WIDGET_TYPES.find(x => x.type === widget.type)
  return (
    <div className="max-w-lg">
      <h2 className="text-white font-bold text-lg mb-6">{meta?.icon} {meta?.label}</h2>
      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Layout</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Breite (1–12)</span>
            <input type="number" min={1} max={12} value={widget.colSpan ?? 4}
              onChange={e => onSpanChange('colSpan', +e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Höhe (1–6)</span>
            <input type="number" min={1} max={6} value={widget.rowSpan ?? 2}
              onChange={e => onSpanChange('rowSpan', +e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </label>
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Inhalt</p>
        {widget.type === 'prayer_times' && <p className="text-gray-500 text-sm">Gebetszeiten werden automatisch geladen.</p>}
        {widget.type === 'media' && (
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">URL</span>
            <input type="url" value={(widget.config.url as string) ?? ''} onChange={e => onConfigChange('url', e.target.value)}
              placeholder="https://..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        )}
        {widget.type === 'ticker' && (
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Text</span>
            <input type="text" value={(widget.config.text as string) ?? ''} onChange={e => onConfigChange('text', e.target.value)}
              placeholder="Nachricht..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        )}
        {widget.type === 'weather' && (
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Stadt</span>
            <input type="text" value={(widget.config.city as string) ?? ''} onChange={e => onConfigChange('city', e.target.value)}
              placeholder="Berlin" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        )}
        {widget.type === 'rss' && (
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">RSS Feed URL</span>
            <input type="url" value={(widget.config.url as string) ?? ''} onChange={e => onConfigChange('url', e.target.value)}
              placeholder="https://..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        )}
      </div>
    </div>
  )
}

// ─── Slide configurator ───────────────────────────────────────────────────────

function SlideConfigurator({ slide, onConfigChange, onDurationChange }: {
  slide: Slide
  onConfigChange: (key: string, value: unknown) => void
  onDurationChange: (v: number) => void
}) {
  const meta = SLIDE_TYPES.find(x => x.type === slide.type)

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <h2 className="text-white font-bold text-lg">{meta?.icon} {meta?.label}</h2>

      {/* Duration */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Anzeigedauer</p>
        <div className="flex items-center gap-3">
          <input type="number" min={0} max={3600} value={slide.duration}
            onChange={e => onDurationChange(+e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm w-24" />
          <span className="text-gray-400 text-sm">Sekunden — 0 = bleibt dauerhaft</span>
        </div>
      </div>

      {/* Prayer times config */}
      {slide.type === 'prayer_times' && (
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Design</p>
          <div className="grid grid-cols-2 gap-2">
            {PRAYER_THEMES.map(t => (
              <button key={t.id} onClick={() => onConfigChange('prayerTheme', t.id)}
                className={`flex flex-col items-start rounded-xl p-3 border transition ${slide.config.prayerTheme === t.id ? 'border-emerald-500 bg-emerald-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                <div className="w-5 h-5 rounded-full mb-2" style={{ background: t.color }} />
                <div className="text-white text-sm font-semibold">{t.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Moscheename</span>
            <input type="text" value={(slide.config.mosqueName as string) ?? ''} onChange={e => onConfigChange('mosqueName', e.target.value)}
              placeholder="z.B. Al-Nour Moschee" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Adresse (optional)</span>
            <input type="text" value={(slide.config.mosqueAddress as string) ?? ''} onChange={e => onConfigChange('mosqueAddress', e.target.value)}
              placeholder="Musterstraße 1, 12345 Berlin" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Hintergrundbild-URL (optional, für Bosphorus)</span>
            <input type="url" value={(slide.config.bgImage as string) ?? ''} onChange={e => onConfigChange('bgImage', e.target.value)}
              placeholder="https://..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Lauftext (optional)</span>
            <input type="text" value={(slide.config.ticker as string) ?? ''} onChange={e => onConfigChange('ticker', e.target.value)}
              placeholder="Willkommen in unserer Moschee..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">Sprache</span>
              <select value={(slide.config.lang as string) ?? 'de'} onChange={e => onConfigChange('lang', e.target.value as LangCode)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">2. Sprache (optional)</span>
              <select value={(slide.config.lang2 as string) ?? ''} onChange={e => onConfigChange('lang2', e.target.value || null)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                <option value="">— keine —</option>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Media config */}
      {slide.type === 'media' && (
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Bild- oder Video-URL</span>
            <input type="url" value={(slide.config.url as string) ?? ''} onChange={e => onConfigChange('url', e.target.value)}
              placeholder="https://..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        </div>
      )}

      {/* Ticker config */}
      {slide.type === 'ticker' && (
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Text</span>
            <textarea value={(slide.config.text as string) ?? ''} onChange={e => onConfigChange('text', e.target.value)}
              rows={3} placeholder="Lauftext..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600 resize-none" />
          </label>
        </div>
      )}

      {/* RSS config */}
      {slide.type === 'rss' && (
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">RSS Feed URL</span>
            <input type="url" value={(slide.config.url as string) ?? ''} onChange={e => onConfigChange('url', e.target.value)}
              placeholder="https://..." className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        </div>
      )}

      {/* Weather config */}
      {slide.type === 'weather' && (
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Stadt</span>
            <input type="text" value={(slide.config.city as string) ?? ''} onChange={e => onConfigChange('city', e.target.value)}
              placeholder="Berlin" className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder:text-gray-600" />
          </label>
        </div>
      )}

      {/* No config needed */}
      {(slide.type === 'hadith' || slide.type === 'quran' || slide.type === 'asmaul_husna') && (
        <div className="bg-gray-900 rounded-xl p-4 text-gray-500 text-sm">
          { slide.type === 'hadith'       && 'Zeigt täglich einen zufälligen Hadith auf Deutsch.' }
          { slide.type === 'quran'        && 'Zeigt einen zufälligen Quran-Vers mit arabischem Text und deutscher Übersetzung.' }
          { slide.type === 'asmaul_husna' && 'Zeigt alle 99 Namen Allahs nacheinander mit arabischem Text und Bedeutung.' }
        </div>
      )}
    </div>
  )
}
