import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { Upload, Download, ZoomIn, Maximize2, Scale, Loader2, Sparkles, ChevronLeft, ChevronRight, X, Search } from 'lucide-react'

const SCALE_OPTIONS = [
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
  { value: 8, label: '8x' },
]

const TARGET_PRESETS = [
  { w: 1920, h: 1080, label: 'Full HD', ratio: '16:9' },
  { w: 2560, h: 1440, label: '2K', ratio: '16:9' },
  { w: 3840, h: 2160, label: '4K', ratio: '16:9' },
  { w: 7680, h: 4320, label: '8K', ratio: '16:9' },
]

// ------ Comparison Slider ------
function ComparisonSlider({ before, after }) {
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)

  const handleMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    setPos(Math.max(0, Math.min(100, (x / rect.width) * 100)))
  }, [])

  const handleStart = useCallback((e) => {
    setDragging(true)
    handleMove(e)
  }, [handleMove])

  const handleEnd = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [dragging, handleMove, handleEnd])

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl select-none bg-gray-100 cursor-ew-resize"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <img src={after} alt="放大后" className="w-full block" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="原图" className="w-full h-full block object-cover" draggable={false} />
      </div>
      <div className="absolute inset-y-0 pointer-events-none" style={{ left: `calc(${pos}% - 1px)` }}>
        <div className="w-0.5 h-full bg-white/90 shadow-md" />
        <div className="absolute top-1/2 -translate-y-1/2 -ml-3.5 w-7 h-11 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200">
          <ChevronLeft className="w-3 h-3 text-gray-500" />
          <ChevronRight className="w-3 h-3 text-gray-500" />
        </div>
      </div>
      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">原图</span>
      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">放大后</span>
    </div>
  )
}

// ------ Image Zoom Modal ------
function ImageZoom({ src, alt, onClose }) {
  const [zoomed, setZoomed] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)

  const handleWheel = useCallback((e) => {
    if (e.deltaY < 0) setZoomed(true)
    else setZoomed(false)
  }, [])

  const handleMouseDown = () => setPanning(true)
  const handleMouseUp = () => setPanning(false)
  const handleMouseMove = useCallback((e) => {
    if (!panning) return
    setPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }))
  }, [panning])

  useEffect(() => {
    if (!panning) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [panning, handleMouseMove])

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setZoomed(v => !v) }}
          className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div
        className="transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
        style={{ transform: zoomed ? `scale(2) translate(${pos.x}px, ${pos.y}px)` : 'scale(1)' }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" draggable={false} />
      </div>
      <div className="absolute bottom-4 text-white/50 text-xs">滚轮缩放 · 拖拽平移 · 点击空白关闭</div>
    </div>
  )
}

// ------ Main App ------
function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [origDims, setOrigDims] = useState(null)

  // Upscale controls
  const [upscaleMode, setUpscaleMode] = useState('scale')
  const [scale, setScale] = useState(2)
  const [targetMode, setTargetMode] = useState('preset')
  const [targetIdx, setTargetIdx] = useState(2)
  const [customW, setCustomW] = useState(2048)
  const [customH, setCustomH] = useState(2048)
  const [format, setFormat] = useState('png')
  const [keepRatio, setKeepRatio] = useState(true)
  const [enhance, setEnhance] = useState(true)

  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [result, setResult] = useState(null)
  const [resultDims, setResultDims] = useState(null)
  const [resultSize, setResultSize] = useState(null)
  const [error, setError] = useState(null)
  const [zoomImage, setZoomImage] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    setFile(f)
    setResult(null)
    setResultDims(null)
    setResultSize(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setOrigDims({ w: img.width, h: img.height })
        setCustomW(img.width)
        setCustomH(img.height)
        setPreview(e.target.result)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }, [handleFile])

  const handleRemove = useCallback((e) => {
    e.stopPropagation()
    setFile(null)
    setPreview(null)
    setOrigDims(null)
    setResult(null)
    setResultDims(null)
    setResultSize(null)
  }, [])

  const targetDims = useMemo(() => {
    if (upscaleMode === 'scale') return null
    if (targetMode === 'custom') return { w: parseInt(customW) || 0, h: parseInt(customH) || 0 }
    return TARGET_PRESETS[targetIdx]
  }, [upscaleMode, targetMode, targetIdx, customW, customH])

  const expectedOutput = useMemo(() => {
    if (!origDims) return null
    let w, h
    if (upscaleMode === 'scale') {
      w = Math.round(origDims.w * scale)
      h = Math.round(origDims.h * scale)
    } else if (targetDims) {
      if (keepRatio) {
        const r = Math.min(targetDims.w / origDims.w, targetDims.h / origDims.h)
        w = Math.round(origDims.w * r)
        h = Math.round(origDims.h * r)
      } else {
        w = targetDims.w
        h = targetDims.h
      }
    } else return null
    if (w > 10000 || h > 10000) {
      const r = Math.min(10000 / w, 10000 / h)
      w = Math.round(w * r)
      h = Math.round(h * r)
    }
    if (format === 'jpeg') { w += w & 1; h += h & 1 }
    return { w, h }
  }, [origDims, upscaleMode, scale, targetDims, keepRatio, format])

  const handleProcess = async () => {
    if (!preview) return
    setProcessing(true)
    setProgress(0)
    setProgressText('正在准备...')
    setError(null)
    setResult(null)
    
    // 进度动画 - 模拟处理进度
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        // 前10%快速，后面慢速渐进
        const increment = prev < 10 ? 5 : prev < 50 ? 2 : prev < 70 ? 1 : 0.5
        return Math.min(prev + increment, 90)
      })
      setProgressText(prev => {
        // 根据进度更新状态文字
        if (progress < 5) return '正在准备...'
        if (progress < 15) return '正在上传图片...'
        if (progress < 30) return '正在分析原图...'
        if (progress < 60) return '正在多级放大处理...'
        if (progress < 80) return '正在优化画质...'
        return '即将完成...'
      })
    }, 200)
    
    try {
      const base64 = preview.split(',')[1]
      const body = {
        image: base64,
        format,
        mode: upscaleMode,
        enhance,
        fit: keepRatio ? 'inside' : 'fill',
        scale: upscaleMode === 'scale' ? scale : undefined,
        targetWidth: targetDims?.w,
        targetHeight: targetDims?.h,
      }

      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setProgress(95)
      setProgressText('正在生成结果...')
      setResult('data:image/' + data.format + ';base64,' + data.image)
      setResultDims({ w: data.width, h: data.height })
      const rawLen = data.image.length * 0.75
      setResultSize(
        rawLen < 1024 * 1024
          ? (rawLen / 1024).toFixed(1) + ' KB'
          : (rawLen / (1024 * 1024)).toFixed(1) + ' MB'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      clearInterval(progressInterval)
      setProgress(100)
      setProgressText('处理完成！')
      setTimeout(() => {
        setProcessing(false)
        setProgress(0)
        setProgressText('')
      }, 500)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    const name = file ? file.name.replace(/\.[^.]+$/, '') : 'image'
    a.download = `${name}_${resultDims ? resultDims.w + 'x' + resultDims.h : 'upscaled'}.${ext}`
    a.href = result
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-sm">
          <ZoomIn className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">图片放大工具</h1>
          <p className="text-xs text-gray-500">高清放大 · 专业 Lanczos 算法 · 支持 4K/8K</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Zone */}
        <section
          className={`bg-white rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/60'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50'
          }`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {preview ? (
            <div className="space-y-3">
              <img
                src={preview}
                alt="原图"
                className="max-h-48 mx-auto rounded-lg object-contain shadow-sm"
              />
              <div className="text-sm text-gray-500 space-y-0.5">
                <p>
                  {origDims.w}&times;{origDims.h}px &middot;{' '}
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <p className="text-xs text-gray-400 truncate max-w-md mx-auto">
                  {file.name}
                </p>
              </div>
              <button
                onClick={handleRemove}
                className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
              >
                删除重选
              </button>
            </div>
          ) : (
            <div className="text-gray-400">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">点击或拖拽上传图片</p>
              <p className="text-xs mt-1 text-gray-400">支持 JPG / PNG / WebP</p>
            </div>
          )}
        </section>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {[
              { value: 'scale', label: '按倍数放大', icon: Scale },
              { value: 'target', label: '按目标分辨率', icon: Maximize2 },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setUpscaleMode(opt.value)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                  upscaleMode === opt.value
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Scale options */}
          {upscaleMode === 'scale' && (
            <div className="grid grid-cols-3 gap-2">
              {SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScale(opt.value)}
                  className={`py-3 px-4 rounded-lg text-sm font-bold border transition-all ${
                    scale === opt.value
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500/30'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Target resolution */}
          {upscaleMode === 'target' && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetMode('preset')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    targetMode === 'preset'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  预设分辨率
                </button>
                <button
                  onClick={() => setTargetMode('custom')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    targetMode === 'custom'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  自定义
                </button>
              </div>

              {targetMode === 'preset' ? (
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_PRESETS.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setTargetIdx(i)}
                      className={`py-3 px-4 rounded-lg text-sm border text-left transition-all ${
                        targetIdx === i
                          ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`font-bold ${targetIdx === i ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {opt.label}
                      </div>
                      <div className={`text-xs mt-0.5 ${targetIdx === i ? 'text-indigo-500' : 'text-gray-400'}`}>
                        {keepRatio ? `${opt.w}\u00d7${opt.h}（最大）` : `${opt.w}\u00d7${opt.h}`} &middot; {opt.ratio}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">宽度 (px)</label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={customW}
                      onChange={(e) => setCustomW(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                  <div className="text-gray-400 pb-2 font-mono">&times;</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">高度 (px)</label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={customH}
                      onChange={(e) => setCustomH(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Options row */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">格式</span>
              <div className="flex gap-1">
                {[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, { value: 'webp', label: 'WEBP' }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                      format === opt.value
                        ? 'bg-gray-100 border-gray-400 text-gray-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepRatio}
                  onChange={(e) => setKeepRatio(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                保持比例
              </label>
              <label className="flex items-center gap-1.5 text-sm text-indigo-600 cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={enhance}
                  onChange={(e) => setEnhance(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Sparkles className="w-3.5 h-3.5" />
                增强画质
              </label>
            </div>
          </div>

          {upscaleMode === 'target' && !keepRatio && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400 text-white text-[8px] leading-3 text-center font-bold">!</span>
              关闭保持比例可能导致图片拉伸变形
            </p>
          )}

          {/* Expected output */}
          {expectedOutput && (
            <div className="bg-gradient-to-r from-gray-50 to-indigo-50/50 rounded-lg px-4 py-2.5 text-xs text-gray-600 flex items-center justify-between flex-wrap gap-2">
              <span>
                输出：<strong className="text-indigo-700">{expectedOutput.w}&times;{expectedOutput.h}px</strong>
                {enhance && <span className="text-indigo-500 ml-2">&middot; 多级放大 + 智能锐化</span>}
              </span>
              {resultDims && (
                <span className="text-gray-400">
                  实际：<strong className="text-indigo-600">{resultDims.w}&times;{resultDims.h}px</strong>
                </span>
              )}
            </div>
          )}

          {/* 进度条 */}
          {processing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{progressText}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Process button */}
          <button
            onClick={handleProcess}
            disabled={!preview || processing}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 active:from-indigo-800 active:to-indigo-700 disabled:from-indigo-300 disabled:to-indigo-300 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:shadow-none"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 处理中...</>
            ) : (
              <><ZoomIn className="w-4 h-4" /> 开始放大</>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">处理结果</h2>
              <div className="text-xs text-gray-500 text-right leading-relaxed">
                <div>
                  {origDims.w}&times;{origDims.h} &rarr;{' '}
                  <strong className="text-indigo-600">{resultDims.w}&times;{resultDims.h}</strong>
                </div>
                <div className="text-gray-400">
                  {(resultDims.w / origDims.w).toFixed(1)}x &middot; {resultSize}
                </div>
              </div>
            </div>

            <ComparisonSlider before={preview} after={result} />

            <div className="flex gap-2">
              <button
                onClick={() => setZoomImage(result)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" /> 查看细节
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> 下载
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>多级放大</strong>：大倍数时自动分阶段放大，每级中间做锐化，减少锯齿和模糊
            </li>
            <li>
              <strong>增强画质</strong>：启用 Lanczos 重采样 + 自适应锐化，提升放大后的清晰度
            </li>
            <li>注意：放大算法无法凭空增加细节，原图质量越好，放大效果越佳</li>
          </ul>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 mt-8">
        图片放大工具 &middot; 基于 Sharp 引擎
      </footer>

      {zoomImage && (
        <ImageZoom src={zoomImage} alt="放大结果" onClose={() => setZoomImage(null)} />
      )}
    </div>
  )
}

export default App
