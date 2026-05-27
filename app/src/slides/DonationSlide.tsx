import { useState, useEffect } from 'react'

export type DonationTheme = 'gold' | 'green' | 'teal' | 'purple' | 'warm'

interface Props {
  title?: string
  subtitle?: string
  description?: string
  goal?: number
  current?: number
  currency?: string
  url?: string
  theme?: DonationTheme
}

interface Palette {
  bg: string
  accent: string
  glow: string
  text: string
  muted: string
  card: string
  border: string
  barBg: string
}

const THEMES: Record<DonationTheme, Palette> = {
  gold:   { bg: '#090600', accent: '#d4a843', glow: 'rgba(212,168,67,0.3)', text: '#fef9e7', muted: 'rgba(254,249,231,0.65)', card: 'rgba(212,168,67,0.08)',  border: 'rgba(212,168,67,0.25)',  barBg: 'rgba(212,168,67,0.15)' },
  green:  { bg: '#030a05', accent: '#10b981', glow: 'rgba(16,185,129,0.3)', text: '#f0fdf4', muted: 'rgba(240,253,244,0.65)', card: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)',  barBg: 'rgba(16,185,129,0.15)' },
  teal:   { bg: '#020a0a', accent: '#14b8a6', glow: 'rgba(20,184,166,0.3)', text: '#f0fdfa', muted: 'rgba(240,253,250,0.65)', card: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.25)',  barBg: 'rgba(20,184,166,0.15)' },
  purple: { bg: '#07040f', accent: '#a78bfa', glow: 'rgba(167,139,250,0.3)', text: '#f5f3ff', muted: 'rgba(245,243,255,0.65)', card: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', barBg: 'rgba(167,139,250,0.15)' },
  warm:   { bg: '#0f0703', accent: '#fb923c', glow: 'rgba(251,146,60,0.3)', text: '#fff7ed', muted: 'rgba(255,247,237,0.65)', card: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  barBg: 'rgba(251,146,60,0.15)' },
}

function formatAmount(n: number, currency: string) {
  return `${n.toLocaleString('de-DE')} ${currency}`
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

export default function DonationSlide({
  title = 'Spendenaufruf',
  subtitle,
  description,
  goal = 10000,
  current = 0,
  currency = '€',
  url,
  theme = 'gold',
}: Props) {
  const p = THEMES[theme] ?? THEMES.gold
  const isPortrait = usePortrait()
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const qrUrl = url ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}` : null

  // Info column (title/amounts/bar)
  const infoCol = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4vh', maxWidth: isPortrait ? '90vw' : '50vw' }}>
      {/* Icon + Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh', alignItems: isPortrait || !qrUrl ? 'center' : 'flex-start', textAlign: isPortrait || !qrUrl ? 'center' : 'left' }}>
        <div style={{ fontSize: 'clamp(4rem,6vw,6rem)', lineHeight: 1, opacity: 0.85 }}>🕌</div>
        <h1 style={{
          color: p.text,
          fontWeight: 800,
          fontSize: 'clamp(2.5rem,4.5vw,5rem)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <h2 style={{
            color: p.accent,
            fontWeight: 400,
            fontSize: 'clamp(1.5rem,2.8vw,3rem)',
            margin: 0,
          }}>
            {subtitle}
          </h2>
        )}
        {description && (
          <p style={{
            color: p.muted,
            fontWeight: 300,
            fontSize: 'clamp(2rem,2.5vmin,2.5rem)',
            lineHeight: 1.4,
            margin: 0,
            maxWidth: '40vw',
          }}>
            {description}
          </p>
        )}
      </div>

      {/* Amounts */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '2vw', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8vh' }}>
          <span style={{ color: p.muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>
            Bisher
          </span>
          <span style={{
            color: p.accent,
            fontWeight: 800,
            fontSize: 'clamp(2.8rem,5vw,6rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            {formatAmount(current, currency)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8vh', alignItems: 'flex-end' }}>
          <span style={{ color: p.muted, fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>
            Ziel
          </span>
          <span style={{
            color: p.text,
            fontWeight: 700,
            fontSize: 'clamp(1.6rem,2.8vw,3rem)',
            lineHeight: 1,
          }}>
            {formatAmount(goal, currency)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh' }}>
        <div style={{ width: '100%', borderRadius: 999, overflow: 'hidden', height: 20, background: p.barBg }}>
          <div
            style={{
              height: '100%',
              borderRadius: 999,
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${p.accent}b3, ${p.accent})`,
              boxShadow: `0 0 18px ${p.accent}aa`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ color: p.accent, fontWeight: 800, fontSize: 'clamp(1.8rem,3vw,3.5rem)' }}>{pct}%</span>
        </div>
      </div>
    </div>
  )

  // QR column
  const qrCol = qrUrl ? (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3vh',
      padding: '3vh 3vw',
      borderRadius: '2vw',
      background: p.card,
      border: `1px solid ${p.border}`,
      boxShadow: `0 0 40px ${p.glow}`,
    }}>
      <div style={{
        background: '#fff',
        padding: 12,
        borderRadius: 16,
      }}>
        <img
          src={qrUrl}
          alt="QR Code spenden"
          style={{ display: 'block', imageRendering: 'pixelated', width: 'clamp(140px, 20vmin, 260px)', height: 'clamp(140px, 20vmin, 260px)' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1vh' }}>
        <span style={{
          color: p.text,
          fontWeight: 700,
          fontSize: 'clamp(2rem,2.8vmin,2.8rem)',
          letterSpacing: '-0.01em',
        }}>
          Jetzt spenden
        </span>
        <span style={{
          color: p.muted,
          fontWeight: 300,
          fontSize: 'clamp(1.8rem,2.2vmin,2.2rem)',
        }}>
          QR-Code scannen
        </span>
      </div>
    </div>
  ) : null

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: isPortrait ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isPortrait ? '7vh 6vw' : '6vh 7vw',
        gap: isPortrait ? '4vh' : '5vw',
        overflow: 'hidden',
        userSelect: 'none',
        background: p.bg,
        position: 'relative',
      }}
    >
      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 45%, ${p.glow} 0%, transparent 65%)`,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: isPortrait ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isPortrait ? '4vh' : '5vw',
      }}>
        {infoCol}
        {qrCol}
      </div>
    </div>
  )
}
