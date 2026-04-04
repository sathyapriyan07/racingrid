import { Link } from 'react-router-dom'
import { Badge, Card } from '../ui'

export default function FormGuide({ title = 'Form Guide', rows = [] }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-sm font-bold">{title}</div>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No recent races.</div>
      ) : (
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {rows.map((r) => (
            <Link key={r.raceId} to={`/race/${r.raceId}`} className="block">
              <div className="apple-card px-3 py-2 flex items-center gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary">{r.round ? `R${r.round}` : ''}</div>
                <Badge color={r.position <= 3 ? 'yellow' : r.position <= 10 ? 'green' : 'gray'}>P{r.position ?? '—'}</Badge>
                {r.delta > 0 && <span className="text-[10px] font-black text-green-400">+{r.delta}</span>}
                {r.delta < 0 && <span className="text-[10px] font-black text-red-400">-{Math.abs(r.delta)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

