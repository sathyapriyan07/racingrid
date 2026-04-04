import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'
import { Play, Pause } from 'lucide-react'
import { Badge, Card, EmptyState } from '../../components/ui'

const COLORS = [
  '#E10600', '#60A5FA', '#34D399', '#F59E0B', '#A78BFA',
  '#F472B6', '#22C55E', '#FB7185', '#38BDF8', '#FACC15',
]

function shortName(driver) {
  if (!driver) return '—'
  if (driver.code) return driver.code
  const parts = (driver.name || '').split(' ').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : '—'
}

export default function PositionReplay({ laps = [], results = [] }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [currentLap, setCurrentLap] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const timerRef = useRef(null)

  const maxLap = useMemo(() => {
    const m = laps.length ? Math.max(...laps.map(l => l.lap_number || 0)) : 0
    return m || (results[0]?.laps || 0) || 0
  }, [laps, results])

  const drivers = useMemo(() => {
    const resOrder = results
      .filter(r => r?.driver_id)
      .map((r, idx) => ({
        id: r.driver_id,
        label: shortName(r.drivers),
        full: r.drivers?.name || r.driver_id,
        color: COLORS[idx % COLORS.length],
      }))
    const fallbackIds = [...new Set(laps.map(l => l.driver_id))].map((id, idx) => ({
      id,
      label: id.slice(0, 3).toUpperCase(),
      full: id,
      color: COLORS[idx % COLORS.length],
    }))
    return resOrder.length ? resOrder : fallbackIds
  }, [laps, results])

  useEffect(() => {
    if (!drivers.length) return
    if (selectedIds.length) return
    setSelectedIds(drivers.slice(0, 6).map(d => d.id))
  }, [drivers, selectedIds.length])

  useEffect(() => {
    setCurrentLap(1)
    setPlaying(false)
  }, [maxLap])

  const series = useMemo(() => {
    if (!maxLap) return []
    const lapMap = new Map()
    for (let lap = 1; lap <= maxLap; lap++) lapMap.set(lap, { lap })
    laps.forEach(l => {
      const lapNum = l.lap_number
      if (!lapNum) return
      const pos = l.position
      if (pos == null) return
      const row = lapMap.get(lapNum)
      if (!row) return
      row[l.driver_id] = pos
    })
    return Array.from(lapMap.values())
  }, [laps, maxLap])

  const activeDrivers = useMemo(() => {
    const set = new Set(selectedIds)
    return drivers.filter(d => set.has(d.id))
  }, [drivers, selectedIds])

  useEffect(() => {
    if (!playing || maxLap <= 1) return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrentLap((l) => {
        if (l >= maxLap) {
          setPlaying(false)
          return l
        }
        return l + 1
      })
    }, Math.max(60, Math.round(850 / speed)))
    return () => clearInterval(timerRef.current)
  }, [playing, speed, maxLap])

  if (!maxLap || !series.length || activeDrivers.length === 0) {
    return (
      <Card>
        <EmptyState message="No lap position data imported." icon="⟲" />
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Replay</div>
            <div className="text-sm font-bold mt-1">Lap {currentLap} / {maxLap}</div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                className={['px-2.5 py-1 rounded-full text-xs font-bold border transition-colors', speed === s ? 'bg-muted' : 'hover:bg-muted'].join(' ')}
                style={{ borderColor: 'var(--border)' }}
                onClick={() => setSpeed(s)}
              >
                {s}×
              </button>
            ))}
            <button onClick={() => setPlaying(p => !p)} className="btn-primary text-xs py-1.5 px-3">
              {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={1}
            max={maxLap}
            value={currentLap}
            onChange={e => setCurrentLap(parseInt(e.target.value, 10))}
            className="w-full"
            aria-label="Current lap"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {drivers.slice(0, 14).map(d => {
            const on = selectedIds.includes(d.id)
            return (
              <button
                key={d.id}
                onClick={() => setSelectedIds(ids => on ? ids.filter(x => x !== d.id) : [...ids, d.id])}
                className="transition-opacity"
                style={{ opacity: on ? 1 : 0.55 }}
              >
                <Badge color={on ? 'red' : 'gray'}>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.label}
                  </span>
                </Badge>
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Position Chart (lower is better)
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="lap" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis
              reversed
              allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[1, 'dataMax']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                fontSize: 12,
                boxShadow: 'var(--shadow)',
              }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
            />
            <Legend />
            <ReferenceLine x={currentLap} stroke="#E10600" strokeDasharray="4 2" opacity={0.8} />
            {activeDrivers.map(d => (
              <Line
                key={d.id}
                type="monotone"
                dataKey={d.id}
                name={d.label}
                stroke={d.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

