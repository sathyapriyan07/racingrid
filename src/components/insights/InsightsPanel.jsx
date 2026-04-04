import { Card, StatCard, Badge } from '../ui'

export default function InsightsPanel({ title = 'Race Insights', items = [] }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="text-sm font-bold">{title}</div>
        <Badge color="gray">{items.length} items</Badge>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <StatCard key={it.label} label={it.label} value={it.value} sub={it.sub} trend={it.trend} />
        ))}
      </div>
    </Card>
  )
}

