import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function PointsProgressionChart({ data = [], xKey = 'round', yKey = 'points', label = 'Points' }) {
  if (!data?.length) return null

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
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
        <Area type="monotone" dataKey={yKey} name={label} stroke="var(--accent)" fill="rgba(225,6,0,0.15)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

