import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function TrendChart({
  data,
  xKey = 'x',
  yKey = 'y',
  color = '#E10600',
  height = 220,
  yReversed = false,
  yDomain,
  label,
}) {
  if (!data?.length) return <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</div>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke="transparent"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="transparent"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          reversed={yReversed}
          allowDecimals={false}
          domain={yDomain}
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
          itemStyle={{ color }}
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2.25}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          name={label || yKey}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

