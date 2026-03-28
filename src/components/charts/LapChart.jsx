import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

const COLORS = ['#E10600','#00D2BE','#FF8700','#DC0000','#0600EF','#005AFF','#900000','#2B4562','#F596C8','#B6BABD','#C92D4B','#358C75','#FFF500','#37BEDD','#FF87BC','#6CD3BF','#FF1E00','#0067FF','#52E252','#B0C4DE','#FF6B6B']

export default function LapChart({ laps, currentLap }) {
  const { chartData, drivers } = useMemo(() => {
    if (!laps?.length) return { chartData: [], drivers: [] }

    const driverMap = {}
    laps.forEach(l => {
      const code = l.drivers?.code || l.driver_id?.slice(0, 3).toUpperCase()
      if (!driverMap[code]) driverMap[code] = {}
      driverMap[code][l.lap_number] = l.position
    })

    const maxLap = Math.max(...laps.map(l => l.lap_number))
    const filtered = currentLap ? Math.min(currentLap, maxLap) : maxLap

    const chartData = Array.from({ length: filtered }, (_, i) => {
      const lap = i + 1
      const entry = { lap }
      Object.keys(driverMap).forEach(code => {
        entry[code] = driverMap[code][lap] ?? null
      })
      return entry
    })

    return { chartData, drivers: Object.keys(driverMap) }
  }, [laps, currentLap])

  if (!chartData.length) return <div className="text-white/30 text-sm text-center py-8">No lap data</div>

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
        <XAxis dataKey="lap" stroke="#ffffff20" tick={{ fill: '#ffffff50', fontSize: 11 }} />
        <YAxis reversed domain={[1, 'dataMax']} stroke="#ffffff20" tick={{ fill: '#ffffff50', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#111118', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#ffffff80' }}
          itemStyle={{ color: '#fff' }}
          labelFormatter={v => `Lap ${v}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#ffffff60' }} />
        {drivers.map((code, i) => (
          <Line
            key={code}
            type="monotone"
            dataKey={code}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
