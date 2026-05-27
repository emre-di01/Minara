const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

interface IgMedia {
  id: string
  caption?: string
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  permalink?: string
  children?: { data: { id: string; media_url?: string; thumbnail_url?: string; media_type: string }[] }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { token, limit = 8 } = await req.json() as { token: string; limit?: number }

    if (!token) return json({ error: 'access_token fehlt' }, 400)

    const fields = [
      'id', 'caption', 'media_url', 'thumbnail_url',
      'timestamp', 'media_type', 'permalink',
      'children{media_url,thumbnail_url,media_type}',
    ].join(',')

    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${token}`
    )
    const data = await res.json() as { data?: IgMedia[]; error?: { message: string; code: number } }

    if (data.error) return json({ error: data.error.message }, 400)

    const posts = (data.data ?? []).flatMap((p) => {
      // For carousels take the first child image
      if (p.media_type === 'CAROUSEL_ALBUM') {
        const first = p.children?.data?.find(c => c.media_type === 'IMAGE')
        if (!first?.media_url) return []
        return [{ image_url: first.media_url, caption: clean(p.caption), date: fmtDate(p.timestamp), permalink: p.permalink }]
      }
      const imgUrl = p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url
      if (!imgUrl) return []
      return [{ image_url: imgUrl, caption: clean(p.caption), date: fmtDate(p.timestamp), permalink: p.permalink }]
    })

    return json({ posts })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function clean(caption?: string): string {
  if (!caption) return ''
  // Strip hashtags and truncate to first 200 chars of first line
  return caption.split('\n')[0].replace(/#\S+/g, '').trim().slice(0, 200)
}

function fmtDate(ts: string): string {
  return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}
