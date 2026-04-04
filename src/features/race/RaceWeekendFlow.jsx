import { useMemo } from 'react'
import { Card, Badge, EmptyState } from '../../components/ui'

function pickTop(rows = [], n = 3) {
  return (rows || [])
    .filter(r => r && r.position != null)
    .slice()
    .sort((a, b) => (a.position || 999) - (b.position || 999))
    .slice(0, n)
}

function shortName(d) {
  if (!d) return '—'
  if (d.code) return d.code
  const parts = String(d.name || '').trim().split(' ').filter(Boolean)
  return parts.length ? parts[parts.length - 1].slice(0, 3).toUpperCase() : '—'
}

function Podium({ rows = [] }) {
  const top = pickTop(rows, 3)
  if (!top.length) return <div className="text-xs text-secondary">No data.</div>
  return (
    <div className="flex flex-wrap gap-2">
      {top.map((r) => (
        <Badge
          key={r.driver_id || r.id || `${r.position}_${shortName(r.drivers)}`}
          color={r.position === 1 ? 'yellow' : r.position === 2 ? 'gray' : 'blue'}
        >
          P{r.position} {shortName(r.drivers)}
        </Badge>
      ))}
    </div>
  )
}

export default function RaceWeekendFlow({ practiceResults = [], qualifying = [], results = [] }) {
  const sessions = useMemo(() => ([
    { id: 'FP1', label: 'FP1', rows: practiceResults.filter(r => r.session === 'FP1') },
    { id: 'FP2', label: 'FP2', rows: practiceResults.filter(r => r.session === 'FP2') },
    { id: 'FP3', label: 'FP3', rows: practiceResults.filter(r => r.session === 'FP3') },
    { id: 'Q', label: 'Qualifying', rows: qualifying },
    { id: 'R', label: 'Race', rows: results },
  ]), [practiceResults, qualifying, results])

  const hasAny = sessions.some(s => (s.rows || []).length > 0)

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-sm font-bold">Race Weekend Flow</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>FP1 → FP2 → FP3 → Quali → Race</div>
      </div>

      {!hasAny ? (
        <div className="p-6">
          <EmptyState message="No weekend session data imported for this race." icon="🗓️" />
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map(s => (
            <div key={s.id} className="apple-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-secondary">{s.label}</div>
                <Badge color={s.id === 'R' ? 'red' : s.id === 'Q' ? 'blue' : 'gray'}>{(s.rows || []).length ? 'Top 3' : '—'}</Badge>
              </div>
              <div className="mt-3">
                <Podium rows={s.rows} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
