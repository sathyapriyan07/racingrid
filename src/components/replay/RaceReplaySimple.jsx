import { useMemo, useState, useEffect, useRef } from 'react'
import { Card, Badge } from '../ui'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../ui'

const POSITION_COLORS = [
  '#FFD700', '#C0C0C0', '#CD7F32',
  '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff',
  '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff',
]

function fmtLapTime(sec) {
  if (!sec) return null
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(3).padStart(6, '0')
  return `${m}:${s}`
}

export default function RaceReplaySimple({ raceId }) {
  const [laps, setLaps] = useState([])
  const [results, setResults] = useState([])
  const [pitStops, setPitStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentLap, setCurrentLap] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef(null)

  useEffect(() => {
    Promise.all([
      supabase.from('laps').select('*, drivers(name, code)').eq('race_id', raceId).order('lap_number'),
      supabase.from('results').select('*, drivers(name, code), teams(name, logo_url)').eq('race_id', raceId).order('position'),
      supabase.from('pit_stops').select('*, drivers(name, code)').eq('race_id', raceId),
    ]).then(([l, r, p]) => {
      setLaps(l.data || [])
      setResults(r.data || [])
      setPitStops(p.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [raceId])

  const maxLap = useMemo(() =>
    laps.length ? Math.max(...laps.map(l => l.lap_number)) : (results[0]?.laps || 0)
  , [laps, results])

  // Derive positions at currentLap from cumulative lap times
  const positionsAtLap = useMemo(() => {
    if (!laps.length) {
      // Fallback: use final results order
      return results.map((r, i) => ({
        position: r.position ?? i + 1,
        driver: r.drivers,
        team: r.teams,
        driver_id: r.driver_id,
        lapTime: null,
        pitted: false,
      }))
    }
    const totals = {}
    const lastLapTime = {}
    laps.filter(l => l.lap_number <= currentLap).forEach(l => {
      const key = l.driver_id
      totals[key] = (totals[key] || 0) + (l.lap_time_seconds || 0)
      if (l.lap_number === currentLap) lastLapTime[key] = l.lap_time
    })

    // If no lap_time_seconds, fall back to results order
    const hasTimings = Object.values(totals).some(v => v > 0)
    if (!hasTimings) {
      return results.map((r, i) => ({
        position: r.position ?? i + 1,
        driver: r.drivers,
        team: r.teams,
        driver_id: r.driver_id,
        lapTime: null,
        pitted: pitStops.some(p => p.driver_id === r.driver_id && p.lap === currentLap),
      }))
    }

    const sorted = Object.entries(totals).sort((a, b) => a[1] - b[1])
    return sorted.map(([driverId, _], i) => {
      const result = results.find(r => r.driver_id === driverId)
      return {
        position: i + 1,
        driver: result?.drivers,
        team: result?.teams,
        driver_id: driverId,
        lapTime: lastLapTime[driverId] || null,
        pitted: pitStops.some(p => p.driver_id === driverId && p.lap === currentLap),
      }
    })
  }, [laps, results, pitStops, currentLap])

  // Chart data: position per lap per driver (top 10 only)
  const chartDrivers = useMemo(() => {
    if (!laps.length) return []
    const driverIds = [...new Set(laps.map(l => l.driver_id))].slice(0, 10)
    return driverIds.map(id => {
      const driverLaps = laps.filter(l => l.driver_id === id).sort((a, b) => a.lap_number - b.lap_number)
      const result = results.find(r => r.driver_id === id)
      return {
        id,
        name: result?.drivers?.code || result?.drivers?.name?.split(' ').pop() || id.slice(0, 3),
        laps: driverLaps,
      }
    })
  }, [laps, results])

  // Playback
  useEffect(() => {
    if (playing && maxLap > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentLap(l => {
          if (l >= maxLap) { setPlaying(false); return l }
          return l + 1
        })
      }, 1000 / speed)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speed, maxLap])

  if (loading) return <Spinner />

  const pittersThisLap = pitStops.filter(p => p.lap === currentLap)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            Lap Replay
          </h2>
          <div className="flex items-center gap-2">
            {[1, 2, 5].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="px-2 py-1 text-xs font-bold rounded transition-colors"
                style={{ background: speed === s ? '#E10600' : 'var(--bg-raised)', color: speed === s ? '#fff' : 'var(--text-muted)' }}>
                {s}x
              </button>
            ))}
            <button onClick={() => { setPlaying(p => !p) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={{ background: playing ? 'var(--bg-raised)' : '#E10600', color: '#fff' }}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={() => { setPlaying(false); setCurrentLap(1) }}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
              ↺
            </button>
          </div>
        </div>

        {/* Lap slider */}
        <div className="space-y-1">
          <input type="range" min={1} max={maxLap || 1} value={currentLap}
            onChange={e => { setPlaying(false); setCurrentLap(Number(e.target.value)) }}
            className="w-full accent-f1red" />
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Lap 1</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Lap {currentLap} / {maxLap || '—'}</span>
            <span>Lap {maxLap || '—'}</span>
          </div>
        </div>

        {/* Pit indicators */}
        {pittersThisLap.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Pitted:</span>
            {pittersThisLap.map((p, i) => (
              <Badge key={i} color="yellow">{p.drivers?.code || p.drivers?.name?.split(' ').pop() || '?'}</Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Position table at current lap */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 pt-3 pb-2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
          Positions at Lap {currentLap}
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <th className="text-left py-2 pl-4 w-8">Pos</th>
              <th className="text-left py-2">Driver</th>
              <th className="text-left py-2 hidden sm:table-cell">Team</th>
              <th className="text-right py-2 pr-4">Lap Time</th>
            </tr>
          </thead>
          <tbody>
            {positionsAtLap.map((row, i) => (
              <tr key={row.driver_id || i} className="border-b hover:bg-muted transition-colors"
                style={{ borderColor: 'var(--border)', background: row.pitted ? 'rgba(234,179,8,0.05)' : undefined }}>
                <td className="py-1.5 pl-4">
                  <span className="font-bold text-xs" style={{ color: POSITION_COLORS[i] || 'var(--text-secondary)' }}>
                    {row.position}
                  </span>
                </td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12 }}>{row.driver?.name || '—'}</span>
                    {row.pitted && <Badge color="yellow">PIT</Badge>}
                  </div>
                </td>
                <td className="py-1.5 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    {row.team?.logo_url && <img src={row.team.logo_url} alt="" className="w-4 h-4 object-contain" />}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.team?.name || '—'}</span>
                  </div>
                </td>
                <td className="py-1.5 pr-4 text-right font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {row.lapTime || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Lap chart — position changes */}
      {chartDrivers.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Position Chart</h2>
          <div className="overflow-x-auto">
            <svg width={Math.max(600, maxLap * 18)} height={220} className="block">
              {/* Grid lines */}
              {[1, 5, 10, 15, 20].map(pos => (
                <line key={pos} x1={40} x2={Math.max(600, maxLap * 18) - 10}
                  y1={10 + (pos - 1) * 10} y2={10 + (pos - 1) * 10}
                  stroke="var(--border)" strokeWidth={0.5} />
              ))}
              {/* Current lap indicator */}
              <line x1={40 + (currentLap - 1) * 18} x2={40 + (currentLap - 1) * 18}
                y1={0} y2={210} stroke="#E10600" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.7} />
              {/* Driver lines */}
              {chartDrivers.map((drv, di) => {
                const color = `hsl(${(di * 37) % 360}, 70%, 60%)`
                const pts = drv.laps.map((l, idx) => {
                  // Use lap index as proxy for position if no position data
                  const pos = l.position ?? (idx + 1)
                  const x = 40 + (l.lap_number - 1) * 18
                  const y = 10 + (pos - 1) * 10
                  return `${x},${y}`
                }).join(' ')
                if (!pts) return null
                const lastLap = drv.laps[drv.laps.length - 1]
                const lastPos = lastLap?.position ?? drv.laps.length
                return (
                  <g key={drv.id}>
                    <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
                    <text x={40 + (lastLap?.lap_number - 1) * 18 + 4}
                      y={10 + (lastPos - 1) * 10 + 4}
                      fill={color} fontSize={9} fontWeight="bold">{drv.name}</text>
                  </g>
                )
              })}
              {/* Y axis labels */}
              {[1, 5, 10, 15, 20].map(pos => (
                <text key={pos} x={35} y={10 + (pos - 1) * 10 + 4}
                  fill="var(--text-muted)" fontSize={9} textAnchor="end">{pos}</text>
              ))}
            </svg>
          </div>
        </Card>
      )}
    </div>
  )
}
