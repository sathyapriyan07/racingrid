import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

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

// Normalize raw OpenF1 meter coords to 0-1 range
function normalizePoints(points) {
  if (!points.length) return []
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  return points.map(p => ({
    ...p,
    nx: (p.x - minX) / rangeX,
    ny: (p.y - minY) / rangeY,
  }))
}

async function openf1Get(path) {
  const base = import.meta.env.DEV ? '/api/openf1' : '/api/openf1'
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`OpenF1 ${res.status}: ${path}`)
  return res.json()
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export function useReplayEngine(sessionKey) {
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [currentLap, setCurrentLap] = useState(1)
  const [totalLaps, setTotalLaps] = useState(0)
  const [drivers, setDrivers] = useState([]) // current frame DriverMarker[]
  const [leaderboard, setLeaderboard] = useState([]) // sorted by position
  const [trackPoints, setTrackPoints] = useState([]) // normalized TrackPoint[]

  // Raw data refs
  const allLocations = useRef({}) // driver_number → [{date, nx, ny, x, y}]
  const driverInfoRef = useRef({}) // driver_number → {name_acronym, team_name, color}
  const timelineRef = useRef([]) // sorted unique timestamps (ms from start)
  const startTimeRef = useRef(0)
  const speedRef = useRef(1)
  const playingRef = useRef(false)
  const rafRef = useRef(null)
  const lastRafTimeRef = useRef(null)
  const currentTimeRef = useRef(0)
  const lapTimestampsRef = useRef([]) // [{lap, timestamp_ms}]

  const setSpeed = useCallback((s) => {
    speedRef.current = s
    setSpeedState(s)
  }, [])

  // Load all data
  useEffect(() => {
    if (!sessionKey) return
    setStatus('loading')
    setError(null)

    const load = async () => {
      try {
        // 1. Fetch driver info
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

        await delay(300)

        // 2. Fetch laps to get lap timestamps
        const lapsData = await openf1Get(`/laps?session_key=${sessionKey}`)
        const maxLap = lapsData.length ? Math.max(...lapsData.map(l => l.lap_number)) : 0
        setTotalLaps(maxLap)

        // Build lap start timestamps from first driver's laps
        const firstDriverNum = driverData[0]?.driver_number
        const firstDriverLaps = lapsData
          .filter(l => l.driver_number === firstDriverNum && l.date_start)
          .sort((a, b) => a.lap_number - b.lap_number)

        const lapTs = firstDriverLaps.map(l => ({
          lap: l.lap_number,
          timestamp_ms: new Date(l.date_start).getTime(),
        }))
        lapTimestampsRef.current = lapTs

        await delay(300)

        // 3. Fetch location data for all drivers (sample: every 3rd point to reduce memory)
        const driverNums = driverData.map(d => d.driver_number)
        const locResults = {}

        // Fetch in batches of 5 to avoid rate limiting
        for (let i = 0; i < driverNums.length; i += 5) {
          const batch = driverNums.slice(i, i + 5)
          const batchResults = await Promise.all(
            batch.map(num => openf1Get(`/location?session_key=${sessionKey}&driver_number=${num}`))
          )
          batch.forEach((num, idx) => {
            const raw = batchResults[idx].filter(p => p.x !== 0 || p.y !== 0)
            locResults[num] = raw
          })
          if (i + 5 < driverNums.length) await delay(400)
        }

        // 4. Build track outline from driver 1's full lap (most complete path)
        const trackDriverNum = driverNums[0]
        const trackRaw = locResults[trackDriverNum] || []
        const trackNorm = normalizePoints(trackRaw)
        setTrackPoints(trackNorm.map(p => ({ x: p.nx, y: p.ny })))

        // 5. Normalize all driver locations
        // Use global min/max from track driver for consistent coordinate space
        const allRaw = trackRaw
        const xs = allRaw.map(p => p.x)
        const ys = allRaw.map(p => p.y)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)
        const rangeX = maxX - minX || 1
        const rangeY = maxY - minY || 1

        const normalizedLocs = {}
        driverNums.forEach(num => {
          normalizedLocs[num] = (locResults[num] || []).map(p => ({
            ts: new Date(p.date).getTime(),
            nx: (p.x - minX) / rangeX,
            ny: (p.y - minY) / rangeY,
          }))
        })
        allLocations.current = normalizedLocs

        // 6. Compute timeline
        if (lapTs.length > 0) {
          startTimeRef.current = lapTs[0].timestamp_ms
          const lastLap = lapTs[lapTs.length - 1]
          const lastLapDuration = firstDriverLaps.find(l => l.lap_number === lastLap.lap)?.lap_duration || 90
          const endTs = lastLap.timestamp_ms + lastLapDuration * 1000
          const total = (endTs - startTimeRef.current) / 1000
          setTotalTime(total)
        }

        setStatus('ready')
        setCurrentTime(0)
        currentTimeRef.current = 0
        // Show initial frame
        updateFrame(0)
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }

    load()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [sessionKey])

  // Get driver positions at a given time (seconds from start)
  const updateFrame = useCallback((timeSec) => {
    const absTs = startTimeRef.current + timeSec * 1000
    const dMap = driverInfoRef.current
    const locs = allLocations.current

    const markers = []
    const board = []

    Object.entries(locs).forEach(([numStr, points]) => {
      const num = parseInt(numStr)
      const info = dMap[num]
      if (!points.length || !info) return

      // Binary search for closest timestamp
      let lo = 0, hi = points.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (points[mid].ts < absTs) lo = mid + 1
        else hi = mid
      }
      const pt = points[Math.min(lo, points.length - 1)]

      markers.push({
        abbr: info.name_acronym || `#${num}`,
        x: pt.nx,
        y: pt.ny,
        color: info.color,
        position: null,
      })
      board.push({
        num,
        abbr: info.name_acronym || `#${num}`,
        color: info.color,
        team: info.team_name,
      })
    })

    // Determine current lap
    const lapTs = lapTimestampsRef.current
    let lap = 1
    for (let i = lapTs.length - 1; i >= 0; i--) {
      if (absTs >= lapTs[i].timestamp_ms) { lap = lapTs[i].lap; break }
    }
    setCurrentLap(lap)
    setDrivers(markers)
    setLeaderboard(board)
  }, [])

  // RAF playback loop
  const tick = useCallback(() => {
    if (!playingRef.current) return
    const now = performance.now()
    if (lastRafTimeRef.current !== null) {
      const elapsed = (now - lastRafTimeRef.current) / 1000 * speedRef.current
      const next = Math.min(currentTimeRef.current + elapsed, totalTime)
      currentTimeRef.current = next
      setCurrentTime(next)
      updateFrame(next)
      if (next >= totalTime) {
        playingRef.current = false
        setPlaying(false)
        return
      }
    }
    lastRafTimeRef.current = now
    rafRef.current = requestAnimationFrame(tick)
  }, [totalTime, updateFrame])

  const play = useCallback(() => {
    if (currentTimeRef.current >= totalTime) {
      currentTimeRef.current = 0
      setCurrentTime(0)
    }
    playingRef.current = true
    lastRafTimeRef.current = null
    setPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, totalTime])

  const pause = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const seek = useCallback((timeSec) => {
    const t = Math.max(0, Math.min(timeSec, totalTime))
    currentTimeRef.current = t
    setCurrentTime(t)
    updateFrame(t)
  }, [totalTime, updateFrame])

  const seekToLap = useCallback((lap) => {
    const lapTs = lapTimestampsRef.current
    const entry = lapTs.find(l => l.lap === lap)
    if (!entry) return
    const t = (entry.timestamp_ms - startTimeRef.current) / 1000
    seek(t)
  }, [seek])

  const reset = useCallback(() => {
    pause()
    seek(0)
  }, [pause, seek])

  return {
    status, error,
    playing, speed, setSpeed,
    currentTime, totalTime,
    currentLap, totalLaps,
    drivers, leaderboard, trackPoints,
    play, pause, seek, seekToLap, reset,
  }
}
