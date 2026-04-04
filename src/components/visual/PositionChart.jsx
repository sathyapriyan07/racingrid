import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'
import { Card, EmptyState } from '../ui'

const COLORS = [
  '#E10600', '#60A5FA', '#34D399', '#F59E0B', '#A78BFA',
  '#F472B6', '#22C55E', '#FB7185', '#38BDF8', '#FACC15',
]

function nameFromDriver(driver, fallback) {
  if (!driver) return fallback || '—'
  if (driver.code) return driver.code
  const parts = (driver.name || '').split(' ').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : (fallback || '—')
}

export default function PositionChart({
  series = [],
  drivers = [],
  selectedIds = [],
  currentLap = null,
  highlightIds = [],
  height = 320,
}) {
  const active = drivers.filter(d => selectedIds.includes(d.id))
  const highlight = new Set(highlightIds)

  if (!series?.length || active.length === 0) {
    return (
      <Card>
        <EmptyState message="No lap position data imported." icon="⟲" />
      </Card>
    )
  }

  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
        Position change (lower is better)
      </div>
      <ResponsiveContainer width="100%" height={height}>
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
          {typeof currentLap === 'number' && <ReferenceLine x={currentLap} stroke="#E10600" strokeDasharray="4 2" opacity={0.8} />}
          {active.map((d, idx) => (
            <Line
              key={d.id}
              type="monotone"
              dataKey={d.id}
              name={nameFromDriver(d.driver, d.label || `D${idx + 1}`)}
              stroke={d.color || COLORS[idx % COLORS.length]}
              strokeWidth={highlight.has(d.id) ? 3.2 : 2}
              opacity={highlight.size ? (highlight.has(d.id) ? 1 : 0.55) : 0.9}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

