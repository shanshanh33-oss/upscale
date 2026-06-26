const EVENTS = [
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
]

const LABELS = {
  page_view: '页面浏览',
  session_start: '访问人数粗略值',
  image_uploaded: '上传图片',
  ai_enabled: '开启 AI',
  process_start: '开始处理',
  process_success: '单图处理成功',
  process_error: '单图处理失败',
  batch_start: '批量开始',
  batch_item_success: '批量成功图片',
  batch_item_error: '批量失败图片',
  download: '下载图片',
  download_zip: '下载 ZIP',
}

const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
})

const getChinaDate = (offset = 0) => {
  const time = Date.now() + 8 * 60 * 60 * 1000 - offset * 24 * 60 * 60 * 1000
  return new Date(time).toISOString().slice(0, 10)
}

const readCount = async (kv, key) => {
  const value = await kv.get(key)
  const count = Number.parseInt(value || '0', 10)
  return Number.isFinite(count) ? count : 0
}

export async function onRequestGet(context) {
  const kv = context.env.TUSCALE_ANALYTICS
  if (!kv) {
    return json({
      ok: false,
      configured: false,
      message: 'Missing Cloudflare KV binding: TUSCALE_ANALYTICS',
    }, 202)
  }

  const totals = {}
  await Promise.all(EVENTS.map(async (event) => {
    totals[event] = await readCount(kv, `total:${event}`)
  }))

  const days = []
  for (let i = 0; i < 30; i++) {
    const day = getChinaDate(i)
    const values = {}
    await Promise.all(EVENTS.map(async (event) => {
      values[event] = await readCount(kv, `day:${day}:${event}`)
    }))
    days.push({ day, ...values })
  }

  return json({
    ok: true,
    timezone: 'Asia/Shanghai',
    labels: LABELS,
    totals,
    days,
  })
}
