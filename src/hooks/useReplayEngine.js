import { useState, useEffect, useRef, useCallback } from 'react'

const TEAM_COLORS = {
  'Red Bull Racing': '#3671C6', 'Red Bull': '#3671C6',
  'Mercedes': '#27F4D2', 'Ferrari': '#E8002D',
  'McLaren': '#FF8000', 'Aston Martin': '#229971',
  'Alpine': '#FF87BC', 'Williams': '#64C4FF',
  'Racing Bulls': '#6692FF', 'RB': '#6692FF', 'RB F1 Team': '#6692FF',
  'Haas F1 Team': '#B6BABD', 'Haas': '#B6BABD',
  'Kick Sauber': '#52E252', 'Sauber': '#52E252',
}

function getTeamColor(teamName) {
  if (!teamName) return '#FFFFFF'
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (teamName.includes(key) || key.includes(teamName)) return color
  }
  return '#FFFFFF'
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function openf1Get(path) {
  const base = '/api/openf1'
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`OpenF1 ${res.status}: ${path}`)
  return res.json()
}

// Normalize raw meter coords to 0-1 using provided bounds
function normalizePt(x, y, minX, minY, rangeX, rangeY) {
  return { nx: (x - minX) / rangeX, ny: (y - minY) / rangeY }
}

export function useReplayEngine(sessionKey) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [currentLap, setCurrentLap] = useState(1)
  const [totalLaps, setTotalLaps] = useState(0)
  const [drivers, setDrivers] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [trackPoints, setTrackPoints] = useState([])
  const [loadingLap, setLoadingLap] = useState(false)

  const driverInfoRef = useRef({})
  const lapFramesRef = useRef({})      // lap → [{ts, positions: {num: {nx,ny}}}]
  const loadedLapsRef = useRef(new Set())
  const boundsRef = useRef(null)       // {minX, minY, rangeX, rangeY}
  const startTimeRef = useRef(0)
  const lapTimestampsRef = useRef([])  // [{lap, ts_ms}]
  const speedRef = useRef(1)
  const playingRef = useRef(false)
  const rafRef = useRef(null)
  const lastRafTimeRef = useRef(null)
  const currentTimeRef = useRef(0)
  const totalTimeRef = useRef(0)
  const totalLapsRef = useRef(0)

  const setSpeed = useCallback((s) => { speedRef.current = s; setSpeedState(s) }, [])

  // Build leaderboard from current drivers
  const buildLeaderboard = useCallback((markers) => {
    setLeaderboard([...markers].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)))
  }, [])

  // Render a specific time
  const renderTime = useCallback((timeSec) => {
    const absTs = startTimeRef.current + timeSec * 1000
    const lapTs = lapTimestampsRef.current

    // Find current lap
    let lap = 1
    for (let i = lapTs.length - 1; i >= 0; i--) {
      if (absTs >= lapTs[i].ts_ms) { lap = lapTs[i].lap; break }
    }
    setCurrentLap(lap)

    // Get frames for this lap
    const frames = lapFramesRef.current[lap]
    if (!frames?.length) return

    // Find closest frame by timestamp
    let lo = 0, hi = frames.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (frames[mid].ts < absTs) lo = mid + 1
      else hi = mid
    }
    const frame = frames[Math.min(lo, frames.length - 1)]

    const dMap = driverInfoRef.current
    const markers = Object.entries(frame.positions).map(([numStr, pos], i) => {
      const num = parseInt(numStr)
      const info = dMap[num] || {}
      return {
        abbr: info.name_acronym || `#${num}`,
        x: pos.nx,
        y: pos.ny,
        color: info.color || '#fff',
        position: pos.pos ?? (i + 1),
      }
    })
    setDrivers(markers)
    buildLeaderboard(markers)
  }, [buildLeaderboard])

  // Load location data for a specific lap
  const loadLap = useCallback(async (lap) => {
    if (loadedLapsRef.current.has(lap) || !boundsRef.current) return
    loadedLapsRef.current.add(lap) // mark immediately to prevent double-fetch
    setLoadingLap(true)

    try {
      const { minX, minY, rangeX, rangeY } = boundsRef.current
      const driverNums = Object.keys(driverInfoRef.current).map(Number)
      const lapTs = lapTimestampsRef.current.find(l => l.lap === lap)
      if (!lapTs) return

      // Fetch all drivers for this lap in parallel (single lap = small data)
      const results = await Promise.all(
        driverNums.map(num =>
          openf1Get(`/location?session_key=${sessionKey}&driver_number=${num}&lap_number=${lap}`)
            .catch(() => [])
        )
      )

      // Build timeline: merge all driver positions by timestamp
      const tsMap = {} // ts_ms → {num: {nx, ny}}
      driverNums.forEach((num, idx) => {
        const pts = results[idx].filter(p => p.x !== 0 || p.y !== 0)
        pts.forEach(p => {
          const ts = new Date(p.date).getTime()
          if (!tsMap[ts]) tsMap[ts] = {}
          const { nx, ny } = normalizePt(p.x, p.y, minX, minY, rangeX, rangeY)
          tsMap[ts][num] = { nx, ny }
        })
      })

      // Sort frames by timestamp, fill missing drivers from previous frame
      const sortedTs = Object.keys(tsMap).map(Number).sort((a, b) => a - b)
      const frames = []
      const lastPos = {}
      for (const ts of sortedTs) {
        const positions = { ...lastPos }
        Object.entries(tsMap[ts]).forEach(([num, pos]) => {
          positions[num] = pos
          lastPos[num] = pos
        })
        frames.push({ ts, positions })
      }

      lapFramesRef.current[lap] = frames
    } catch (err) {
      console.error('loadLap error:', err)
      loadedLapsRef.current.delete(lap) // allow retry
    } finally {
      setLoadingLap(false)
    }
  }, [sessionKey])

  // Preload next lap in background
  const preloadNextLap = useCallback((lap) => {
    const next = lap + 1
    if (next <= totalLapsRef.current && !loadedLapsRef.current.has(next)) {
      loadLap(next)
    }
  }, [loadLap])

  // RAF playback loop
  const tick = useCallback(() => {
    if (!playingRef.current) return
    const now = performance.now()
    if (lastRafTimeRef.current !== null) {
      const elapsed = (now - lastRafTimeRef.current) / 1000 * speedRef.current
      const next = Math.min(currentTimeRef.current + elapsed, totalTimeRef.current)
      currentTimeRef.current = next
      setCurrentTime(next)
      renderTime(next)
      if (next >= totalTimeRef.current) {
        playingRef.current = false
        setPlaying(false)
        return
      }
    }
    lastRafTimeRef.current = now
    rafRef.current = requestAnimationFrame(tick)
  }, [renderTime])

  // Initial load: drivers + laps + track outline only
  useEffect(() => {
    if (!sessionKey) return
    setStatus('loading')
    setError(null)

    const load = async () => {
      try {
        // 1. Drivers
        const driverData = await openf1Get(`/drivers?session_key=${sessionKey}`)
        const dMap = {}
        driverData.forEach(d => {
          dMap[d.driver_number] = {
            name_acronym: d.name_acronym,
            team_name: d.team_name,
            color: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name),
          }
        })
        driverInfoRef.current = dMap

        await delay(400)

        // 2. Laps for timeline
        const lapsData = await openf1Get(`/laps?session_key=${sessionKey}`)
        const maxLap = lapsData.length ? Math.max(...lapsData.map(l => l.lap_number)) : 0
        setTotalLaps(maxLap)
        totalLapsRef.current = maxLap

        const firstDriverNum = driverData[0]?.driver_number
        const firstDriverLaps = lapsData
          .filter(l => l.driver_number === firstDriverNum && l.date_start)
          .sort((a, b) => a.lap_number - b.lap_number)

        const lapTs = firstDriverLaps.map(l => ({
          lap: l.lap_number,
          ts_ms: new Date(l.date_start).getTime(),
        }))
        lapTimestampsRef.current = lapTs

        if (lapTs.length > 0) {
          startTimeRef.current = lapTs[0].ts_ms
          const lastLap = firstDriverLaps[firstDriverLaps.length - 1]
          const total = ((lastLap ? new Date(lastLap.date_start).getTime() : lapTs[lapTs.length - 1].ts_ms)
            - lapTs[0].ts_ms) / 1000 + (lastLap?.lap_duration || 90)
          setTotalTime(total)
          totalTimeRef.current = total
        }

        await delay(400)

        // 3. Track outline: fetch lap 1 for driver 1 only
        const trackRaw = await openf1Get(
          `/location?session_key=${sessionKey}&driver_number=${firstDriverNum}&lap_number=1`
        )
        const nonzero = trackRaw.filter(p => p.x !== 0 || p.y !== 0)

        if (nonzero.length > 0) {
          const xs = nonzero.map(p => p.x)
          const ys = nonzero.map(p => p.y)
          const minX = Math.min(...xs), maxX = Math.max(...xs)
          const minY = Math.min(...ys), maxY = Math.max(...ys)
          const rangeX = maxX - minX || 1
          const rangeY = maxY - minY || 1
          boundsRef.current = { minX, minY, rangeX, rangeY }
          // Sample every 3rd point for track outline
          setTrackPoints(
            nonzero.filter((_, i) => i % 3 === 0).map(p => ({
              x: (p.x - minX) / rangeX,
              y: (p.y - minY) / rangeY,
            }))
          )
        }

        setStatus('ready')

        // 4. Load lap 1 data immediately
        await loadLap(1)
        renderTime(0)
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }

    load()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [sessionKey, loadLap, renderTime])

  // When lap changes, ensure it's loaded and preload next
  useEffect(() => {
    if (status !== 'ready') return
    loadLap(currentLap)
    preloadNextLap(currentLap)
  }, [currentLap, status, loadLap, preloadNextLap])

  const play = useCallback(() => {
    if (currentTimeRef.current >= totalTimeRef.current) {
      currentTimeRef.current = 0; setCurrentTime(0)
    }
    playingRef.current = true
    lastRafTimeRef.current = null
    setPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const pause = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const seek = useCallback((timeSec) => {
    const t = Math.max(0, Math.min(timeSec, totalTimeRef.current))
    currentTimeRef.current = t
    setCurrentTime(t)
    renderTime(t)
  }, [renderTime])

  const seekToLap = useCallback((lap) => {
    const entry = lapTimestampsRef.current.find(l => l.lap === lap)
    if (!entry) return
    const t = (entry.ts_ms - startTimeRef.current) / 1000
    seek(t)
  }, [seek])

  const reset = useCallback(() => { pause(); seek(0) }, [pause, seek])

  return {
    status, error, loadingLap,
    playing, speed, setSpeed,
    currentTime, totalTime,
    currentLap, totalLaps,
    drivers, leaderboard, trackPoints,
    play, pause, seek, seekToLap, reset,
  }
}
