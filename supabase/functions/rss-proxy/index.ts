const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url).searchParams.get('url')
  if (!url) {
    return json({ status: 'error', message: 'Missing url param' }, 400)
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Minara/1.0; RSS Reader)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`)
    const xml = await res.text()
    const items = parseRss(xml)
    return json({ status: 'ok', items })
  } catch (e) {
    return json({ status: 'error', message: String(e) }, 502)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

interface RssItem {
  title: string
  description: string
  thumbnail?: string
  enclosure?: { url?: string; type?: string }
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const isAtom = /<feed[\s>]/.test(xml)

  if (isAtom) {
    for (const entry of matches(xml, /<entry[\s>]([\s\S]*?)<\/entry>/g)) {
      items.push({
        title: cdata(entry, 'title') || tag(entry, 'title'),
        description: cdata(entry, 'summary') || tag(entry, 'summary') ||
                     cdata(entry, 'content') || tag(entry, 'content'),
        thumbnail: attr(entry, 'media:thumbnail', 'url') || attr(entry, 'img', 'src') || undefined,
      })
    }
  } else {
    for (const item of matches(xml, /<item[\s>]([\s\S]*?)<\/item>/g)) {
      const encUrl  = attr(item, 'enclosure', 'url')
      const encType = attr(item, 'enclosure', 'type')
      items.push({
        title: cdata(item, 'title') || tag(item, 'title'),
        description: cdata(item, 'description') || tag(item, 'description'),
        thumbnail: attr(item, 'media:thumbnail', 'url') ||
                   attr(item, 'media:content', 'url') || undefined,
        enclosure: encUrl ? { url: encUrl, type: encType || undefined } : undefined,
      })
    }
  }

  return items.slice(0, 20)
}

function matches(xml: string, re: RegExp): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) out.push(m[1] ?? m[0])
  return out
}

function cdata(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'))
  return m ? m[1].trim() : ''
}

function tag(xml: string, t: string): string {
  const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/<[^>]+>/g, '').trim()
}

function attr(xml: string, element: string, attribute: string): string {
  const m = xml.match(new RegExp(`<${element}[^>]+${attribute}=["']([^"']+)["']`, 'i'))
  return m ? m[1] : ''
}
