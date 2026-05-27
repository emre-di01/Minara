import { useState, useEffect } from 'react'

interface EventItem {
  title: string
  date: string
  dateRaw?: string
  time?: string
  description?: string
}

export type EventsTheme = 'dark' | 'green' | 'gold' | 'blue' | 'purple' | 'night'

interface Props {
  title?: string
  theme?: EventsTheme
  events?: EventItem[]
  lang?: string
}

interface Palette {
  bg: string
  accent: string
  badgeBg: string
  badgeText: string
  cardBg: string
  border: string
  text: string
  muted: string
  sub: string
  header: string
}

const THEMES: Record<EventsTheme, Palette> = {
  dark:   { bg: '#080808', accent: '#10b981', badgeBg: '#052e1d', badgeText: '#6ee7b7', cardBg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.2)',  text: '#ffffff', muted: 'rgba(255,255,255,0.65)', sub: 'rgba(255,255,255,0.45)', header: 'rgba(16,185,129,0.05)'  },
  green:  { bg: '#030f07', accent: '#34d399', badgeBg: '#022c17', badgeText: '#a7f3d0', cardBg: 'rgba(52,211,153,0.07)',  border: 'rgba(52,211,153,0.18)', text: '#f0fdf4', muted: 'rgba(240,253,244,0.65)', sub: 'rgba(240,253,244,0.45)', header: 'rgba(52,211,153,0.05)' },
  gold:   { bg: '#090700', accent: '#d4a843', badgeBg: '#2d1e00', badgeText: '#fde68a', cardBg: 'rgba(212,168,67,0.07)',  border: 'rgba(212,168,67,0.2)',  text: '#fef9e7', muted: 'rgba(254,249,231,0.65)', sub: 'rgba(254,249,231,0.45)', header: 'rgba(212,168,67,0.05)'  },
  blue:   { bg: '#030810', accent: '#60a5fa', badgeBg: '#0f1e3c', badgeText: '#93c5fd', cardBg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.2)',  text: '#eff6ff', muted: 'rgba(239,246,255,0.65)', sub: 'rgba(239,246,255,0.45)', header: 'rgba(96,165,250,0.05)'  },
  purple: { bg: '#08040f', accent: '#a78bfa', badgeBg: '#1e0f3c', badgeText: '#c4b5fd', cardBg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.2)', text: '#f5f3ff', muted: 'rgba(245,243,255,0.65)', sub: 'rgba(245,243,255,0.45)', header: 'rgba(167,139,250,0.05)' },
  night:  { bg: '#000000', accent: '#ffffff', badgeBg: '#1a1a1a', badgeText: '#ffffff', cardBg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', text: '#ffffff', muted: 'rgba(255,255,255,0.65)', sub: 'rgba(255,255,255,0.45)', header: 'rgba(255,255,255,0.04)' },
}

const LANG_LOCALE: Record<string, string> = {
  de: 'de-DE', en: 'en-US', tr: 'tr-TR', ar: 'ar-SA',
  fr: 'fr-FR', nl: 'nl-NL', bs: 'bs-BA', ur: 'ur-PK',
  id: 'id-ID', ms: 'ms-MY', sq: 'sq-AL', az: 'az-AZ',
}

function getCurrentDateString(lang = 'de'): string {
  const locale = LANG_LOCALE[lang] ?? 'de-DE'
  return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function usePortrait() {
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerWidth < window.innerHeight : false
  )
  useEffect(() => {
    function check() { setIsPortrait(window.innerWidth < window.innerHeight) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isPortrait
}

export default function EventsSlide({ title = 'Veranstaltungen', theme = 'dark', events = [], lang = 'de' }: Props) {
  const [dateStr, setDateStr] = useState(() => getCurrentDateString(lang))
  const p = THEMES[theme] ?? THEMES.dark
  const isPortrait = usePortrait()
  const visible = events.slice(0, 4)

  useEffect(() => {
    setDateStr(getCurrentDateString(lang))
    const id = setInterval(() => setDateStr(getCurrentDateString(lang)), 60000)
    return () => clearInterval(id)
  }, [lang])

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        background: p.bg,
        color: p.text,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4vw',
          height: isPortrait ? '10vh' : '12vh',
          flexShrink: 0,
          borderBottom: `1px solid ${p.border}`,
          background: p.header,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
          <div style={{ width: 8, height: '5vh', borderRadius: 3, background: p.accent }} />
          <h1 style={{ fontWeight: 700, letterSpacing: '0.02em', color: p.text, fontSize: 'clamp(2rem,5vmin,3.5rem)', margin: 0 }}>
            {title}
          </h1>
        </div>
        <div style={{ color: p.muted, fontSize: 'clamp(2rem,3.5vmin,2.5rem)', fontWeight: 300 }}>
          {dateStr}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: isPortrait ? '3vh 4vw' : '4vh 4vw', overflow: 'hidden', display: 'flex' }}>
        {visible.length === 0 ? (
          <PlaceholderEmpty palette={p} />
        ) : visible.length === 1 ? (
          <OneEvent event={visible[0]} palette={p} isPortrait={isPortrait} />
        ) : visible.length === 2 ? (
          <TwoEvents events={visible} palette={p} isPortrait={isPortrait} />
        ) : visible.length === 3 ? (
          <ThreeEvents events={visible} palette={p} isPortrait={isPortrait} />
        ) : (
          <FourEvents events={visible} palette={p} isPortrait={isPortrait} />
        )}
      </div>
    </div>
  )
}

// ─── Layouts ──────────────────────────────────────────────────────────────────

function PlaceholderEmpty({ palette: p }: { palette: Palette }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh' }}>
      <div style={{
        color: p.accent,
        fontSize: 'clamp(8rem,15vmin,16rem)',
        opacity: 0.18,
        fontFamily: '"Amiri","Traditional Arabic",serif',
        direction: 'rtl',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        ﷽
      </div>
      <div style={{ color: p.sub, fontSize: 'clamp(2rem,3vmin,2.5rem)', fontWeight: 300 }}>
        Keine Veranstaltungen eingetragen
      </div>
    </div>
  )
}

function OneEvent({ event, palette: p, isPortrait }: { event: EventItem; palette: Palette; isPortrait: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isPortrait ? 'column' : 'row',
          width: '100%',
          height: isPortrait ? '75vh' : '70vh',
          borderRadius: '2vw',
          overflow: 'hidden',
          background: p.cardBg,
          border: `2px solid ${p.border}`,
          boxShadow: `0 0 80px ${p.border}`,
        }}
      >
        {/* Date badge — horizontal strip (portrait) or left column (landscape) */}
        <div
          style={{
            background: p.badgeBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...(isPortrait
              ? { flexDirection: 'row', gap: '4vw', padding: '3.5vh 6vw', flexShrink: 0 }
              : { flexDirection: 'column', gap: '2vh', padding: '6vh 4vw', minWidth: '28vw' }),
          }}
        >
          <span
            style={{
              color: p.badgeText,
              fontWeight: 800,
              fontSize: 'clamp(2.5rem,5.5vmin,5rem)',
              lineHeight: 1.1,
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}
          >
            {event.date}
          </span>
          {event.time && (
            <span style={{ color: p.badgeText, opacity: 0.85, fontWeight: 400, fontSize: 'clamp(2rem,4vmin,3.5rem)' }}>
              {event.time}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '3vh',
            padding: isPortrait ? '4vh 6vw' : '6vh 4vw',
          }}
        >
          <div style={{ width: '8vw', height: 6, background: p.accent, borderRadius: 3 }} />
          <h2
            style={{
              color: p.text,
              fontWeight: 700,
              fontSize: 'clamp(3rem,7vmin,6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {event.title}
          </h2>
          {event.description && (
            <p
              style={{
                color: p.muted,
                fontWeight: 300,
                fontSize: 'clamp(2.2rem,3.5vmin,2.8rem)',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {event.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TwoEvents({ events, palette: p, isPortrait }: { events: EventItem[]; palette: Palette; isPortrait: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: isPortrait ? '1fr' : '1fr 1fr',
        gridTemplateRows: isPortrait ? '1fr 1fr' : '1fr',
        gap: isPortrait ? '3vh' : '3vw',
      }}
    >
      {events.map((ev, i) => (
        <EventCard key={i} event={ev} palette={p} size="large" isPortrait={isPortrait} />
      ))}
    </div>
  )
}

function ThreeEvents({ events, palette: p, isPortrait }: { events: EventItem[]; palette: Palette; isPortrait: boolean }) {
  if (isPortrait) {
    return (
      <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr 1fr 1fr', gap: '2.5vh' }}>
        {events.map((ev, i) => (
          <EventCard key={i} event={ev} palette={p} size="medium" isPortrait={true} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '6fr 4fr', gap: '3vw' }}>
      <EventCard event={events[0]} palette={p} size="large" isPortrait={false} />
      <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '3vh' }}>
        {events.slice(1).map((ev, i) => (
          <EventCard key={i} event={ev} palette={p} size="small" isPortrait={false} />
        ))}
      </div>
    </div>
  )
}

function FourEvents({ events, palette: p, isPortrait }: { events: EventItem[]; palette: Palette; isPortrait: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: isPortrait ? '1fr' : '1fr 1fr',
        gridTemplateRows: isPortrait ? 'repeat(4, 1fr)' : '1fr 1fr',
        gap: isPortrait ? '2vh' : '3vh 3vw',
      }}
    >
      {events.map((ev, i) => (
        <EventCard key={i} event={ev} palette={p} size="medium" isPortrait={isPortrait} />
      ))}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function EventCard({ event, palette: p, size, isPortrait }: { event: EventItem; palette: Palette; size: 'small' | 'medium' | 'large'; isPortrait: boolean }) {
  // vmin ensures same physical font size on both portrait and landscape 1080p displays
  const titleSize = size === 'large' ? 'clamp(2rem,5vmin,3.5rem)' : size === 'medium' ? 'clamp(1.8rem,4vmin,2.8rem)' : 'clamp(1.5rem,3.2vmin,2.2rem)'
  const dateSize  = size === 'large' ? 'clamp(2rem,4vmin,3rem)'   : size === 'medium' ? 'clamp(1.6rem,3.2vmin,2.4rem)' : 'clamp(1.4rem,2.7vmin,2rem)'
  const timeSize  = size === 'large' ? 'clamp(1.6rem,3.2vmin,2.4rem)' : size === 'medium' ? 'clamp(1.4rem,2.7vmin,2rem)' : 'clamp(1.2rem,2.3vmin,1.7rem)'
  const descSize  = size === 'large' ? 'clamp(2rem,3.2vmin,2.4rem)' : size === 'medium' ? 'clamp(1.8rem,2.8vmin,2.2rem)' : 'clamp(1.8rem,2.4vmin,2rem)'
  const badgeMin  = size === 'large' ? '18vw' : size === 'medium' ? '14vw' : '12vw'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isPortrait ? 'column' : 'row',
        borderRadius: '1.5vw',
        overflow: 'hidden',
        background: p.cardBg,
        border: `1px solid ${p.border}`,
      }}
    >
      {/* Date badge — horizontal strip (portrait) or left column (landscape) */}
      <div
        style={{
          background: p.badgeBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(isPortrait
            ? { flexDirection: 'row', gap: '3vw', padding: '2vh 4vw', flexShrink: 0 }
            : { flexDirection: 'column', gap: '1.5vh', padding: '3vh 2vw', minWidth: badgeMin }),
        }}
      >
        <span style={{ color: p.badgeText, fontWeight: 700, fontSize: dateSize, lineHeight: 1.1, textAlign: 'center', letterSpacing: '-0.01em' }}>
          {event.date}
        </span>
        {event.time && (
          <span style={{ color: p.badgeText, opacity: 0.8, fontWeight: 400, fontSize: timeSize }}>
            {event.time}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5vh', padding: isPortrait ? '2vh 4vw' : '3vh 3vw', minWidth: 0 }}>
        <h3 style={{ color: p.text, fontWeight: 700, fontSize: titleSize, lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0 }}>
          {event.title}
        </h3>
        {event.description && (
          <p
            style={{
              color: p.muted,
              fontWeight: 300,
              fontSize: descSize,
              lineHeight: 1.35,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: size === 'large' ? 4 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}
