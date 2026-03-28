import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, StatCard, Card, PageHeader } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'

async function getDriverStats(driverId) {
  const { data } = await supabase
    .from('results')
    .select('*, races(name, date, seasons(year))')
    .eq('driver_id', driverId)
  return data || []
}

export default function Compare() {
  const [searchParams] = useSearchParams()
  const { fetchDrivers, drivers } = useDataStore()
  const [driverA, setDriverA] = useState(searchParams.get('a') || '')
  const [driverB, setDriverB] = useState(searchParams.get('b') || '')
  const [statsA, setStatsA] = useState([])
  const [statsB, setStatsB] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchDrivers().catch(console.error) }, [])

  const compare = async () => {
    if (!driverA || !driverB) return
    setLoading(true)
    try {
      const [a, b] = await Promise.all([getDriverStats(driverA), getDriverStats(driverB)])
      setStatsA(a)
      setStatsB(b)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const driverAInfo = drivers.find(d => d.id === driverA)
  const driverBInfo = drivers.find(d => d.id === driverB)

  const calcStats = (results) => ({
    wins: results.filter(r => r.position === 1).length,
    podiums: results.filter(r => r.position <= 3).length,
    poles: results.filter(r => r.grid === 1).length,
    points: results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0).toFixed(0),
    races: results.length,
  })

  const sA = calcStats(statsA)
  const sB = calcStats(statsB)

  const chartDataA = statsA.map(r => ({ name: r.races?.name?.replace('Grand Prix', 'GP') || '?', points: parseFloat(r.points) || 0 }))
  const chartDataB = statsB.map(r => ({ name: r.races?.name?.replace('Grand Prix', 'GP') || '?', points: parseFloat(r.points) || 0 }))

  return (
    <div className="space-y-6">
      <PageHeader title="Compare" subtitle="Head-to-head driver comparison" />

      <div className="glass p-4 flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-white/50 mb-1 block">Driver A</label>
          <select value={driverA} onChange={e => setDriverA(e.target.value)} className="input">
            <option value="">Select driver...</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="text-white/30 font-bold pb-2">VS</div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-white/50 mb-1 block">Driver B</label>
          <select value={driverB} onChange={e => setDriverB(e.target.value)} className="input">
            <option value="">Select driver...</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={compare} disabled={!driverA || !driverB || loading} className="btn-primary">
          {loading ? 'Loading...' : 'Compare'}
        </button>
      </div>

      {loading && <Spinner />}

      {statsA.length > 0 && statsB.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-bold mb-3 text-f1red">{driverAInfo?.name || 'Driver A'}</h2>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Wins" value={sA.wins} />
                <StatCard label="Podiums" value={sA.podiums} />
                <StatCard label="Poles" value={sA.poles} />
                <StatCard label="Points" value={sA.points} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold mb-3 text-blue-400">{driverBInfo?.name || 'Driver B'}</h2>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Wins" value={sB.wins} />
                <StatCard label="Podiums" value={sB.podiums} />
                <StatCard label="Poles" value={sB.poles} />
                <StatCard label="Points" value={sB.points} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-xs font-bold mb-3 text-f1red">{driverAInfo?.name} — Points</h3>
              <PerformanceChart data={chartDataA} dataKey="points" color="#E10600" />
            </Card>
            <Card>
              <h3 className="text-xs font-bold mb-3 text-blue-400">{driverBInfo?.name} — Points</h3>
              <PerformanceChart data={chartDataB} dataKey="points" color="#3B82F6" />
            </Card>
          </div>

          {/* Head to head summary */}
          <Card>
            <h2 className="text-sm font-bold mb-4 text-white/70">Head-to-Head</h2>
            <div className="space-y-3">
              {[
                { label: 'Wins', a: sA.wins, b: sB.wins },
                { label: 'Podiums', a: sA.podiums, b: sB.podiums },
                { label: 'Pole Positions', a: sA.poles, b: sB.poles },
                { label: 'Total Points', a: sA.points, b: sB.points },
                { label: 'Races', a: sA.races, b: sB.races },
              ].map(row => {
                const aWins = Number(row.a) > Number(row.b)
                const bWins = Number(row.b) > Number(row.a)
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-12 text-right ${aWins ? 'text-f1red' : 'text-white/40'}`}>{row.a}</span>
                    <div className="flex-1 text-center text-xs text-white/40">{row.label}</div>
                    <span className={`text-sm font-bold w-12 ${bWins ? 'text-blue-400' : 'text-white/40'}`}>{row.b}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
