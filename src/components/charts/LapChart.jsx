import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

const COLORS = ['#E10600','#00D2BE','#FF8700','#DC0000','#0600EF','#005AFF','#900000','#2B4562','#F596C8','#B6BABD','#C92D4B','#358C75','#FFF500','#37BEDD','#FF87BC','#6CD3BF','#FF1E00','#0067FF','#52E252','#B0C4DE']

export default function LapChart({ laps, currentLap, driverMap = {} }) {
  const { chartData, drivers } = useMemo(() => {
    if (!laps?.length) return { chartData: [], drivers: [] }

    const maxLap = Math.min(currentLap || Infinity, Math.max(...laps.map(l => l.lap_number)))

    // Build cumulative times per driver up to each lap to derive position
    const driverNums = [...new Set(laps.map(l => l.driver_number))]

    // For each lap, rank drivers by cumulative time
    const chartData = []
    for (let lap = 1; lap <= maxLap; lap++) {
      const cumulative = {}
      driverNums.forEach(num => {
        const total = laps
          .filter(l => l.driver_number === num && l.lap_number <= lap && l.lap_duration)
          .reduce((s, l) => s + l.lap_duration, 0)
        if (total > 0) cumulative[num] = total
      })
      const ranked = Object.entries(cumulative).sort((a, b) => a[1] - b[1])
      const entry = { lap }
      ranked.forEach(([num], i) => {
        const key = driverMap[num]?.name_acronym || `#${num}`
        entry[key] = i + 1
      })
      chartData.push(entry)
    }

    const driverKeys = driverNums.map(num => driverMap[num]?.name_acronym || `#${num}`)
    return { chartData, drivers: driverKeys }
  }, [laps, currentLap, driverMap])

  if (!chartData.length) return <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No lap data</div>

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
        <XAxis dataKey="lap" stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis reversed domain={[1, 'dataMax']} stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--text-secondary)' }}
          itemStyle={{ color: 'var(--text-primary)' }}
          labelFormatter={v => `Lap ${v}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
        {drivers.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
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
