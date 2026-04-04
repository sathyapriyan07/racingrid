import { useMemo } from 'react'
import { Badge, Card, EmptyState } from '../../components/ui'

function shortCode(driver) {
  if (!driver) return '—'
  if (driver.code) return driver.code
  const parts = (driver.name || '').split(' ').filter(Boolean)
  return parts.length ? parts[parts.length - 1].slice(0, 3).toUpperCase() : '—'
}

export default function PitStrategy({ pitStops = [], results = [], totalLaps = 0 }) {
  const rows = useMemo(() => {
    const byDriver = {}
    pitStops.forEach(p => {
      if (!p.driver_id) return
      if (!byDriver[p.driver_id]) byDriver[p.driver_id] = []
      byDriver[p.driver_id].push(p)
    })

    const ordered = results
      .filter(r => r?.driver_id)
      .map(r => ({
        driverId: r.driver_id,
        driver: r.drivers,
        team: r.teams,
        stops: (byDriver[r.driver_id] || []).filter(s => s.lap != null).sort((a, b) => (a.lap || 0) - (b.lap || 0)),
      }))
    return ordered
  }, [pitStops, results])

  if (!rows.length) {
    return (
      <Card>
        <EmptyState message="No pit stop data imported." icon="⛽" />
      </Card>
    )
  }

  const maxLap = totalLaps || Math.max(1, ...pitStops.map(p => p.lap || 0))

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Strategy</div>
            <div className="text-sm font-bold mt-1">Pit timeline by driver</div>
          </div>
          <Badge color="yellow">{pitStops.length} stops</Badge>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Pit markers</div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {rows.slice(0, 18).map(row => (
            <div key={row.driverId} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-xs font-black text-f1red w-10 shrink-0">{shortCode(row.driver)}</div>
                  <div className="text-xs text-secondary truncate">{row.driver?.name || row.driverId}</div>
                </div>
                <div className="text-xs text-secondary tabular-nums">{row.stops.length} stop{row.stops.length === 1 ? '' : 's'}</div>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                {row.stops.map((s, i) => (
                  <div
                    key={`${row.driverId}_${i}`}
                    title={`Lap ${s.lap}${s.duration ? ` · ${s.duration}` : ''}`}
                    className="absolute top-0 -translate-x-1/2 w-1.5 h-2 rounded-full"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((s.lap || 0) / maxLap) * 100))}%`,
                      background: 'var(--accent)',
                      boxShadow: '0 0 0 2px rgba(0,0,0,0.2)',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

