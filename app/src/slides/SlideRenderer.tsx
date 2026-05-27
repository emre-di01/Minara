import { useEffect, useState } from 'react'
import type { MosqueProfile, Slide, PrayerTheme, PrayerSource, PrayerMethod } from '../types'
import { UI, QURAN_EDITION, type LangCode } from '../lib/i18n'
import { getDailyContent, getDailyPrayerTimes } from '../lib/awqatsalah'
import PrayerTimesSlide, { type ClockStyle, type PrayerOffsets } from './PrayerTimesSlide'
import WeatherSlide from './WeatherSlide'
import EventsSlide, { type EventsTheme } from './EventsSlide'
import DonationSlide, { type DonationTheme } from './DonationSlide'
import SocialFollowSlide, { type SocialTheme } from './SocialFollowSlide'
import InstagramFeedSlide from './InstagramFeedSlide'

interface Props {
  slide: Slide
  cityId: number
  /** Profile-level default source — used when slide has no own source configured */
  defaultPrayerSource?: PrayerSource | null
  profile?: MosqueProfile | null
}

function usePortrait() {
  const [p, setP] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false)
  useEffect(() => {
    const h = () => setP(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return p
}

const HEX_SVG_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='69' viewBox='0 0 60 69'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.8' opacity='0.04'%3E%3Cpolygon points='30,1 58,16 58,46 30,61 2,46 2,16'/%3E%3Cpolygon points='30,12 50,23 50,45 30,56 10,45 10,23'/%3E%3C/g%3E%3C/svg%3E")`

export default function SlideRenderer({ slide, cityId, defaultPrayerSource, profile }: Props) {
  const isPortrait = usePortrait()
  const c = slide.config

  switch (slide.type) {
    case 'prayer_times': {
      // 1. Slide-level source (most specific)
      let prayerSource: PrayerSource | null = null
      if (c.source === 'calculated' && typeof c.lat === 'number' && typeof c.lng === 'number') {
        prayerSource = { source: 'calculated', lat: c.lat as number, lng: c.lng as number, method: (c.method as PrayerMethod) ?? 'MWL', locationName: (c.locationName as string) ?? '' }
      } else if (c.source === 'diyanet' && typeof c.cityId === 'number') {
        prayerSource = { source: 'diyanet', cityId: c.cityId as number, cityName: (c.cityName as string) ?? '' }
      }
      // 2. Fall back to profile-level default (mosque settings)
      const effectiveSource = prayerSource ?? defaultPrayerSource ?? null
      return (
        <PrayerTimesSlide
          prayerSource={effectiveSource}
          cityId={cityId}
          prayerTheme={(c.prayerTheme as PrayerTheme) ?? 'madinah'}
          mosqueName={(c.mosqueName as string) || profile?.name || ''}
          mosqueAddress={(c.mosqueAddress as string) || profile?.address || ''}
          bgImage={(c.bgImage as string) ?? ''}
          logoUrl={(c.logoUrl as string) || profile?.logo_url || ''}
          ticker={(c.ticker as string) ?? ''}
          lang={(c.lang as LangCode) ?? 'de'}
          lang2={(c.lang2 as LangCode) || undefined}
          clockStyle={(c.clockStyle as ClockStyle) ?? 'digital'}
          offsets={(c.offsets as PrayerOffsets) ?? {}}
        />
      )
    }

    case 'media': {
      const url    = (c.url    as string) ?? ''
      const caption = (c.caption as string) ?? ''
      const layout = (c.layout as string) ?? 'fullscreen'
      if (!url) return <Placeholder label="Kein Bild / Video" />
      const youtubeId = extractYouTubeId(url)
      const isVideo = !youtubeId && /\.(mp4|webm|ogg)$/i.test(url)
      const ytSrc = youtubeId
        ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1`
        : null
      const Media = ({ cls, style }: { cls: string; style?: React.CSSProperties }) =>
        isVideo
          ? <video src={url} className={cls} style={style} autoPlay loop muted playsInline />
          : <img src={url} className={cls} style={style} alt={caption} />

      if (layout === 'centered') {
        return (
          <div className="h-screen w-screen relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0">
              {youtubeId
                ? <div className="h-full w-full bg-black" />
                : <Media cls="h-full w-full object-cover scale-110" />}
              <div className="absolute inset-0" style={{ backdropFilter: 'blur(24px)', background: 'rgba(0,0,0,0.55)' }} />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-6 px-8" style={{ maxWidth: '88vw' }}>
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: '68vh', maxWidth: '84vw' }}>
                {ytSrc
                  ? <iframe src={ytSrc} className="h-full w-full" style={{ border: 'none', maxHeight: '68vh', maxWidth: '84vw', display: 'block' }} allow="autoplay; fullscreen" title="video" />
                  : <Media cls="object-contain" style={{ maxHeight: '68vh', maxWidth: '84vw', display: 'block' } as React.CSSProperties} />}
              </div>
              {caption && (
                <p className="text-white/90 text-center font-light" style={{ fontSize: 'clamp(1.4rem,3vw,2.2rem)' }}>
                  {caption}
                </p>
              )}
            </div>
          </div>
        )
      }

      if (layout === 'split') {
        return (
          <div
            className="h-screen w-screen flex"
            style={{ background: '#0d0d0d', flexDirection: isPortrait ? 'column' : 'row' }}
          >
            <div
              className="flex flex-col justify-center"
              style={{
                ...(isPortrait
                  ? { width: '100%', height: '32%', padding: '0 8vw' }
                  : { width: '44%', padding: '0 5vw' }),
                background: 'linear-gradient(135deg,#111 0%,#161616 100%)',
              }}
            >
              {caption ? (
                <p className="text-white font-light leading-tight" style={{ fontSize: 'clamp(2rem,4.5vw,4rem)' }}>
                  {caption}
                </p>
              ) : (
                <div className="w-12 h-0.5 bg-white/20" />
              )}
            </div>
            <div className="flex-1 relative overflow-hidden">
              {ytSrc
                ? <iframe src={ytSrc} className="h-full w-full" style={{ border: 'none' }} allow="autoplay; fullscreen" title="video" />
                : <Media cls="absolute inset-0 h-full w-full object-cover" />}
            </div>
          </div>
        )
      }

      return (
        <div className="h-screen w-screen bg-gray-950 relative overflow-hidden">
          {ytSrc
            ? <iframe src={ytSrc} className="h-full w-full" style={{ border: 'none' }} allow="autoplay; fullscreen" title="video" />
            : <Media cls="h-full w-full object-cover" />}
          {caption && (
            <div className="absolute bottom-0 left-0 right-0 px-14 py-10"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
              <p className="text-white font-light leading-snug" style={{ fontSize: 'clamp(1.8rem,4vw,3.2rem)' }}>
                {caption}
              </p>
            </div>
          )}
        </div>
      )
    }

    case 'ticker': {
      const text   = (c.text   as string) ?? ''
      const style  = (c.style  as string) ?? 'dark'
      const layout = (c.layout as string) ?? 'scroll'
      const speed  = Math.max(10, Math.min(60, Number(c.speed) || 25))

      const PALETTES: Record<string, { bg: string; text: string; accent: string; sub: string }> = {
        dark:  { bg: '#0a0a0a',  text: '#ffffff',  accent: '#555',    sub: 'rgba(255,255,255,0.35)' },
        gold:  { bg: '#110c00',  text: '#f5d87a',  accent: '#7a5800', sub: 'rgba(245,216,122,0.4)'  },
        green: { bg: '#050f08',  text: '#6ee7b7',  accent: '#0d3320', sub: 'rgba(110,231,183,0.4)'  },
        light: { bg: '#f0f2f4',  text: '#0f1623',  accent: '#cbd5e1', sub: '#64748b'                },
      }
      const p = PALETTES[style] ?? PALETTES.dark

      if (layout === 'billboard') {
        return (
          <div className="h-screen w-screen flex flex-col items-center justify-center px-10 relative overflow-hidden"
            style={{ background: p.bg }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.3) 100%)' }} />
            <div className="absolute inset-0" style={{ backgroundImage: HEX_SVG_BG, backgroundSize: '60px 69px' }} />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div style={{ color: p.text, fontSize: '5rem', lineHeight: 1, opacity: 0.12, fontFamily: '"Amiri","Traditional Arabic",serif', userSelect: 'none' }}>
                ﷽
              </div>
              <p className="text-center font-bold leading-tight"
                style={{ color: p.text, fontSize: 'clamp(3.5rem,8vw,8rem)', maxWidth: '92vw', lineHeight: 1.1 }}>
                {text || '—'}
              </p>
              <div style={{ width: 120, height: 2, background: `linear-gradient(90deg, transparent, ${style === 'gold' ? '#d4a843' : p.accent}, transparent)`, opacity: 0.8, marginTop: 4 }} />
            </div>
          </div>
        )
      }

      const sep = <span style={{ color: p.accent, margin: '0 3rem' }}>◆</span>
      return (
        <div className="h-screen w-screen flex flex-col overflow-hidden select-none relative" style={{ background: p.bg }}>
          <div className="absolute inset-0" style={{ backgroundImage: HEX_SVG_BG, backgroundSize: '60px 69px' }} />
          <div className="flex-1" />
          <div className="relative z-10" style={{ borderTop: `1px solid ${p.accent}`, paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>
            <div className="shrink-0 whitespace-nowrap font-light"
              style={{ fontSize: 'clamp(3rem,6vmin,5rem)', color: p.text, animation: `ticker-scroll ${speed}s linear infinite` }}>
              {text}{sep}{text}{sep}{text}{sep}
            </div>
          </div>
          <style>{`@keyframes ticker-scroll { from { transform:translateX(100vw) } to { transform:translateX(-100%) } }`}</style>
        </div>
      )
    }

    case 'rss': {
      const url    = (c.url    as string) ?? ''
      const layout = (c.layout as string) ?? 'editorial'
      const lang   = (c.lang   as LangCode) ?? 'de'
      return <RssSlide url={url} layout={layout} lang={lang} />
    }

    case 'weather':
      return <WeatherSlide city={(c.city as string) || profile?.city_name || ''} layout={(c.layout as string) ?? 'cinematic'} />

    case 'hadith':
      return <HadithSlide theme={(c.theme as string) ?? 'forest'} />

    case 'quran':
      return <QuranSlide lang={(c.lang as LangCode) ?? 'de'} theme={(c.theme as string) ?? 'violet'} />

    case 'asmaul_husna':
      return <AsmaulHusnaSlide theme={(c.theme as string) ?? 'amber'} lang={(c.lang as string) ?? 'de'} />

    case 'events':
      return (
        <EventsSlide
          title={(c.title as string) ?? 'Veranstaltungen'}
          theme={(c.theme as EventsTheme) ?? 'dark'}
          lang={(c.lang as string) ?? 'de'}
          events={(c.events as Array<{ title: string; date: string; dateRaw?: string; time?: string; description?: string }>) ?? []}
        />
      )

    case 'donation':
      return (
        <DonationSlide
          title={(c.title as string) ?? 'Spendenaufruf'}
          subtitle={(c.subtitle as string) || undefined}
          description={(c.description as string) || undefined}
          goal={Number(c.goal) || 10000}
          current={Number(c.current) || 0}
          currency={(c.currency as string) ?? '€'}
          url={(c.url as string) || undefined}
          theme={(c.theme as DonationTheme) ?? 'gold'}
        />
      )

    case 'social_follow':
      return (
        <SocialFollowSlide
          title={(c.title as string) ?? 'Folgt uns!'}
          channels={(c.channels as Array<{ platform: 'instagram' | 'youtube' | 'facebook' | 'whatsapp' | 'website' | 'tiktok'; handle: string; url: string }>) ?? []}
          theme={(c.theme as SocialTheme) ?? 'dark'}
        />
      )

    case 'instagram_feed':
      return (
        <InstagramFeedSlide
          handle={(c.handle as string) ?? ''}
          token={(c.token as string) ?? ''}
          posts={(c.posts as Array<{ image_url: string; caption?: string; date?: string; likes?: number }>) ?? []}
        />
      )

    case 'ramadan':
      return <RamadanSlide cityId={cityId} theme={(c.theme as string) ?? 'madinah'} lang={(c.lang as string) ?? 'de'} />

    case 'jumu_a':
      return <JumuaSlide time={(c.time as string) ?? '13:00'} theme={(c.theme as string) ?? 'dark'} lang={(c.lang as string) ?? 'de'} />

    default:
      return <Placeholder label="Unbekannter Slide-Typ" />
  }
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="h-screen w-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">
      {label}
    </div>
  )
}

// ─── RSS ──────────────────────────────────────────────────────────────────────

interface RssItem { title: string; description: string; thumbnail?: string; enclosure?: { url?: string; type?: string } }

function extractImage(item: RssItem): string | null {
  if (item.thumbnail) return item.thumbnail
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url
  const m = item.description?.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : null
}

function RssSlide({ url, layout, lang = 'de' }: { url: string; layout: string; lang?: string }) {
  const [items, setItems] = useState<RssItem[]>([])
  const [idx,   setIdx]   = useState(0)
  const ui = UI[lang as LangCode] ?? UI.de

  useEffect(() => {
    if (!url) return
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'ok') setItems(d.items) })
      .catch(() => {})
  }, [url])

  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 9000)
    return () => clearInterval(id)
  }, [items.length])

  if (!items.length) return <Placeholder label="RSS wird geladen…" />

  const item  = items[idx]
  const image = extractImage(item)
  const plain = item.description?.replace(/<[^>]+>/g, '').trim() ?? ''
  const dots  = items.length > 1 && (
    <div className="flex gap-2">
      {items.map((_, i) => (
        <div key={i} className="rounded-full transition-all"
          style={{ width: i === idx ? 22 : 7, height: 7, background: i === idx ? 'white' : 'rgba(255,255,255,0.2)' }} />
      ))}
    </div>
  )

  if (layout === 'card') {
    return (
      <div className="h-screen w-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg,#0a0a14 0%,#111129 100%)' }}>
        <div className="rounded-3xl flex flex-col gap-6 px-14 py-12"
          style={{
            maxWidth: 820,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(148,130,255,0.25)',
            boxShadow: '0 0 0 1px rgba(148,130,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
            <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em' }}>{ui.news}</div>
          </div>
          <h2 className="text-white font-bold leading-snug"
            style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', letterSpacing: '-0.02em' }}>
            {item.title}
          </h2>
          {plain && (
            <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(2rem,2.2vmin,2.2rem)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {plain}
            </p>
          )}
          {dots}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen text-white overflow-hidden relative" style={{ background: '#111' }}>
      {image && (
        <div className="absolute inset-0">
          <img src={image} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.93) 42%, rgba(0,0,0,0.35) 100%)' }} />
        </div>
      )}
      <div className="relative z-10 h-full flex items-center">
        <div className="flex flex-col gap-5 px-14 md:px-20" style={{ maxWidth: 680 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Neuigkeiten</div>
          </div>
          <h2 className="font-bold leading-snug" style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', letterSpacing: '-0.02em' }}>{item.title}</h2>
          {plain && (
            <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(2rem,2.2vmin,2.2rem)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {plain}
            </p>
          )}
          {dots}
        </div>
        {image && (
          <div className="ml-auto mr-16 shrink-0 hidden xl:block">
            <img src={image} className="rounded-2xl object-cover shadow-2xl"
              style={{ width: 360, height: 240 }} alt="" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Hadith ───────────────────────────────────────────────────────────────────

interface HadithData { text: string; source: string }

const HADITH_PALETTES: Record<string, { bg: string; text: string; accent: string; muted: string; icon: string }> = {
  forest:   { bg: 'linear-gradient(160deg,#060e08 0%,#0a1a0e 100%)', text: '#f0ede8', accent: '#6ee7b7', muted: 'rgba(240,237,232,0.45)', icon: '#6ee7b7' },
  midnight: { bg: 'linear-gradient(160deg,#050505 0%,#0a0800 100%)', text: '#e8e0d0', accent: '#d4a843', muted: 'rgba(232,224,208,0.45)', icon: '#d4a843' },
  warm:     { bg: 'linear-gradient(160deg,#fdf8f0 0%,#f5ede0 100%)', text: '#1a1714', accent: '#8b5e3c', muted: '#8b7355',               icon: '#8b5e3c' },
}

function stripQuotes(s: string) {
  return s.replace(/^["„»]+|["«]+$/g, '').trim()
}

function HadithSlide({ theme }: { theme: string }) {
  const [hadith, setHadith] = useState<HadithData | null>(null)
  const p = HADITH_PALETTES[theme] ?? HADITH_PALETTES.forest
  const isWarm = theme === 'warm'

  useEffect(() => {
    getDailyContent()
      .then(d => setHadith({ text: stripQuotes(d.hadith), source: d.hadithSource }))
      .catch(() => {})
  }, [])

  const containerStyle = isWarm ? {
    background: [
      p.bg,
      'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(139,94,60,0.03) 28px, rgba(139,94,60,0.03) 29px)',
      'repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(139,94,60,0.02) 28px, rgba(139,94,60,0.02) 29px)',
    ].join(', '),
  } : { background: p.bg }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-12 gap-8" style={containerStyle}>
      <div style={{ color: p.accent, fontSize: '3rem', lineHeight: 1, opacity: 0.35, fontFamily: '"Amiri","Traditional Arabic",serif', direction: 'rtl' }}>
        بِسْمِ اللَّهِ
      </div>
      <div className="text-xs uppercase tracking-widest" style={{ color: p.muted }}>Hadith</div>
      {hadith ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 860 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${p.accent})`, opacity: 0.35 }} />
            <span style={{ color: p.accent, fontSize: '1.1rem', opacity: 0.7 }}>❋</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.accent}, transparent)`, opacity: 0.35 }} />
          </div>
          <p className="text-center leading-relaxed font-light italic"
            style={{ color: p.text, fontSize: 'clamp(2.2rem,2.8vmin,2.8rem)', maxWidth: 820, paddingLeft: '2rem', paddingRight: '2rem' }}>
            {`„${hadith.text}"`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 860 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${p.accent})`, opacity: 0.35 }} />
            <span style={{ color: p.accent, fontSize: '1.1rem', opacity: 0.7 }}>❋</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.accent}, transparent)`, opacity: 0.35 }} />
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)' }}>
            <span style={{ color: p.accent, fontSize: '0.5rem' }}>●</span>
            <span style={{ color: p.muted }}>{hadith.source}</span>
          </div>
        </>
      ) : (
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${p.accent}33`, borderTopColor: p.accent }} />
      )}
    </div>
  )
}

// ─── Quran ────────────────────────────────────────────────────────────────────

interface AyahData { arabic: string; translation: string; surah: string; ayah: number }

const QURAN_PALETTES: Record<string, { bg: string; arabic: string; translation: string; accent: string; muted: string }> = {
  violet:  { bg: 'radial-gradient(ellipse at 50% 30%,#1a0a2e 0%,#070010 100%)', arabic: '#ffffff',  translation: 'rgba(255,255,255,0.6)', accent: '#a855f7', muted: 'rgba(168,85,247,0.5)' },
  madinah: { bg: 'radial-gradient(ellipse at 50% 30%,#1a1200 0%,#0a0800 100%)', arabic: '#f5d87a',  translation: '#d4c8a0',               accent: '#d4a843', muted: 'rgba(212,168,67,0.4)'  },
  emerald: { bg: 'radial-gradient(ellipse at 50% 30%,#031208 0%,#010905 100%)', arabic: '#ffffff',  translation: '#a7f3d0',               accent: '#34d399', muted: 'rgba(52,211,153,0.4)'  },
}

function QuranSlide({ lang, theme }: { lang: LangCode; theme: string }) {
  const [ayah, setAyah] = useState<AyahData | null>(null)
  const p = QURAN_PALETTES[theme] ?? QURAN_PALETTES.violet
  const ui = UI[lang] ?? UI.de

  useEffect(() => {
    const edition = QURAN_EDITION[lang] ?? QURAN_EDITION['en']!
    const randomRef = Math.floor(Math.random() * 6236) + 1
    fetch(`https://api.alquran.cloud/v1/ayah/${randomRef}/editions/quran-simple,${edition}`)
      .then(r => r.json())
      .then(d => {
        if (d.code !== 200) return
        const [arabic, translated] = d.data
        setAyah({ arabic: arabic.text, translation: translated.text, surah: arabic.surah.englishName, ayah: arabic.numberInSurah })
      })
      .catch(() => {})
  }, [lang])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-12 gap-7" style={{ background: p.bg }}>
      <div style={{ color: p.arabic, fontSize: '1.5rem', lineHeight: 1, opacity: 0.2, fontFamily: '"Amiri","Traditional Arabic",serif', direction: 'rtl' }}>
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </div>
      <div className="text-xs uppercase tracking-widest" style={{ color: p.muted }}>Quran</div>
      {ayah ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: p.accent, opacity: 0.7 }}>
            <span style={{ fontSize: '1rem' }}>✦</span>
            <div style={{ width: 80, height: 1, background: p.accent, opacity: 0.5 }} />
            <span style={{ fontSize: '1rem' }}>✦</span>
          </div>
          <p className="text-center font-light"
            style={{ color: p.arabic, fontSize: 'clamp(3rem,6vw,5.5rem)', fontFamily: '"Amiri","Traditional Arabic",serif', direction: 'rtl', maxWidth: 900, lineHeight: 1.6 }}>
            {ayah.arabic}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: p.accent, opacity: 0.7 }}>
            <span style={{ fontSize: '1rem' }}>✦</span>
            <div style={{ width: 80, height: 1, background: p.accent, opacity: 0.5 }} />
            <span style={{ fontSize: '1rem' }}>✦</span>
          </div>
          <div style={{ maxWidth: 780, borderTop: `2px solid ${p.accent}`, background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
            <p className="text-center leading-relaxed font-light italic" style={{ color: p.translation, fontSize: 'clamp(2rem,2.5vmin,2.5rem)' }}>
              {`„${ayah.translation}"`}
            </p>
          </div>
          <div className="flex items-center gap-2" style={{ color: p.muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)' }}>
            <span style={{ fontSize: '1rem' }}>☽</span>
            <span>{ui.surah} {ayah.surah} · {ui.verse} {ayah.ayah}</span>
          </div>
        </>
      ) : (
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${p.accent}33`, borderTopColor: p.accent }} />
      )}
    </div>
  )
}

// ─── Asmaul Husna ─────────────────────────────────────────────────────────────

const ASMAUL_HUSNA = [
  ['الرَّحْمَنُ','Ar-Rahman','Der Allerbarmer'],['الرَّحِيمُ','Ar-Rahim','Der Barmherzige'],
  ['الْمَلِكُ','Al-Malik','Der König'],['الْقُدُّوسُ','Al-Quddus','Der Heilige'],
  ['السَّلَامُ','As-Salam','Der Friede'],['الْمُؤْمِنُ','Al-Mumin','Der Gläubige'],
  ['الْمُهَيْمِنُ','Al-Muhaymin','Der Wächter'],['الْعَزِيزُ','Al-Aziz','Der Mächtige'],
  ['الْجَبَّارُ','Al-Jabbar','Der Gewaltige'],['الْمُتَكَبِّرُ','Al-Mutakabbir','Der Erhabene'],
  ['الْخَالِقُ','Al-Khaliq','Der Schöpfer'],['الْبَارِئُ','Al-Bari','Der Gestalter'],
  ['الْمُصَوِّرُ','Al-Musawwir','Der Bildner'],['الْغَفَّارُ','Al-Ghaffar','Der Allverzeihende'],
  ['الْقَهَّارُ','Al-Qahhar','Der Bezwinger'],['الْوَهَّابُ','Al-Wahhab','Der Schenkende'],
  ['الرَّزَّاقُ','Ar-Razzaq','Der Versorger'],['الْفَتَّاحُ','Al-Fattah','Der Öffner'],
  ['الْعَلِيمُ','Al-Alim','Der Allwissende'],['الْقَابِضُ','Al-Qabid','Der Zurückhaltende'],
  ['الْبَاسِطُ','Al-Basit','Der Ausbreitende'],['الْخَافِضُ','Al-Khafid','Der Erniedrigende'],
  ['الرَّافِعُ','Ar-Rafi','Der Erhöhende'],['الْمُعِزُّ','Al-Muizz','Der Ehrende'],
  ['الْمُذِلُّ','Al-Mudhill','Der Demütigende'],['السَّمِيعُ','As-Sami','Der Allhörende'],
  ['الْبَصِيرُ','Al-Basir','Der Allsehende'],['الْحَكَمُ','Al-Hakam','Der Richter'],
  ['الْعَدْلُ','Al-Adl','Der Gerechte'],['اللَّطِيفُ','Al-Latif','Der Feinfühlige'],
  ['الْخَبِيرُ','Al-Khabir','Der Allkundige'],['الْحَلِيمُ','Al-Halim','Der Nachsichtige'],
  ['الْعَظِيمُ','Al-Azim','Der Großartige'],['الْغَفُورُ','Al-Ghafur','Der Allverzeihende'],
  ['الشَّكُورُ','Ash-Shakur','Der Dankbare'],['الْعَلِيُّ','Al-Ali','Der Hohe'],
  ['الْكَبِيرُ','Al-Kabir','Der Große'],['الْحَفِيظُ','Al-Hafiz','Der Bewahrende'],
  ['الْمُقِيتُ','Al-Muqit','Der Ernährer'],['الْحَسِيبُ','Al-Hasib','Der Abrechnende'],
  ['الْجَلِيلُ','Al-Jalil','Der Majestätische'],['الْكَرِيمُ','Al-Karim','Der Großzügige'],
  ['الرَّقِيبُ','Ar-Raqib','Der Wachsame'],['الْمُجِيبُ','Al-Mujib','Der Erhörende'],
  ['الْوَاسِعُ','Al-Wasi','Der Weitreichende'],['الْحَكِيمُ','Al-Hakim','Der Allweise'],
  ['الْوَدُودُ','Al-Wadud','Der Liebevolle'],['الْمَجِيدُ','Al-Majid','Der Ruhmreiche'],
  ['الْبَاعِثُ','Al-Baith','Der Auferweckende'],['الشَّهِيدُ','Ash-Shahid','Der Zeuge'],
  ['الْحَقُّ','Al-Haqq','Die Wahrheit'],['الْوَكِيلُ','Al-Wakil','Der Treuhänder'],
  ['الْقَوِيُّ','Al-Qawi','Der Starke'],['الْمَتِينُ','Al-Matin','Der Standfeste'],
  ['الْوَلِيُّ','Al-Wali','Der Beschützer'],['الْحَمِيدُ','Al-Hamid','Der Gelobte'],
  ['الْمُحْصِي','Al-Muhsi','Der Zähler'],['الْمُبْدِئُ','Al-Mubdi','Der Ursprung'],
  ['الْمُعِيدُ','Al-Muid','Der Wiederbringer'],['الْمُحْيِي','Al-Muhyi','Der Lebenspendende'],
  ['الْمُمِيتُ','Al-Mumit','Der Todesbringende'],['الْحَيُّ','Al-Hayy','Der Lebendige'],
  ['الْقَيُّومُ','Al-Qayyum','Der Beständige'],['الْوَاجِدُ','Al-Wajid','Der Findende'],
  ['الْمَاجِدُ','Al-Majid','Der Edle'],['الْوَاحِدُ','Al-Wahid','Der Einzige'],
  ['الْأَحَدُ','Al-Ahad','Der Eine'],['الصَّمَدُ','As-Samad','Der Ewige'],
  ['الْقَادِرُ','Al-Qadir','Der Fähige'],['الْمُقْتَدِرُ','Al-Muqtadir','Der Allmächtige'],
  ['الْمُقَدِّمُ','Al-Muqaddim','Der Vorrückende'],['الْمُؤَخِّرُ','Al-Muakhkhir','Der Zurückstellende'],
  ['الْأَوَّلُ','Al-Awwal','Der Erste'],['الْآخِرُ','Al-Akhir','Der Letzte'],
  ['الظَّاهِرُ','Az-Zahir','Der Offenbare'],['الْبَاطِنُ','Al-Batin','Der Verborgene'],
  ['الْوَالِي','Al-Wali','Der Regierende'],['الْمُتَعَالِي','Al-Mutaali','Der Allerhöchste'],
  ['الْبَرُّ','Al-Barr','Der Gütige'],['التَّوَّابُ','At-Tawwab','Der Vergebende'],
  ['الْمُنْتَقِمُ','Al-Muntaqim','Der Rächende'],['الْعَفُوُّ','Al-Afuww','Der Verzeihende'],
  ['الرَّؤُوفُ','Ar-Rauf','Der Mitfühlende'],['مَالِكُ الْمُلْكِ','Malik-ul-Mulk','Herr des Reiches'],
  ['ذُو الْجَلَالِ','Dhul-Jalali','Herr der Majestät'],['الْمُقْسِطُ','Al-Muqsit','Der Gerechte'],
  ['الْجَامِعُ','Al-Jami','Der Vereinende'],['الْغَنِيُّ','Al-Ghani','Der Reiche'],
  ['الْمُغْنِي','Al-Mughni','Der Bereichernde'],['الْمَانِعُ','Al-Mani','Der Verhindernde'],
  ['الضَّارُّ','Ad-Darr','Der Schadensbringende'],['النَّافِعُ','An-Nafi','Der Nutzenbringende'],
  ['النُّورُ','An-Nur','Das Licht'],['الْهَادِي','Al-Hadi','Der Führende'],
  ['الْبَدِيعُ','Al-Badi','Der Schöpfer'],['الْبَاقِي','Al-Baqi','Der Bleibende'],
  ['الْوَارِثُ','Al-Warith','Der Erbe'],['الرَّشِيدُ','Ar-Rashid','Der Rechtgeleitete'],
  ['الصَّبُورُ','As-Sabur','Der Geduldige'],
]

const ASMAUL_PALETTES: Record<string, { bg: string; translit: string; dots: string }> = {
  amber:  { bg: 'radial-gradient(ellipse at 50% 40%,#1c1400 0%,#080600 100%)', translit: '#d4a843', dots: '#d4a843' },
  teal:   { bg: 'radial-gradient(ellipse at 50% 40%,#041414 0%,#000e0b 100%)', translit: '#2dd4bf', dots: '#2dd4bf' },
  indigo: { bg: 'radial-gradient(ellipse at 50% 40%,#060824 0%,#030410 100%)', translit: '#818cf8', dots: '#818cf8' },
}

const ASMAUL_MEANINGS: Record<string, string[]> = {
  de: ['Der Allerbarmer','Der Barmherzige','Der König','Der Heilige','Der Friede','Der Gläubige','Der Wächter','Der Mächtige','Der Gewaltige','Der Erhabene','Der Schöpfer','Der Gestalter','Der Bildner','Der Allverzeihende','Der Bezwinger','Der Schenkende','Der Versorger','Der Öffner','Der Allwissende','Der Zurückhaltende','Der Ausbreitende','Der Erniedrigende','Der Erhöhende','Der Ehrende','Der Demütigende','Der Allhörende','Der Allsehende','Der Richter','Der Gerechte','Der Feinfühlige','Der Allkundige','Der Nachsichtige','Der Großartige','Der Allverzeihende','Der Dankbare','Der Hohe','Der Große','Der Bewahrende','Der Ernährer','Der Abrechnende','Der Majestätische','Der Großzügige','Der Wachsame','Der Erhörende','Der Weitreichende','Der Allweise','Der Liebevolle','Der Ruhmreiche','Der Auferweckende','Der Zeuge','Die Wahrheit','Der Treuhänder','Der Starke','Der Standfeste','Der Beschützer','Der Gelobte','Der Zähler','Der Ursprung','Der Wiederbringer','Der Lebenspendende','Der Todesbringende','Der Lebendige','Der Beständige','Der Findende','Der Edle','Der Einzige','Der Eine','Der Ewige','Der Fähige','Der Allmächtige','Der Vorrückende','Der Zurückstellende','Der Erste','Der Letzte','Der Offenbare','Der Verborgene','Der Regierende','Der Allerhöchste','Der Gütige','Der Vergebende','Der Rächende','Der Verzeihende','Der Mitfühlende','Herr des Reiches','Herr der Majestät','Der Gerechte','Der Vereinende','Der Reiche','Der Bereichernde','Der Verhindernde','Der Schadensbringende','Der Nutzenbringende','Das Licht','Der Führende','Der Schöpfer','Der Bleibende','Der Erbe','Der Rechtgeleitete','Der Geduldige'],
  en: ['The Most Gracious','The Most Merciful','The King','The Most Holy','The Source of Peace','The Granter of Security','The Guardian','The Almighty','The Compeller','The Supreme','The Creator','The Originator','The Fashioner','The Great Forgiver','The Subduer','The Bestower','The Provider','The Opener','The All-Knowing','The Restrainer','The Extender','The Abaser','The Exalter','The Bestower of Honour','The Humiliator','The All-Hearing','The All-Seeing','The Judge','The Just','The Subtle One','The All-Aware','The Forbearing','The Magnificent','The Forgiving','The Grateful','The Most High','The Most Great','The Preserver','The Sustainer','The Reckoner','The Majestic','The Generous','The Watchful','The Responsive','The All-Encompassing','The Wise','The Loving','The Glorious','The Resurrector','The Witness','The Truth','The Trustee','The Strong','The Firm','The Protecting Friend','The Praiseworthy','The Counter','The Originator','The Restorer','The Giver of Life','The Taker of Life','The Living','The Self-Subsisting','The Finder','The Noble','The Unique','The One','The Eternal','The Capable','The Powerful','The Expediter','The Delayer','The First','The Last','The Manifest','The Hidden','The Governor','The Most Exalted','The Source of Goodness','The Acceptor of Repentance','The Avenger','The Pardoner','The Compassionate','Owner of All Sovereignty','Lord of Majesty','The Equitable','The Gatherer','The Self-Sufficient','The Enricher','The Preventer','The Distresser','The Benefactor','The Light','The Guide','The Incomparable','The Everlasting','The Inheritor','The Righteous','The Patient'],
  tr: ['En Büyük Bağışlayıcı','Çok Merhametli','Padişah','Kutsal Olan','Esenliğin Kaynağı','Güvence Veren','Koruyup Gözeten','Güçlü ve Üstün','İstediğini Yaptıran','Büyüklükte Eşsiz','Yaratan','Yoktan Var Eden','Şekil Veren','Çok Bağışlayan','Her Şeye Hakim','Karşılıksız Bağışlayan','Rızık Veren','Her Şeyi Açan','Her Şeyi Bilen','Daraltan','Genişleten','Alçaltan','Yükselten','Onur Veren','Zelil Eden','Her Şeyi İşiten','Her Şeyi Gören','Hükmeden','Mutlak Adil Olan','Lütuf Sahibi','Her Şeyden Haberdar','Yumuşak Davranan','Azamet Sahibi','Sürekli Bağışlayan','Şükrü Kabul Eden','En Yüce Olan','En Büyük Olan','Koruyup Saklayan','Her Şeye Gücü Yeten','Hesap Gören','Celal Sahibi','Cömert Olan','Her Şeyi Gözeten','Duaları Kabul Eden','Her Yere Ulaşan','Hikmet Sahibi','Çok Seven','Şan ve Şeref Sahibi','Ölüleri Dirilten','Her Şeye Şahit','Mutlak Gerçek','İşleri Yürüten','Çok Güçlü','Çok Sağlam','Dost ve Koruyucu','Övgüye Layık','Her Şeyi Sayan','İlk Örneği Yaratan','Tekrar Yaratan','Hayat Veren','Can Alan','Diri Olan','Her Şeyi Ayakta Tutan','Her Şeyi Bulan','Şeref Sahibi','Tek ve Eşsiz','Bir ve Tek','Her Şeyden Müstağni','Her Şeye Gücü Yeten','Her Şeyi Yapan','Öne Geçiren','Geride Bırakan','İlk Olan','Son Olan','Açık Olan','Gizli Olan','Her Şeyi Yöneten','Pek Yüce Olan','İyiliği Bol Olan','Tövbeleri Kabul Eden','İntikam Alan','Affeden','Şefkat Gösteren','Mülkün Gerçek Sahibi','Celal ve İkram Sahibi','Herkese Hakkını Veren','Her Şeyi Toplayan','Hiçbir Şeye Muhtaç Olmayan','Zenginlik Veren','Engelleyen','Zarar Veren','Fayda Veren','Nur','Doğru Yola İleten','Benzersiz Yaratan','Kalıcı Olan','Her Şeyin Varisi','Doğru Yolu Gösteren','Çok Sabırlı'],
  fr: ['Le Très Miséricordieux','Le Miséricordieux','Le Roi','Le Très Saint','La Paix','Celui qui préserve la foi','Le Gardien','Le Tout-Puissant','Le Contraignant','L\'Orgueilleux','Le Créateur','Le Producteur','Le Formateur','Le Grand Pardonneur','Le Dominateur','Le Donateur','Le Pourvoyeur','Le Grand Ouvreur','L\'Omniscient','Le Restricteur','L\'Expansif','L\'Abaisseur','L\'Élevateur','Celui qui honore','Celui qui humilie','Le Tout-Entendant','Le Tout-Voyant','Le Juge','Le Juste','Le Subtil','Le Parfaitement Informé','L\'Indulgent','Le Magnifique','Le Très Pardonneur','Le Reconnaissant','Le Très Haut','Le Très Grand','Le Gardien','Le Tout-Puissant','Le Comptable','Le Majestueux','Le Généreux','Le Vigilant','Celui qui répond','L\'Immense','Le Sage','L\'Affectueux','Le Glorieux','Le Ressuscitateur','Le Témoin','La Vérité','Le Tuteur','Le Fort','Le Solide','Le Protecteur','Le Digne de louanges','Le Dénombrateur','L\'Initiateur','Le Restaurateur','Le Vivificateur','Celui qui donne la mort','Le Vivant','Le Subsistant','Celui qui trouve','L\'Illustre','L\'Unique','Le Un','L\'Éternel','Le Capable','Le Très Capable','Le Prédécesseur','Le Procrastinateur','Le Premier','Le Dernier','L\'Apparent','Le Caché','Le Proche Protecteur','Le Très Élevé','Le Bienfaisant','Celui qui accueille le repentir','Le Vengeur','Le Clément','Le Compatissant','Maître du Royaume','Seigneur de la Majesté','L\'Équitable','Le Rassembleur','Le Suffisant','Celui qui enrichit','Celui qui empêche','Celui qui nuit','Celui qui profite','La Lumière','Le Guide','L\'Incomparable','L\'Immuable','L\'Héritier','Le Guide vers le droit chemin','Le Patient'],
  nl: ['De Meest Barmhartige','De Meest Genadige','De Koning','De Heilige','De Vrede','De Gelovige','De Bewaker','De Almachtige','De Dwinger','De Verhevene','De Schepper','De Verwekker','De Vormer','De Vergever','De Overweldiger','De Schenker','De Voorziener','De Opener','De Alwetende','De Inhouder','De Uitbreider','De Vernederende','De Verheffende','De Erende','De Vernederende','De Alhorende','De Alziedende','De Rechter','De Rechtvaardige','De Subtiele','De Alwetende','De Verdraagzame','De Magnifieke','De Vergevende','De Dankbare','De Allerhoogste','De Allergrootste','De Beschermer','De Onderhouder','De Rekenaar','De Majestueuze','De Vrijgevige','De Waakzame','De Antwoordende','De Alomvattende','De Wijze','De Liefhebbende','De Glorieuze','De Opwekker','De Getuige','De Waarheid','De Beheerder','De Sterke','De Standvastige','De Beschermende Vriend','De Geprezen','De Teller','De Oorsprong','De Hersteller','De Gever van Leven','De Nemer van Leven','De Levende','De Zelfbestaande','De Vinder','De Nobele','De Unieke','De Enige','De Eeuwige','De Capabele','De Machtige','De Bespoediger','De Uitsteller','De Eerste','De Laatste','De Manifeste','De Verborgen','De Gouverneur','De Meest Verhevene','De Bron van Goed','De Accepteerder van Bekering','De Wreker','De Vergevende','De Medelevende','Eigenaar van Soevereiniteit','Heer van Majesteit','De Billijke','De Verzamelaar','De Genoegzame','De Verrijker','De Weerhouder','De Schadebrengende','De Weldoener','Het Licht','De Gids','De Onvergelijkbare','De Eeuwigdurende','De Erfgenaam','De Rechtvaardige','De Geduldige'],
}

function AsmaulHusnaSlide({ theme, lang }: { theme: string; lang: string }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * ASMAUL_HUSNA.length))
  const p = ASMAUL_PALETTES[theme] ?? ASMAUL_PALETTES.amber
  const meanings = ASMAUL_MEANINGS[lang] ?? ASMAUL_MEANINGS.de!
  const ui = UI[lang as LangCode] ?? UI.de

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % ASMAUL_HUSNA.length), 8000)
    return () => clearInterval(id)
  }, [])

  const [arabic, transliteration] = ASMAUL_HUSNA[idx]
  const meaning = meanings[idx] ?? ASMAUL_HUSNA[idx][2]
  const num = idx + 1
  const progressPct = (num / 99) * 100

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 relative overflow-hidden" style={{ background: p.bg }}>
      <div className="absolute select-none pointer-events-none" style={{
        fontSize: '18rem',
        fontWeight: 900,
        color: p.translit,
        opacity: 0.04,
        lineHeight: 1,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '-0.06em',
        userSelect: 'none',
      }}>
        {String(num).padStart(2, '0')}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="text-xs uppercase tracking-widest" style={{ color: `${p.translit}66` }}>
          Asmaul Husna · {num} {ui.of} 99
        </div>
        <div className="text-white font-light text-center"
          style={{ fontSize: 'clamp(5rem,15vw,11rem)', fontFamily: '"Amiri","Traditional Arabic",serif', lineHeight: 1.2 }}>
          {arabic}
        </div>
        <div className="font-light tracking-wide" style={{ color: p.translit, fontSize: 'clamp(2.2rem,3vmin,2.8rem)', borderBottom: `2px solid ${p.translit}55`, paddingBottom: '0.2rem' }}>
          {transliteration}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(2rem,2.5vmin,2.5rem)' }}>{meaning}</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: p.translit, transition: 'width 0.6s ease', borderRadius: '0 2px 2px 0' }} />
      </div>
    </div>
  )
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]{11})/)
  return m ? m[1] : null
}

// ─── Hilfs-Funktionen ─────────────────────────────────────────────────────────

function parseTimeToday(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const min = Math.floor((total % 3600) / 60)
  const sec = total % 60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

// ─── Ramadan ──────────────────────────────────────────────────────────────────

const RAMADAN_PALETTES: Record<string, { bg: string; text: string; accent: string; muted: string; sub: string }> = {
  madinah: { bg: 'radial-gradient(ellipse at 50% 20%,#1a1000 0%,#080600 100%)', text: '#f5e6c8', accent: '#d4a843', muted: 'rgba(245,230,200,0.55)', sub: 'rgba(212,168,67,0.25)' },
  night:   { bg: 'radial-gradient(ellipse at 50% 20%,#0a0d1a 0%,#030408 100%)', text: '#dde7ff', accent: '#7fb3ff', muted: 'rgba(221,231,255,0.55)', sub: 'rgba(127,179,255,0.2)' },
  emerald: { bg: 'radial-gradient(ellipse at 50% 20%,#041208 0%,#020907 100%)', text: '#d1fae5', accent: '#34d399', muted: 'rgba(209,250,229,0.55)', sub: 'rgba(52,211,153,0.2)' },
}

function RamadanSlide({ cityId, theme, lang }: { cityId: number; theme: string; lang: string }) {
  const [prayers, setPrayers] = useState<{ fajr: string; maghrib: string } | null>(null)
  const [countdown, setCountdown] = useState('')
  const [countdownLabel, setCountdownLabel] = useState('')
  const p = RAMADAN_PALETTES[theme] ?? RAMADAN_PALETTES.madinah!
  const ui = UI[lang as LangCode] ?? UI.de

  useEffect(() => {
    if (!cityId) return
    getDailyPrayerTimes(cityId)
      .then(t => setPrayers({ fajr: t.fajr, maghrib: t.maghrib }))
      .catch(() => {})
  }, [cityId])

  useEffect(() => {
    if (!prayers) return
    function tick() {
      const now = new Date()
      const fajr = parseTimeToday(prayers!.fajr)
      const maghrib = parseTimeToday(prayers!.maghrib)
      if (now < fajr) {
        setCountdownLabel(ui.imsakIn)
        setCountdown(formatCountdown(fajr.getTime() - now.getTime()))
      } else if (now < maghrib) {
        setCountdownLabel(ui.iftarIn)
        setCountdown(formatCountdown(maghrib.getTime() - now.getTime()))
      } else {
        setCountdownLabel('Iftar')
        setCountdown(ui.iftarDone)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [prayers, ui.imsakIn, ui.iftarIn, ui.iftarDone])

  const hijri = (() => {
    try {
      const DATE_LOCALE: Partial<Record<LangCode, string>> = {
        ar: 'ar-SA', tr: 'tr-TR', ur: 'ur-PK', id: 'id-ID',
        ms: 'ms-MY', fr: 'fr-FR', nl: 'nl-NL', bs: 'bs-BA',
        en: 'en-GB', bn: 'bn-BD', so: 'so-SO',
      }
      const locale = DATE_LOCALE[lang as LangCode] ?? 'de-DE'
      return new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
        day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date())
    } catch { return '' }
  })()

  // Prayer name labels use official terms (Fajr/Imsak and Maghrib/Iftar are universally understood)
  const fajrLabel  = lang === 'tr' ? 'İmsak' : lang === 'id' || lang === 'ms' ? 'Sahur' : 'Suhoor'
  const iftarLabel = 'Iftar'

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 relative overflow-hidden"
      style={{ background: p.bg }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, ${p.accent}18 1.5px, transparent 1.5px)`,
        backgroundSize: '55px 55px',
      }} />
      <div className="absolute top-8 right-12 select-none" style={{ color: p.accent, fontSize: '9rem', opacity: 0.07, lineHeight: 1 }}>
        ☽
      </div>
      <div className="relative z-10 flex flex-col items-center gap-7 px-12 text-center">
        <div style={{ color: p.accent, fontSize: 'clamp(3rem,8vw,6.5rem)', fontFamily: '"Amiri","Traditional Arabic",serif', direction: 'rtl', lineHeight: 1.25 }}>
          رَمَضَانُ كَرِيمٌ
        </div>
        {hijri && (
          <div style={{ color: p.muted, fontSize: 'clamp(1.3rem,2.2vmin,1.9rem)' }}>{hijri}</div>
        )}
        <div style={{ width: 120, height: 1, background: `linear-gradient(90deg,transparent,${p.accent},transparent)`, opacity: 0.5 }} />
        {prayers ? (
          <div className="flex gap-14">
            <div className="flex flex-col items-center gap-1">
              <span style={{ color: p.muted, fontSize: 'clamp(1.1rem,1.8vmin,1.6rem)' }}>{fajrLabel}</span>
              <span style={{ color: p.text, fontSize: 'clamp(2rem,4vmin,3.2rem)', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>{prayers.fajr}</span>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: p.sub }} />
            <div className="flex flex-col items-center gap-1">
              <span style={{ color: p.muted, fontSize: 'clamp(1.1rem,1.8vmin,1.6rem)' }}>{iftarLabel}</span>
              <span style={{ color: p.text, fontSize: 'clamp(2rem,4vmin,3.2rem)', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>{prayers.maghrib}</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${p.accent}33`, borderTopColor: p.accent }} />
        )}
        {countdown && (
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: p.muted, fontSize: 'clamp(1.1rem,1.8vmin,1.6rem)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {countdownLabel}
            </span>
            <span style={{ color: p.accent, fontSize: 'clamp(3rem,7vw,5.5rem)', fontVariantNumeric: 'tabular-nums', fontWeight: 300, letterSpacing: '-0.02em' }}>
              {countdown}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Jumu'a ───────────────────────────────────────────────────────────────────

const JUMUA_PALETTES: Record<string, { bg: string; text: string; accent: string; muted: string }> = {
  dark:  { bg: 'radial-gradient(ellipse at 50% 30%,#0a0f0a 0%,#050805 100%)', text: '#ffffff', accent: '#6ee7b7', muted: 'rgba(255,255,255,0.5)' },
  gold:  { bg: 'radial-gradient(ellipse at 50% 30%,#1a1200 0%,#0a0700 100%)', text: '#f5e6c8', accent: '#d4a843', muted: 'rgba(245,230,200,0.5)' },
  blue:  { bg: 'radial-gradient(ellipse at 50% 30%,#050d1a 0%,#020610 100%)', text: '#dde7ff', accent: '#60a5fa', muted: 'rgba(221,231,255,0.5)' },
}

function JumuaSlide({ time, theme, lang }: { time: string; theme: string; lang: string }) {
  const [countdown, setCountdown] = useState('')
  const [isFridayNow, setIsFridayNow] = useState(false)
  const [beforePrayer, setBeforePrayer] = useState(false)
  const p = JUMUA_PALETTES[theme] ?? JUMUA_PALETTES.dark!
  const ui = UI[lang as LangCode] ?? UI.de

  useEffect(() => {
    function tick() {
      const now = new Date()
      const [h, m] = time.split(':').map(Number)
      const friday = now.getDay() === 5
      const target = new Date()
      target.setHours(h ?? 13, m ?? 0, 0, 0)
      const daysTil = (5 - now.getDay() + 7) % 7
      if (daysTil > 0) target.setDate(target.getDate() + daysTil)
      else if (daysTil === 0 && target <= now) target.setDate(target.getDate() + 7)
      const diff = target.getTime() - now.getTime()
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setIsFridayNow(friday)
      setBeforePrayer(friday && target > now)
      if (days > 0) setCountdown(`${days}d ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`)
      else setCountdown(`${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [time])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-8 relative overflow-hidden"
      style={{ background: p.bg }}>
      <div className="absolute inset-0" style={{ backgroundImage: HEX_SVG_BG, backgroundSize: '60px 69px' }} />
      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-12">
        <div style={{ color: p.accent, fontSize: 'clamp(3.5rem,10vw,8rem)', fontFamily: '"Amiri","Traditional Arabic",serif', direction: 'rtl', lineHeight: 1.3 }}>
          جُمُعَةٌ مُبَارَكَةٌ
        </div>
        <div style={{ color: p.muted, fontSize: 'clamp(1.4rem,2.5vmin,2rem)', letterSpacing: '0.1em' }}>
          Jumu'ah Mubarak
        </div>
        <div style={{ width: 120, height: 1, background: `linear-gradient(90deg,transparent,${p.accent},transparent)`, opacity: 0.4 }} />
        <div className="flex flex-col items-center gap-2">
          <span style={{ color: p.muted, fontSize: 'clamp(1.2rem,2vmin,1.8rem)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            {isFridayNow && beforePrayer ? ui.today : isFridayNow ? ui.nextWeek : ui.nextFriday}
          </span>
          <span style={{ color: p.text, fontSize: 'clamp(3rem,6vw,5rem)', fontWeight: 300 }}>
            {time}{ui.timeSuffix}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span style={{ color: p.muted, fontSize: 'clamp(1.1rem,1.8vmin,1.6rem)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            {ui.in_}
          </span>
          <span style={{ color: p.accent, fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontVariantNumeric: 'tabular-nums', fontWeight: 300, letterSpacing: '-0.02em' }}>
            {countdown}
          </span>
        </div>
      </div>
    </div>
  )
}
