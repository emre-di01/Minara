interface Props {
  config: Record<string, unknown>
}

export default function TickerWidget({ config }: Props) {
  const text = (config.text as string) ?? ''

  if (!text) return null

  return (
    <div className="h-full w-full bg-green-800 text-white flex items-center overflow-hidden">
      <div
        className="whitespace-nowrap animate-[ticker_20s_linear_infinite] text-sm font-medium px-4"
        style={{
          animation: 'ticker 20s linear infinite',
        }}
      >
        {text}
      </div>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  )
}
