import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'

export default function PerformanceChart({ data, dataKey = 'points', color = '#E10600', label = 'Points' }) {
  if (!data?.length) return <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</div>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -28 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis stroke="transparent" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            fontSize: 12,
            boxShadow: 'var(--shadow)',
          }}
          labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
          itemStyle={{ color: color }}
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          name={label}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
