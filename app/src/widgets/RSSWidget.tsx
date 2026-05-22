import { useEffect, useState } from 'react'

interface RSSItem {
  title: string
  description: string
  thumbnail?: string
  enclosure?: { url?: string; type?: string }
}

function extractImage(item: RSSItem): string | null {
  if (item.thumbnail) return item.thumbnail
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url
  const m = item.description?.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : null
}

interface Props {
  config: Record<string, unknown>
}

export default function RSSWidget({ config }: Props) {
  const url = (config.url as string) ?? ''
  const [items, setItems] = useState<RSSItem[]>([])
  const [current, setCurrent] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) return
    let active = true
    async function load() {
      try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (active) { if (data.status === 'ok') setItems(data.items); else setError(true) }
      } catch { if (active) setError(true) }
    }
    load()
    const id = setInterval(load, 5 * 60_000)
    return () => { active = false; clearInterval(id) }
  }, [url])

  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setCurrent(c => (c + 1) % items.length), 8000)
    return () => clearInterval(id)
  }, [items.length])

  if (!url || error || items.length === 0) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center text-gray-600 text-sm">
        {!url ? 'RSS URL nicht konfiguriert' : 'RSS nicht verfügbar'}
      </div>
    )
  }

  const item = items[current]
  const image = extractImage(item)
  const plain = item.description?.replace(/<[^>]+>/g, '').trim() ?? ''

  return (
    <div className="h-full w-full bg-gray-900 text-white overflow-hidden relative flex items-center">
      {image && (
        <>
          <img src={image} className="absolute inset-0 w-full h-full object-cover" alt="" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.88) 50%, rgba(0,0,0,0.3) 100%)' }} />
        </>
      )}
      <div className="relative z-10 flex flex-col gap-1.5 px-5 py-4 min-w-0">
        <div className="text-xs text-gray-400 uppercase tracking-wider">📡 News</div>
        <div className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</div>
        {plain && <div className="text-xs text-gray-300 line-clamp-2">{plain}</div>}
        {items.length > 1 && (
          <div className="flex gap-1 mt-0.5">
            {items.map((_, i) => (
              <div key={i} className="rounded-full transition-all"
                style={{ width: i === current ? 14 : 5, height: 5, background: i === current ? 'white' : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
