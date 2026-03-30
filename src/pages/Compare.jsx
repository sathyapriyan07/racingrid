import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, Card, PageHeader, Select } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { motion } from 'framer-motion'

async function getDriverStats(driverId) {
  const { data } = await supabase.from('results').select('*, races(name, date, seasons(year))').eq('driver_id', driverId)
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
      setStatsA(a); setStatsB(b)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
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
    <div className="space-y-8">
      <PageHeader title="Compare" subtitle="Head-to-head driver comparison" />

      {/* Selector */}
      <Card>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>Driver A</label>
            <Select value={driverA} onChange={e => setDriverA(e.target.value)}>
              <option value="">Select driver...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <div className="text-lg font-black pb-2" style={{ color: 'var(--text-muted)' }}>VS</div>
          <div className="flex-1 min-w-40">
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>Driver B</label>
            <Select value={driverB} onChange={e => setDriverB(e.target.value)}>
              <option value="">Select driver...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <button onClick={compare} disabled={!driverA || !driverB || loading} className="btn-primary">
            {loading ? 'Loading...' : 'Compare'}
          </button>
        </div>
      </Card>

      {loading && <Spinner />}

      {statsA.length > 0 && statsB.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
          {/* Stats side by side */}
          <div className="grid grid-cols-2 gap-4">
            {[{ info: driverAInfo, stats: sA, color: '#E10600' }, { info: driverBInfo, stats: sB, color: '#3B82F6' }].map(({ info, stats, color }) => (
              <Card key={color}>
                <div className="flex items-center gap-3 mb-4">
                  {info?.image_url && <img src={info.image_url} alt={info.name} className="w-10 h-10 rounded-full object-cover object-top" />}
                  <div>
                    <div className="font-bold text-sm" style={{ color, letterSpacing: '-0.02em' }}>{info?.name || 'Driver'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{info?.code}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['Wins', stats.wins], ['Podiums', stats.podiums], ['Poles', stats.poles], ['Points', stats.points]].map(([label, val]) => (
                    <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                      <div className="text-xl font-black" style={{ letterSpacing: '-0.04em' }}>{val}</div>
                      <div className="text-xs font-medium uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#E10600' }}>{driverAInfo?.name}</p>
              <PerformanceChart data={chartDataA} dataKey="points" color="#E10600" />
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#3B82F6' }}>{driverBInfo?.name}</p>
              <PerformanceChart data={chartDataB} dataKey="points" color="#3B82F6" />
            </Card>
          </div>

          {/* Head to head */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>Head-to-Head</p>
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
                    <span className="text-sm font-bold w-12 text-right tabular-nums" style={{ color: aWins ? '#E10600' : 'var(--text-muted)' }}>{row.a}</span>
                    <div className="flex-1 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{row.label}</div>
                    <span className="text-sm font-bold w-12 tabular-nums" style={{ color: bWins ? '#3B82F6' : 'var(--text-muted)' }}>{row.b}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
