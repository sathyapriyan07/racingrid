import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function PerformanceChart({ data, dataKey = 'points', color = '#E10600', label = 'Points' }) {
  if (!data?.length) return <div className="text-white/30 text-sm text-center py-8">No data</div>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis dataKey="name" stroke="#ffffff20" tick={{ fill: '#ffffff50', fontSize: 10 }} />
        <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff50', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#111118', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#ffffff80' }}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} dot={{ fill: color, r: 3 }} strokeWidth={2} name={label} />
      </LineChart>
    </ResponsiveContainer>
  )
}
