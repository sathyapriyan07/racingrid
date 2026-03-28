import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, StatCard, Card, PageHeader } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'

export default function TeamPage() {
  const { id } = useParams()
  const { fetchTeam } = useDataStore()
  const [team, setTeam] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [t] = await Promise.all([fetchTeam(id)])
      setTeam(t)
      const { data } = await supabase
        .from('results')
        .select('*, drivers(name, code), races(name, date, seasons(year))')
        .eq('team_id', id)
        .order('races(date)', { ascending: true })
      setResults(data || [])
    }
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (!team) return <div className="text-white/40 text-center py-16">Team not found.</div>

  const wins = results.filter(r => r.position === 1).length
  const podiums = results.filter(r => r.position <= 3).length
  const totalPoints = results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)

  const seasonData = results.reduce((acc, r) => {
    const year = r.races?.seasons?.year || 'Unknown'
    if (!acc[year]) acc[year] = { name: String(year), points: 0, wins: 0 }
    acc[year].points += parseFloat(r.points) || 0
    if (r.position === 1) acc[year].wins++
    return acc
  }, {})
  const chartData = Object.values(seasonData).sort((a, b) => a.name - b.name)

  const drivers = [...new Map(results.map(r => [r.driver_id, r.drivers])).values()].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="glass p-6 flex gap-6 items-start flex-wrap">
        <div className="w-20 h-20 rounded-2xl bg-dark-600 overflow-hidden shrink-0 flex items-center justify-center">
          {team.logo_url
            ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-2" />
            : <span className="text-2xl font-black text-white/20">{team.name.slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div>
          <h1 className="text-3xl font-black">{team.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-white/50 flex-wrap">
            {team.nationality && <span>🌍 {team.nationality}</span>}
            {team.base && <span>📍 {team.base}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Wins" value={wins} />
        <StatCard label="Podiums" value={podiums} />
        <StatCard label="Total Points" value={totalPoints.toFixed(0)} />
      </div>

      {chartData.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold mb-4 text-white/70">Points by Season</h2>
          <PerformanceChart data={chartData} dataKey="points" label="Points" />
        </Card>
      )}

      {drivers.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold mb-3 text-white/70">Drivers</h2>
          <div className="flex flex-wrap gap-2">
            {drivers.map(d => (
              <Link key={d.id || d.code} to={`/driver/${results.find(r => r.drivers?.code === d.code)?.driver_id}`}>
                <span className="glass-hover px-3 py-1.5 text-xs font-semibold hover:text-f1red transition-colors">
                  {d.code && <span className="text-f1red mr-1">{d.code}</span>}{d.name}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
