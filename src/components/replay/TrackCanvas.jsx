import { useRef, useEffect } from 'react'
import { drawTrack, drawDrivers } from '../../lib/trackRenderer'

const BASE_INTERP_MS = 750

// Draw a pulsing ring around a driver to indicate overtake
function drawOvertakeRing(ctx, x, y, color, progress) {
  const radius = 10 + progress * 20
  const alpha = 1 - progress
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.globalAlpha = alpha
  ctx.stroke()
  ctx.restore()
}

export default function TrackCanvas({
  trackPoints,
  drivers,
  highlightedDrivers = [],
  playbackSpeed = 1,
  showDriverNames = true,
  overtakeFlashes = [], // [{abbr, color, startTime}]
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const posRef = useRef(new Map())
  const driversRef = useRef([])
  const speedRef = useRef(playbackSpeed)
  speedRef.current = playbackSpeed
  const showNamesRef = useRef(showDriverNames)
  showNamesRef.current = showDriverNames
  const highlightedRef = useRef(highlightedDrivers)
  highlightedRef.current = highlightedDrivers
  const overtakeRef = useRef(overtakeFlashes)
  overtakeRef.current = overtakeFlashes

  // Update interpolation targets
  useEffect(() => {
    driversRef.current = drivers
    const now = performance.now()
    const duration = BASE_INTERP_MS / Math.max(speedRef.current, 0.25)
    for (const drv of drivers) {
      const entry = posRef.current.get(drv.abbr)
      if (!entry) {
        posRef.current.set(drv.abbr, { prevX: drv.x, prevY: drv.y, targetX: drv.x, targetY: drv.y, startTime: now, duration })
      } else {
        const elapsed = now - entry.startTime
        const t = Math.min(elapsed / entry.duration, 1)
        entry.prevX = entry.prevX + (entry.targetX - entry.prevX) * t
        entry.prevY = entry.prevY + (entry.targetY - entry.prevY) * t
        entry.targetX = drv.x
        entry.targetY = drv.y
        entry.startTime = now
        entry.duration = duration
      }
    }
  }, [drivers])

  // Animation loop
  useEffect(() => {
    let running = true

    function toScreenCoords(nx, ny, trackPts, w, h) {
      // Replicate the coordinate transform from trackRenderer
      const padX = 40, padTop = 60, padBottom = 90
      const tw = w - padX * 2
      const th = h - padTop - padBottom
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const p of trackPts) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      }
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1
      const scale = Math.min(tw / rangeX, th / rangeY)
      const offsetX = padX + (tw - rangeX * scale) / 2
      const offsetY = padTop + (th - rangeY * scale) / 2
      return {
        sx: offsetX + (nx - minX) * scale,
        sy: offsetY + (maxY - ny) * scale,
      }
    }

    function animate() {
      if (!running) return
      const canvas = canvasRef.current
      if (!canvas) { requestAnimationFrame(animate); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { requestAnimationFrame(animate); return }
      const dpr = window.devicePixelRatio || 1
      const { w, h } = sizeRef.current
      if (w === 0 || h === 0) { requestAnimationFrame(animate); return }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const now = performance.now()
      const highlighted = highlightedRef.current

      // Interpolate all driver positions
      const interpolated = driversRef.current.map(drv => {
        const entry = posRef.current.get(drv.abbr)
        if (!entry) return drv
        const elapsed = now - entry.startTime
        const t = Math.min(elapsed / entry.duration, 1)
        return { ...drv, x: entry.prevX + (entry.targetX - entry.prevX) * t, y: entry.prevY + (entry.targetY - entry.prevY) * t }
      })

      // Battle view: if exactly 2 highlighted, zoom to them
      const battleMode = highlighted.length === 2
      const battleDrivers = battleMode ? interpolated.filter(d => highlighted.includes(d.abbr)) : []

      if (battleMode && battleDrivers.length === 2 && trackPoints.length > 0) {
        const [a, b] = battleDrivers
        // Get screen coords of both drivers
        const sa = toScreenCoords(a.x, a.y, trackPoints, w, h)
        const sb = toScreenCoords(b.x, b.y, trackPoints, w, h)
        const cx = (sa.sx + sb.sx) / 2
        const cy = (sa.sy + sb.sy) / 2
        const dist = Math.sqrt((sa.sx - sb.sx) ** 2 + (sa.sy - sb.sy) ** 2)
        const zoom = Math.min(4, Math.max(1.5, Math.min(w, h) / (dist + 120)))

        ctx.save()
        ctx.translate(w / 2, h / 2)
        ctx.scale(zoom, zoom)
        ctx.translate(-cx, -cy)
        drawTrack(ctx, trackPoints, w, h, 0, 'green')
        drawDrivers(ctx, interpolated, trackPoints, w, h, 0, highlighted, showNamesRef.current)
        // Overtake rings
        const wallTime = Date.now()
        for (const flash of overtakeRef.current) {
          const driver = interpolated.find(d => d.abbr === flash.abbr)
          if (!driver) continue
          const sc = toScreenCoords(driver.x, driver.y, trackPoints, w, h)
          const elapsed = (wallTime - flash.startTime) / 800
          if (elapsed < 1) drawOvertakeRing(ctx, sc.sx, sc.sy, flash.color, elapsed)
        }
        ctx.restore()

        // Battle view label
        ctx.fillStyle = 'rgba(225,6,0,0.9)'
        ctx.font = 'bold 10px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(`⚔ BATTLE VIEW`, w / 2, h - 12)
      } else {
        drawTrack(ctx, trackPoints, w, h, 0, 'green')
        drawDrivers(ctx, interpolated, trackPoints, w, h, 0, highlighted, showNamesRef.current)
        // Overtake rings
        const wallTime = Date.now()
        for (const flash of overtakeRef.current) {
          const driver = interpolated.find(d => d.abbr === flash.abbr)
          if (!driver) continue
          const sc = toScreenCoords(driver.x, driver.y, trackPoints, w, h)
          const elapsed = (wallTime - flash.startTime) / 800
          if (elapsed < 1) drawOvertakeRing(ctx, sc.sx, sc.sy, flash.color, elapsed)
        }
      }

      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
    return () => { running = false }
  }, [trackPoints])

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    sizeRef.current = { w: rect.width, h: rect.height }
    const observer = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) sizeRef.current = { w: e.contentRect.width, h: e.contentRect.height }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: '#0a0a0f' }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
