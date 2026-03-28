import { useRef, useEffect } from 'react'
import { drawTrack, drawDrivers } from '../../lib/trackRenderer'

const BASE_INTERP_MS = 750

export default function TrackCanvas({ trackPoints, drivers, highlightedDrivers = [], playbackSpeed = 1, showDriverNames = true }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const posRef = useRef(new Map())
  const driversRef = useRef([])
  const speedRef = useRef(playbackSpeed)
  speedRef.current = playbackSpeed
  const showNamesRef = useRef(showDriverNames)
  showNamesRef.current = showDriverNames

  // Update interpolation targets when drivers change
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
      drawTrack(ctx, trackPoints, w, h, 0, 'green')
      const now = performance.now()
      const interpolated = driversRef.current.map(drv => {
        const entry = posRef.current.get(drv.abbr)
        if (!entry) return drv
        const elapsed = now - entry.startTime
        const t = Math.min(elapsed / entry.duration, 1)
        return { ...drv, x: entry.prevX + (entry.targetX - entry.prevX) * t, y: entry.prevY + (entry.targetY - entry.prevY) * t }
      })
      drawDrivers(ctx, interpolated, trackPoints, w, h, 0, highlightedDrivers, showNamesRef.current)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
    return () => { running = false }
  }, [trackPoints, highlightedDrivers])

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
