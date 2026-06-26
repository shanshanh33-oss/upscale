const ALLOWED_EVENTS = new Set([
  'page_view',
  'session_start',
  'image_uploaded',
  'ai_enabled',
  'process_start',
  'process_success',
  'process_error',
  'batch_start',
  'batch_item_success',
  'batch_item_error',
  'download',
  'download_zip',
])

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
})

const getChinaDate = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)

const readCount = async (kv, key) => {
  const value = await kv.get(key)
  const count = Number.parseInt(value || '0', 10)
  return Number.isFinite(count) ? count : 0
}

const addCount = async (kv, key, amount) => {
  const current = await readCount(kv, key)
  await kv.put(key, String(current + amount))
}

export async function onRequestPost(context) {
  const kv = context.env.TUSCALE_ANALYTICS
  if (!kv) return json({ ok: false, configured: false }, 202)

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ ok: false, error: 'INVALID_JSON' }, 400)
  }

  const event = String(body?.event || '').trim()
  if (!ALLOWED_EVENTS.has(event)) return json({ ok: false, error: 'INVALID_EVENT' }, 400)

  const rawCount = Number(body?.data?.count || 1)
  const amount = Math.max(1, Math.min(Number.isFinite(rawCount) ? Math.round(rawCount) : 1, 100))
  const day = getChinaDate()

  await Promise.all([
    addCount(kv, `total:${event}`, amount),
    addCount(kv, `day:${day}:${event}`, amount),
  ])

  return json({ ok: true })
}

export function onRequestOptions() {
  return json({ ok: true })
}
