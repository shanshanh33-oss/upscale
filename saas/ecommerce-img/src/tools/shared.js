export const readImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'))
  img.src = src
})

export const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('FILE_READ_FAILED'))
  reader.readAsDataURL(file)
})

export const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob)
    else reject(new Error('EXPORT_FAILED'))
  }, mimeType, quality)
})

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const getBaseName = (name) => name.replace(/\.[^.]+$/, '')

export const formatBytes = (bytes) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const revokeObjectUrl = (url) => {
  if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const fitSize = (sourceW, sourceH, targetW, targetH, mode = 'contain', focus = 'center') => {
  const focusMap = {
    top: { x: 0.5, y: 0 },
    bottom: { x: 0.5, y: 1 },
    left: { x: 0, y: 0.5 },
    right: { x: 1, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
  }
  const point = focusMap[focus] || focusMap.center

  if (mode === 'cover') {
    const ratio = Math.max(targetW / sourceW, targetH / sourceH)
    const w = Math.round(sourceW * ratio)
    const h = Math.round(sourceH * ratio)
    return {
      w,
      h,
      x: Math.round((targetW - w) * point.x),
      y: Math.round((targetH - h) * point.y),
    }
  }

  const ratio = Math.min(targetW / sourceW, targetH / sourceH)
  const w = Math.round(sourceW * ratio)
  const h = Math.round(sourceH * ratio)
  return {
    w,
    h,
    x: Math.round((targetW - w) / 2),
    y: Math.round((targetH - h) / 2),
  }
}
