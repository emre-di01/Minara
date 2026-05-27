import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { prompt, format } = await req.json() as { prompt: string; format: '16:9' | '9:16' }

    if (!prompt?.trim()) {
      return json({ error: 'Prompt fehlt' }, 400)
    }

    const token = Deno.env.get('REPLICATE_API_TOKEN')
    if (!token) return json({ error: 'REPLICATE_API_TOKEN nicht gesetzt' }, 500)

    // FLUX.1 schnell — dimensions must be multiples of 16
    const [width, height] = format === '9:16' ? [768, 1344] : [1344, 768]

    // Create prediction — `Prefer: wait` asks Replicate to block until done (≤60s)
    const createRes = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization':  `Bearer ${token}`,
          'Content-Type':   'application/json',
          'Prefer':         'wait=55',
        },
        body: JSON.stringify({
          input: { prompt, width, height, num_outputs: 1, output_format: 'webp', output_quality: 90 },
        }),
      }
    )
    let result = await createRes.json()

    // Fallback polling if Prefer:wait returned early
    for (let i = 0; i < 25 && result.status !== 'succeeded' && result.status !== 'failed'; i++) {
      await delay(2000)
      const r = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      result = await r.json()
    }

    if (result.status !== 'succeeded' || !result.output?.[0]) {
      return json({ error: result.error ?? 'Generierung fehlgeschlagen' }, 500)
    }

    // Download image from Replicate CDN
    const imgRes   = await fetch(result.output[0])
    const imgBytes = await imgRes.arrayBuffer()

    // Upload to Supabase Storage → permanent URL
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const path = `ai/${Date.now()}-${uid()}.webp`
    const { data: up, error: upErr } = await sb.storage
      .from('media')
      .upload(path, imgBytes, { contentType: 'image/webp' })

    if (upErr || !up) {
      // Return temporary Replicate URL as fallback
      return json({ url: result.output[0] })
    }

    const publicBase = Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
    const publicUrl = `${publicBase}/storage/v1/object/public/media/${up.path}`
    return json({ url: publicUrl })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const uid   = () => Math.random().toString(36).slice(2, 10)
