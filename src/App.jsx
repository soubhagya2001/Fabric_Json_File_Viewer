import { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import './App.css'

/* ── colour helpers ── */
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`
const PALETTE = [
  '#6c63ff', '#ff6584', '#43e5c2', '#f7b731', '#fd9644',
  '#45aaf2', '#a55eea', '#26de81', '#fc5c65', '#4ecdc4',
]

/* ── build fabric objects from the ImageMagick JSON metadata ── */
function buildCanvasObjects(canvas, jsonData) {
  canvas.clear()

  const entry = Array.isArray(jsonData) ? jsonData[0] : jsonData
  const img = entry?.image
  if (!img) return

  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const pad = 32

  /* ── background gradient ── */
  const bg = new fabric.Rect({
    left: 0, top: 0, width: cw, height: ch,
    fill: new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: cw, y2: ch },
      colorStops: [
        { offset: 0, color: '#0f0c29' },
        { offset: 0.5, color: '#302b63' },
        { offset: 1, color: '#24243e' },
      ],
    }),
    selectable: false, evented: false,
  })
  canvas.add(bg)

  /* ── title card ── */
  const titleBg = new fabric.Rect({
    left: pad, top: pad, width: cw - pad * 2, height: 70,
    rx: 12, ry: 12,
    fill: 'rgba(108,99,255,0.25)',
    stroke: '#6c63ff', strokeWidth: 1.5,
    selectable: false, evented: false,
    shadow: new fabric.Shadow({ color: '#6c63ff55', blur: 20 }),
  })
  canvas.add(titleBg)

  const title = new fabric.Text(img.baseName || 'SVG File', {
    left: pad + 20, top: pad + 12,
    fontSize: 22, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
    fill: '#ffffff',
    selectable: false, evented: false,
  })
  canvas.add(title)

  const subtitle = new fabric.Text(`${img.format}  •  ${img.mimeType}  •  ${img.colorspace}`, {
    left: pad + 20, top: pad + 40,
    fontSize: 12, fontFamily: 'Inter, sans-serif',
    fill: '#a0a8d4',
    selectable: false, evented: false,
  })
  canvas.add(subtitle)

  /* ── geometry card ── */
  const geo = img.geometry || {}
  const geoCard = makeCard(canvas, pad, pad + 90, (cw - pad * 2) / 2 - 8, 130,
    '📐  Geometry', [
      `Width:   ${geo.width ?? '—'} px`,
      `Height:  ${geo.height ?? '—'} px`,
      `X / Y:   ${geo.x ?? 0} / ${geo.y ?? 0}`,
    ], 0)

  /* ── resolution card ── */
  const res = img.resolution || {}
  makeCard(canvas, pad + (cw - pad * 2) / 2 + 8, pad + 90, (cw - pad * 2) / 2 - 8, 130,
    '🔍  Resolution', [
      `X: ${res.x ?? '—'}`,
      `Y: ${res.y ?? '—'}`,
      `Units: ${img.units ?? '—'}`,
    ], 2)

  /* ── image stats bars ── */
  const stats = img.imageStatistics?.Overall || {}
  const statsY = pad + 90 + 130 + 16
  makeStatsPanel(canvas, pad, statsY, cw - pad * 2, 160, stats)

  /* ── channel stats mini-bars ── */
  const chY = statsY + 160 + 16
  const channels = img.channelStatistics || {}
  makeMiniChannelBars(canvas, pad, chY, cw - pad * 2, channels)

  /* ── properties / metadata card ── */
  const propsY = chY + 110 + 16
  const props = img.properties || {}
  const propLines = Object.entries(props).slice(0, 6).map(([k, v]) => `${k}: ${String(v).slice(0, 48)}`)
  makeCard(canvas, pad, propsY, (cw - pad * 2) * 0.55, 180,
    '🏷️  Properties', propLines, 4)

  /* ── misc badges ── */
  makeBadges(canvas, pad + (cw - pad * 2) * 0.55 + 12, propsY, img)

  canvas.renderAll()
}

/* ──────── helper: card ──────── */
function makeCard(canvas, x, y, w, h, header, lines, colorIdx) {
  const accent = PALETTE[colorIdx % PALETTE.length]
  const bg = new fabric.Rect({
    left: x, top: y, width: w, height: h,
    rx: 10, ry: 10,
    fill: 'rgba(255,255,255,0.05)',
    stroke: accent, strokeWidth: 1,
    selectable: false, evented: false,
    shadow: new fabric.Shadow({ color: accent + '33', blur: 12 }),
  })
  canvas.add(bg)

  const hdr = new fabric.Text(header, {
    left: x + 14, top: y + 10,
    fontSize: 13, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
    fill: accent,
    selectable: false, evented: false,
  })
  canvas.add(hdr)

  lines.forEach((line, i) => {
    const t = new fabric.Text(line, {
      left: x + 14, top: y + 32 + i * 22,
      fontSize: 12, fontFamily: 'Inter, sans-serif',
      fill: '#d0d6f9',
      selectable: false, evented: false,
    })
    canvas.add(t)
  })
}

/* ──────── helper: stats panel with animated bars ──────── */
function makeStatsPanel(canvas, x, y, w, h, stats) {
  const accent = '#43e5c2'
  const bg = new fabric.Rect({
    left: x, top: y, width: w, height: h,
    rx: 10, ry: 10,
    fill: 'rgba(255,255,255,0.05)',
    stroke: accent, strokeWidth: 1,
    selectable: false, evented: false,
    shadow: new fabric.Shadow({ color: '#43e5c233', blur: 12 }),
  })
  canvas.add(bg)

  const hdr = new fabric.Text('📊  Image Statistics', {
    left: x + 14, top: y + 10,
    fontSize: 13, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
    fill: accent, selectable: false, evented: false,
  })
  canvas.add(hdr)

  const fields = [
    { label: 'Min', value: stats.min, max: 65535, color: '#fc5c65' },
    { label: 'Max', value: stats.max, max: 65535, color: '#26de81' },
    { label: 'Mean', value: stats.mean, max: 65535, color: '#45aaf2' },
    { label: 'Std Dev', value: stats.standardDeviation, max: 10000, color: '#f7b731' },
  ]

  const barW = w - 28 - 80
  fields.forEach((f, i) => {
    const rowY = y + 36 + i * 28
    const label = new fabric.Text(`${f.label}:`, {
      left: x + 14, top: rowY,
      fontSize: 11, fontFamily: 'Inter, sans-serif',
      fill: '#a0a8d4', width: 70,
      selectable: false, evented: false,
    })
    canvas.add(label)

    const ratio = Math.min((f.value ?? 0) / f.max, 1)
    const trackBg = new fabric.Rect({
      left: x + 88, top: rowY + 4, width: barW, height: 10,
      rx: 5, ry: 5, fill: 'rgba(255,255,255,0.08)',
      selectable: false, evented: false,
    })
    canvas.add(trackBg)

    const fill = new fabric.Rect({
      left: x + 88, top: rowY + 4, width: Math.max(barW * ratio, 4), height: 10,
      rx: 5, ry: 5, fill: f.color,
      selectable: false, evented: false,
      shadow: new fabric.Shadow({ color: f.color + '88', blur: 6 }),
    })
    canvas.add(fill)

    const val = new fabric.Text(String(Math.round(f.value ?? 0)), {
      left: x + 88 + barW + 8, top: rowY,
      fontSize: 11, fontFamily: 'Inter, sans-serif',
      fill: f.color, selectable: false, evented: false,
    })
    canvas.add(val)
  })

  // entropy
  const entropy = stats.entropy ?? 0
  const eLabel = new fabric.Text(`Entropy: ${entropy.toFixed(4)}`, {
    left: x + 14, top: y + h - 28,
    fontSize: 11, fontFamily: 'Inter, sans-serif',
    fill: '#a55eea', selectable: false, evented: false,
  })
  canvas.add(eLabel)
}

/* ──────── helper: channel mini-bars (R/G/B/Alpha) ──────── */
function makeMiniChannelBars(canvas, x, y, w, channels) {
  const h = 100
  const cols = Object.keys(channels)
  const colW = w / (cols.length || 1)
  const colors = { red: '#fc5c65', green: '#26de81', blue: '#45aaf2', alpha: '#f7b731' }

  const bg = new fabric.Rect({
    left: x, top: y, width: w, height: h,
    rx: 10, ry: 10,
    fill: 'rgba(255,255,255,0.04)',
    stroke: '#fd9644', strokeWidth: 1,
    selectable: false, evented: false,
  })
  canvas.add(bg)

  const hdr = new fabric.Text('🎨  Channel Statistics', {
    left: x + 14, top: y + 8,
    fontSize: 13, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
    fill: '#fd9644', selectable: false, evented: false,
  })
  canvas.add(hdr)

  cols.forEach((ch, i) => {
    const cx = x + i * colW + colW / 2
    const chData = channels[ch]
    const mean = chData?.mean ?? 0
    const maxVal = 65535
    const ratio = Math.min(mean / maxVal, 1)
    const barH = Math.max(ratio * 40, 4)
    const barTop = y + 75 - barH
    const clr = colors[ch] || '#ffffff'

    const bar = new fabric.Rect({
      left: cx - 12, top: barTop, width: 24, height: barH,
      rx: 4, ry: 4, fill: clr,
      selectable: false, evented: false,
      shadow: new fabric.Shadow({ color: clr + '88', blur: 8 }),
    })
    canvas.add(bar)

    const lbl = new fabric.Text(ch.slice(0, 5), {
      left: cx - 20, top: y + 78,
      fontSize: 10, fontFamily: 'Inter, sans-serif',
      fill: clr, selectable: false, evented: false,
    })
    canvas.add(lbl)
  })
}

/* ──────── helper: misc badges ──────── */
function makeBadges(canvas, x, y, img) {
  const items = [
    { label: 'Filesize', value: img.filesize ?? '—', color: '#6c63ff' },
    { label: 'Pixels', value: img.numberPixels ?? '—', color: '#ff6584' },
    { label: 'Compression', value: img.compression ?? '—', color: '#43e5c2' },
    { label: 'Depth', value: `${img.depth ?? '—'} bit`, color: '#f7b731' },
    { label: 'Type', value: img.type ?? '—', color: '#fd9644' },
  ]

  items.forEach((item, i) => {
    const bx = x + (i % 2) * 130
    const by = y + Math.floor(i / 2) * 52

    const badgeBg = new fabric.Rect({
      left: bx, top: by, width: 120, height: 42,
      rx: 8, ry: 8,
      fill: item.color + '22',
      stroke: item.color, strokeWidth: 1,
      selectable: false, evented: false,
    })
    canvas.add(badgeBg)

    const lbl = new fabric.Text(item.label, {
      left: bx + 8, top: by + 5,
      fontSize: 9, fontFamily: 'Inter, sans-serif',
      fill: item.color + 'cc', selectable: false, evented: false,
    })
    canvas.add(lbl)

    const val = new fabric.Text(String(item.value).slice(0, 16), {
      left: bx + 8, top: by + 20,
      fontSize: 13, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
      fill: '#ffffff', selectable: false, evented: false,
    })
    canvas.add(val)
  })
}

function fitAllObjectsToViewport(canvas) {
  const objects = canvas.getObjects()
  if (!objects.length) return

  const bounds = objects.reduce(
    (acc, obj) => {
      const rect = obj.getBoundingRect()
      return {
        left: Math.min(acc.left, rect.left),
        top: Math.min(acc.top, rect.top),
        right: Math.max(acc.right, rect.left + rect.width),
        bottom: Math.max(acc.bottom, rect.top + rect.height),
      }
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  )

  const contentW = bounds.right - bounds.left
  const contentH = bounds.bottom - bounds.top
  if (contentW <= 0 || contentH <= 0) return

  const pad = 28
  const targetW = canvas.getWidth() - pad * 2
  const targetH = canvas.getHeight() - pad * 2
  const scale = Math.min(targetW / contentW, targetH / contentH, 1)

  const dx = (canvas.getWidth() - contentW * scale) / 2 - bounds.left * scale
  const dy = (canvas.getHeight() - contentH * scale) / 2 - bounds.top * scale

  objects.forEach((obj) => {
    obj.set({
      left: (obj.left ?? 0) * scale + dx,
      top: (obj.top ?? 0) * scale + dy,
      scaleX: (obj.scaleX ?? 1) * scale,
      scaleY: (obj.scaleY ?? 1) * scale,
    })
    obj.setCoords()
  })
}

/* ═══════════ React Component ═══════════ */
export default function App() {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const fileInputRef = useRef(null)
  const svgInputRef = useRef(null)

  const [fileName, setFileName] = useState('')
  const [jsonData, setJsonData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)

  /* ── init fabric canvas ── */
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 860,
      height: 820,
      backgroundColor: '#ffffff',
      selection: false,
    })
    fabricRef.current = canvas
    return () => canvas.dispose()
  }, [])

/* ── render whenever data changes ── */
useEffect(() => {
  const canvas = fabricRef.current
  if (!canvas || !jsonData) return

  let cancelled = false

  const renderData = async () => {
    canvas.clear()
    canvas.backgroundColor = '#ffffff'

    if (jsonData.objects && Array.isArray(jsonData.objects)) {
      try {
        // Fabric v7 loadFromJSON is promise-based.
        await canvas.loadFromJSON(jsonData)
        if (cancelled) return

        fitAllObjectsToViewport(canvas)

        canvas.requestRenderAll()
      } catch (err) {
        console.error('loadFromJSON failed:', err)
        setError('Failed to load JSON (version mismatch?)')
      }
      return
    }

    // ImageMagick metadata path
    buildCanvasObjects(canvas, jsonData)
  }

  renderData()

  return () => {
    cancelled = true
  }
}, [jsonData])

  /* ── zoom support ── */
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setZoom(zoom)
    canvas.setDimensions({ width: 860 * zoom, height: 820 * zoom })
    canvas.requestRenderAll()
  }, [zoom])

  /* ── load user file ── */
  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        setFileName(file.name)
        setJsonData(parsed)
      } catch {
        setError('❌ Invalid JSON file — could not parse.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  /* ── load SVG and convert to JSON ── */
/* ── load SVG and convert to proper Fabric JSON ── */
const handleSvgInput = useCallback((e) => {
  const file = e.target.files?.[0]
  if (!file) return

  setError('')
  const reader = new FileReader()

  reader.onload = async (ev) => {
    try {
      const svgString = ev.target.result

      // Parse SVG into Fabric objects
      const { objects, options } = await fabric.loadSVGFromString(svgString)

      if (!objects || !objects.length) {
        throw new Error('No objects parsed from SVG')
      }

      // Group them (preserves viewBox, scaling, etc.)
      const group = fabric.util.groupSVGElements(objects, options)
      const maxW = 860 * 0.86
      const maxH = 820 * 0.86
      const safeW = group.width || 1
      const safeH = group.height || 1
      const fitScale = Math.min(maxW / safeW, maxH / safeH, 1)
      group.scale(fitScale)
      group.set({
        left: 860 / 2,
        top: 820 / 2,
        originX: 'center',
        originY: 'center',
      })
      group.setCoords()

      // Create a temporary canvas just for serialization
      const tempEl = document.createElement('canvas')
      const tempCanvas = new fabric.Canvas(tempEl, {
        width: 860,
        height: 820,
        backgroundColor: '#ffffff',
      })

      tempCanvas.add(group)
      tempCanvas.centerObject(group)

      // IMPORTANT: Wait for all images to load before exporting JSON
      await new Promise((resolve) => {
        const waitForImages = () => {
          const allLoaded = tempCanvas.getObjects().every((obj) => {
            if (obj.type === 'image') {
              return obj._element && !obj._element.complete === false // check if loaded
            }
            return true
          })
          if (allLoaded) {
            resolve()
          } else {
            setTimeout(waitForImages, 50)
          }
        }
        waitForImages()
      })

      // Now safely export to JSON (this gives you a clean Fabric JSON without raw <svg> markup)
      const generatedJson = tempCanvas.toJSON(['src', 'crossOrigin']) // include important image props

      tempCanvas.dispose()

      setFileName(file.name)
      setJsonData(generatedJson)

      console.log('SVG → Fabric JSON conversion successful', generatedJson)
    } catch (err) {
      console.error('SVG conversion error:', err)
      setError('❌ Failed to parse SVG. It may contain unsupported elements.')
    }
  }

  reader.readAsText(file)
  e.target.value = ''
}, [])

  /* ── export canvas as JSON ── */
  const exportJson = useCallback(() => {
    if (!fabricRef.current) return
    const jsonStr = JSON.stringify(fabricRef.current.toJSON(), null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName ? `${fileName.split('.')[0]}_export.json` : 'canvas_export.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [fileName])

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FabricJSON</span>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">Open File</p>
          <button className="open-btn" onClick={() => fileInputRef.current.click()} style={{ marginBottom: 8 }}>
            <span>📂</span> Browse JSON…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <button className="open-btn" onClick={() => svgInputRef.current.click()}>
            <span>🌍</span> Browse SVG…
          </button>
          <input
            ref={svgInputRef}
            type="file"
            accept=".svg"
            style={{ display: 'none' }}
            onChange={handleSvgInput}
          />
          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">Zoom</p>
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}>−</button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))}>+</button>
          </div>
          <button className="zoom-reset" onClick={() => setZoom(1)}>Reset</button>
        </div>

        {fileName && (
          <div className="sidebar-section file-info">
            <p className="sidebar-label">Loaded</p>
            <p className="file-name-display">{fileName}</p>
          </div>
        )}

        {jsonData && (
          <div className="sidebar-section">
            <p className="sidebar-label">Export</p>
            <button className="preset-btn" onClick={exportJson} style={{ justifyContent: 'center', borderColor: '#43e5c2' }}>
              <span>📥</span> Export to JSON
            </button>
          </div>
        )}
      </aside>

      {/* ── Main canvas area ── */}
      <main className="canvas-area">
        <header className="canvas-header">
          <h1 className="canvas-title">
            {fileName ? `Viewing: ${fileName}` : 'Select a JSON file to visualise'}
          </h1>
          <div className="header-badges">
            <span className="badge badge-purple">Fabric.js</span>
            <span className="badge badge-teal">SVG Metadata</span>
          </div>
        </header>

        <div className="canvas-scroll">
          <canvas ref={canvasRef} id="fabric-canvas" />

          {!jsonData && (
            <div className="empty-state">
              <div className="empty-icon">🗂️</div>
              <h2>No file loaded</h2>
              <p>Open a JSON or SVG file from the left panel to visualize it.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
