import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, StatCard, Card, PageHeader, Badge } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'

export default function DriverPage() {
  const { id } = useParams()
  const { fetchDriver, fetchDriverStats, fetchAllChampionships } = useDataStore()
  const [driver, setDriver] = useState(null)
  const [results, setResults] = useState([])
  const [champYears, setChampYears] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchDriver(id), fetchDriverStats(id), fetchAllChampionships()])
      .then(([d, r, champs]) => {
        setDriver(d)
        setResults(r || [])
        setChampYears(champs.driverChamps[id] || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (!driver) return <div className="text-white/40 text-center py-16">Driver not found.</div>

  const wins = results.filter(r => r.position === 1).length
  const podiums = results.filter(r => r.position <= 3).length
  const poles = results.filter(r => r.grid === 1).length
  const totalPoints = results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)

  const chartData = results.map(r => ({
    name: r.races?.name?.replace('Grand Prix', 'GP') || '?',
    points: parseFloat(r.points) || 0,
    position: r.position,
  }))

  const seasonGroups = results.reduce((acc, r) => {
    const year = r.races?.seasons?.year || 'Unknown'
    if (!acc[year]) acc[year] = []
    acc[year].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="glass p-6 flex gap-6 items-start flex-wrap">
        <div className="w-32 h-32 rounded-2xl bg-dark-600 overflow-hidden shrink-0 border border-white/10">
          {driver.image_url
            ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover object-top" />
            : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/20">{driver.code || '?'}</div>
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black">{driver.name}</h1>
            {driver.code && <Badge color="red">{driver.code}</Badge>}
            {champYears.sort().map(y => (
              <span key={y} className="flex items-center gap-1 text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">
                🏆 {y}
              </span>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-sm text-white/50 flex-wrap items-center">
            {driver.nationality && (
              <span className="flex items-center gap-1.5">
                {driver.flag_url
                  ? <img src={driver.flag_url} alt={driver.nationality} className="h-4 w-auto rounded-sm" />
                  : '🌍'
                }
                {driver.nationality}
              </span>
            )}
            {driver.dob && <span>🎂 {new Date(driver.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          </div>
        </div>
        <Link to={`/compare?a=${id}`} className="btn-ghost text-xs">Compare</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Wins" value={wins} />
        <StatCard label="Podiums" value={podiums} />
        <StatCard label="Pole Positions" value={poles} />
        <StatCard label="Total Points" value={totalPoints.toFixed(0)} />
      </div>

      {chartData.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold mb-4 text-white/70">Points Per Race</h2>
          <PerformanceChart data={chartData} dataKey="points" label="Points" />
        </Card>
      )}

      {Object.keys(seasonGroups).sort((a, b) => b - a).map(year => (
        <Card key={year}>
          <h2 className="text-sm font-bold mb-3 text-white/70">Season {year}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/5">
                  <th className="text-left pb-2">Race</th>
                  <th className="text-center pb-2">Pos</th>
                  <th className="text-center pb-2">Grid</th>
                  <th className="text-center pb-2">Pts</th>
                  <th className="text-left pb-2">Team</th>
                </tr>
              </thead>
              <tbody>
                {seasonGroups[year].map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="py-2">
                      <Link to={`/race/${r.race_id}`} className="hover:text-f1red transition-colors">
                        {r.races?.name?.replace('Grand Prix', 'GP') || '—'}
                      </Link>
                    </td>
                    <td className="text-center py-2">
                      <span className={r.position === 1 ? 'text-yellow-400 font-bold' : r.position <= 3 ? 'text-white/80 font-semibold' : 'text-white/50'}>
                        {r.position ?? '—'}
                      </span>
                    </td>
                    <td className="text-center py-2 text-white/50">{r.grid ?? '—'}</td>
                    <td className="text-center py-2 text-white/70">{r.points ?? 0}</td>
                    <td className="py-2 text-white/50">{r.teams?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {results.length === 0 && (
        <Card><p className="text-white/30 text-sm text-center py-4">No race results for this driver.</p></Card>
      )}
    </div>
  )
}
