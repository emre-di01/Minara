import { useState, useEffect } from 'react'

type Platform = 'instagram' | 'youtube' | 'facebook' | 'whatsapp' | 'website' | 'tiktok'

interface Channel {
  platform: Platform
  handle: string
  url: string
}

export type SocialTheme = 'dark' | 'light' | 'colorful'

interface Props {
  title?: string
  channels?: Channel[]
  theme?: SocialTheme
}

const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  youtube:   { label: 'YouTube',   color: '#FF0000' },
  facebook:  { label: 'Facebook',  color: '#1877F2' },
  whatsapp:  { label: 'WhatsApp',  color: '#25D366' },
  tiktok:    { label: 'TikTok',    color: '#69C9D0' },
  website:   { label: 'Website',   color: '#6366f1' },
}

function PlatformIcon({ platform }: { platform: Platform }) {
  const color = PLATFORM_META[platform]?.color ?? '#888'

  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%" style={{ color }}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="17.5" cy="6.5" r="1.5" fill={color} />
      </svg>
    )
  }
  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
        <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C16.3 5 12 5 12 5s-4.3 0-6.9.1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.8C6.8 19 12 19 12 19s4.3 0 6.9-.1c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2S22 14.4 22 12.8v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.7V9.3l5.7 2.7-5.7 2.7z" />
      </svg>
    )
  }
  if (platform === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    )
  }
  if (platform === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    )
  }
  if (platform === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.62a8.25 8.25 0 0 0 4.84 1.55V6.73a4.85 4.85 0 0 1-1.07-.04z" />
      </svg>
    )
  }
  // website
  return (
    <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%" style={{ color }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
      <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" />
      <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  )
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

interface ThemePalette {
  bg: string
  text: string
  muted: string
  cardBg: (color: string) => string
  cardBorder: (color: string) => string
  qrBg: string
  divider: string
  isLight: boolean
}

function getPalette(theme: SocialTheme): ThemePalette {
  if (theme === 'light') {
    return {
      bg: '#f8f9fa',
      text: '#0f1623',
      muted: 'rgba(15,22,35,0.65)',
      cardBg: () => '#ffffff',
      cardBorder: () => 'rgba(15,22,35,0.08)',
      qrBg: '#ffffff',
      divider: 'rgba(15,22,35,0.15)',
      isLight: true,
    }
  }
  if (theme === 'colorful') {
    return {
      bg: '#070709',
      text: '#ffffff',
      muted: 'rgba(255,255,255,0.75)',
      cardBg: (color) => `${color}26`, // ~15% opacity
      cardBorder: (color) => `${color}66`,
      qrBg: '#ffffff',
      divider: 'rgba(255,255,255,0.2)',
      isLight: false,
    }
  }
  // dark
  return {
    bg: '#070709',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.7)',
    cardBg: (color) => `${color}1a`, // ~10%
    cardBorder: (color) => `${color}40`,
    qrBg: '#ffffff',
    divider: 'rgba(255,255,255,0.15)',
    isLight: false,
  }
}

export default function SocialFollowSlide({ title = 'Folgt uns!', channels = [], theme = 'dark' }: Props) {
  const isPortrait = usePortrait()
  const palette = getPalette(theme)
  const visible = channels.slice(0, 4)

  // QR size and card layout depend on channel count
  let qrSize = 180
  if (visible.length === 1) qrSize = 280
  else if (visible.length === 2) qrSize = 220
  else if (visible.length === 3) qrSize = 180
  else if (visible.length === 4) qrSize = 160

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5vh',
        padding: '5vh 4vw',
        overflow: 'hidden',
        userSelect: 'none',
        background: palette.bg,
        position: 'relative',
      }}
    >
      {/* Subtle radial bg (not for light) */}
      {!palette.isLight && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.12) 0%, transparent 65%)',
        }} />
      )}

      {/* Title */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vh' }}>
        <h1 style={{
          color: palette.text,
          fontWeight: 800,
          fontSize: 'clamp(2.5rem,4.5vw,4.5rem)',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          margin: 0,
        }}>
          {title}
        </h1>
        <div style={{
          width: '12vw',
          height: 3,
          background: `linear-gradient(90deg, transparent, ${palette.divider}, transparent)`,
          borderRadius: 2,
        }} />
      </div>

      {/* Cards */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {visible.length === 0 ? (
          <div style={{ color: palette.muted, fontSize: 'clamp(2.2rem,2.5vmin,2.5rem)', fontWeight: 300 }}>
            Keine Kanäle konfiguriert
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridColsFor(visible.length, isPortrait),
              gridTemplateRows: gridRowsFor(visible.length, isPortrait),
              gap: '3vh 3vw',
              width: '100%',
              maxWidth: visible.length === 1 ? '50vw' : '92vw',
              height: '100%',
              maxHeight: '75vh',
            }}
          >
            {visible.map((ch, i) => (
              <ChannelCard key={i} channel={ch} palette={palette} qrSize={qrSize} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function gridColsFor(n: number, isPortrait: boolean): string {
  if (n === 1) return '1fr'
  if (n === 2) return isPortrait ? '1fr' : '1fr 1fr'
  if (n === 3) return isPortrait ? '1fr' : '1fr 1fr 1fr'
  // 4
  return isPortrait ? '1fr' : '1fr 1fr'
}

function gridRowsFor(n: number, isPortrait: boolean): string {
  if (n === 1) return '1fr'
  if (n === 2) return isPortrait ? '1fr 1fr' : '1fr'
  if (n === 3) return isPortrait ? '1fr 1fr 1fr' : '1fr'
  // 4
  return isPortrait ? 'repeat(4, 1fr)' : '1fr 1fr'
}

function ChannelCard({ channel, palette, qrSize }: { channel: Channel; palette: ThemePalette; qrSize: number }) {
  const meta = PLATFORM_META[channel.platform] ?? { label: channel.platform, color: '#888' }
  // QR src always larger than displayed for crisp scan
  const qrSrcSize = Math.max(qrSize * 2, 320)
  const qrUrl = channel.url ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSrcSize}x${qrSrcSize}&data=${encodeURIComponent(channel.url)}` : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5vh',
        padding: '4vh 3vw',
        borderRadius: '2vw',
        background: palette.cardBg(meta.color),
        border: `1px solid ${palette.cardBorder(meta.color)}`,
        boxShadow: palette.isLight ? '0 8px 32px rgba(0,0,0,0.08)' : 'none',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* Platform icon */}
      <div
        style={{
          width: 80,
          height: 80,
          minWidth: 60,
          minHeight: 60,
          borderRadius: 16,
          background: palette.isLight ? `${meta.color}14` : `${meta.color}24`,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PlatformIcon platform={channel.platform} />
      </div>

      {/* Platform label */}
      <div style={{
        color: meta.color,
        fontWeight: 700,
        fontSize: 'clamp(2rem,2.8vmin,2.8rem)',
        lineHeight: 1.1,
        letterSpacing: '-0.01em',
      }}>
        {meta.label}
      </div>

      {/* Handle */}
      <div style={{
        color: palette.text,
        fontWeight: 400,
        fontSize: 'clamp(2rem,2.5vmin,2.5rem)',
        textAlign: 'center',
        wordBreak: 'break-word',
        lineHeight: 1.2,
      }}>
        {channel.handle}
      </div>

      {/* QR */}
      {qrUrl && (
        <div style={{
          background: palette.qrBg,
          padding: 8,
          borderRadius: 12,
          flexShrink: 0,
        }}>
          <img
            src={qrUrl}
            alt={`QR ${meta.label}`}
            width={qrSize}
            height={qrSize}
            style={{ display: 'block', imageRendering: 'pixelated', minWidth: 160, minHeight: 160, width: qrSize, height: qrSize }}
          />
        </div>
      )}
    </div>
  )
}
