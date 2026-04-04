import { Card, Badge } from '../ui'

export default function PressureMeter({ title = 'Pressure Meter', rows = [] }) {
  if (!rows.length) {
    return (
      <Card>
        <div className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No standings.</div>
      </Card>
    )
  }

  const leader = rows[0]
  const leaderPts = Number(leader.points) || 0
  const maxGap = Math.max(1, ...rows.slice(0, 6).map(r => Math.max(0, leaderPts - (Number(r.points) || 0))))

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="text-xs mt-1 text-secondary">Gap to the leader (top 6)</div>
        </div>
        <Badge color="gray">{leaderPts.toFixed(0)} pts leader</Badge>
      </div>
      <div className="p-5 space-y-3">
        {rows.slice(0, 6).map((r, idx) => {
          const pts = Number(r.points) || 0
          const gap = Math.max(0, leaderPts - pts)
          const pct = idx === 0 ? 100 : Math.max(6, Math.round(100 * (1 - gap / maxGap)))
          return (
            <div key={r.id || r.driver_id || r.team_id || idx} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold truncate">{r.name}</div>
                <div className="text-xs text-secondary tabular-nums">
                  {idx === 0 ? `${pts.toFixed(0)} pts` : `-${gap.toFixed(0)} pts`}
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: idx === 0 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, white)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

