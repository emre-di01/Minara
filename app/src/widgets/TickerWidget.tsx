interface Props {
  config: Record<string, unknown>
}

const STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  dark:  { bg: '#080808',    text: '#ffffff',   accent: 'rgba(255,255,255,0.25)' },
  gold:  { bg: '#0f0a00',    text: '#f5d87a',   accent: 'rgba(212,168,67,0.4)' },
  green: { bg: '#030f07',    text: '#6ee7b7',   accent: 'rgba(110,231,183,0.3)' },
  light: { bg: '#f3f4f6',    text: '#111827',   accent: 'rgba(17,24,39,0.2)' },
}

export default function TickerWidget({ config }: Props) {
  const text  = (config.text  as string) ?? ''
  const style = ((config.style as string) in STYLES ? config.style as string : 'dark') as keyof typeof STYLES
  const speed = Math.max(10, Math.min(60, Number(config.speed) || 20))

  if (!text) return null

  const s = STYLES[style]
  const sep = <span style={{ color: s.accent, margin: '0 3vw' }} aria-hidden>◆</span>

  return (
    <div className="h-full w-full flex items-center overflow-hidden select-none" style={{ background: s.bg }}>
      <div
        className="shrink-0 whitespace-nowrap font-light"
        style={{ color: s.text, fontSize: 'clamp(1.2rem, 3vh, 3rem)', animation: `ticker ${speed}s linear infinite` }}
      >
        {text}{sep}{text}{sep}{text}{sep}
      </div>
      <style>{`@keyframes ticker { 0% { transform: translateX(100vw) } 100% { transform: translateX(-100%) } }`}</style>
    </div>
  )
}
