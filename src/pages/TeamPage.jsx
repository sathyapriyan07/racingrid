import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, StatCard, Card } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { BarChart2, Flag } from 'lucide-react'

const POS_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

export default function TeamPage() {
  const { id } = useParams()
  const { fetchTeam, fetchAllChampionships } = useDataStore()
  const [team, setTeam] = useState(null)
  const [results, setResults] = useState([])
  const [champYears, setChampYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [seasonFilter, setSeasonFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [t, champs] = await Promise.all([fetchTeam(id), fetchAllChampionships()])
        setTeam(t)
        setChampYears(champs.teamChamps[id] || [])
        const { data } = await supabase
          .from('results')
          .select('*, drivers(id, name, code, image_url), races(id, name, date, round, seasons(year))')
          .eq('team_id', id)
          .order('races(date)', { ascending: false })
        setResults(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
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

  const drivers = [...new Map(results.map(r => [r.driver_id, { ...r.drivers, driver_id: r.driver_id }])).values()].filter(Boolean)

  const seasons = [...new Set(results.map(r => r.races?.seasons?.year).filter(Boolean))].sort((a, b) => b - a)

  const filteredResults = seasonFilter === 'all'
    ? results
    : results.filter(r => String(r.races?.seasons?.year) === seasonFilter)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'results', label: 'Results', icon: Flag },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6 flex gap-6 items-start flex-wrap">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-raised)' }}>
          {team.logo_url
            ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-2" />
            : <span className="text-2xl font-black" style={{ color: 'var(--text-muted)' }}>{team.name.slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div>
          <h1 className="text-3xl font-black">{team.name}</h1>
          <div className="flex gap-4 mt-2 text-sm flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            {team.nationality && <span>🌍 {team.nationality}</span>}
            {team.base && <span>📍 {team.base}</span>}
          </div>
          {champYears.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {champYears.sort().map(y => (
                <span key={y} className="flex items-center gap-1 text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">
                  🏆 {y}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {team.car_image && (
        <div className="glass overflow-hidden">
          <img src={team.car_image} alt={`${team.name} car`} className="w-full max-h-52 object-contain p-4" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Wins" value={wins} />
        <StatCard label="Podiums" value={podiums} />
        <StatCard label="Total Points" value={totalPoints.toFixed(0)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-raised)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-f1red text-white' : 'hover:text-white'
            }`}
            style={{ color: tab === t.id ? undefined : 'var(--text-secondary)' }}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          {chartData.length > 0 && (
            <Card>
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Points by Season</h2>
              <PerformanceChart data={chartData} dataKey="points" label="Points" />
            </Card>
          )}

          {drivers.length > 0 && (
            <Card>
              <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Drivers</h2>
              <div className="flex flex-wrap gap-2">
                {drivers.map(d => (
                  <Link key={d.driver_id} to={`/driver/${d.driver_id}`}>
                    <div className="glass-hover flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:text-f1red transition-colors">
                      {d.image_url && <img src={d.image_url} alt={d.name} className="w-5 h-5 rounded-full object-cover object-top" />}
                      {d.code && <span className="text-f1red">{d.code}</span>}
                      {d.name}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Results Tab */}
      {tab === 'results' && (
        <div className="space-y-3">
          {/* Season filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSeasonFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${seasonFilter === 'all' ? 'bg-f1red text-white' : 'glass'}`}
              style={{ color: seasonFilter === 'all' ? undefined : 'var(--text-secondary)' }}>
              All
            </button>
            {seasons.map(yr => (
              <button key={yr} onClick={() => setSeasonFilter(String(yr))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${seasonFilter === String(yr) ? 'bg-f1red text-white' : 'glass'}`}
                style={{ color: seasonFilter === String(yr) ? undefined : 'var(--text-secondary)' }}>
                {yr}
              </button>
            ))}
          </div>

          <Card className="p-0 overflow-hidden">
            {filteredResults.length === 0 ? (
              <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No results.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left py-2 pl-3 w-7">#</th>
                    <th className="text-left py-2">Race</th>
                    <th className="text-left py-2">Driver</th>
                    <th className="text-center py-2 hidden sm:table-cell">Grid</th>
                    <th className="text-right py-2">Time</th>
                    <th className="text-right py-2 pr-3">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, i) => {
                    const posColor = r.position === 1 ? 'text-yellow-400' : r.position === 2 ? 'text-gray-300' : r.position === 3 ? 'text-amber-600' : ''
                    return (
                      <tr key={r.id} className="border-b hover:bg-white/3 transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-1.5 pl-3">
                          <span className={`font-bold text-xs ${posColor}`} style={{ color: posColor ? undefined : 'var(--text-secondary)' }}>
                            {r.position ?? '—'}
                          </span>
                        </td>
                        <td className="py-1.5" style={{ fontSize: 12 }}>
                          <Link to={`/race/${r.races?.id}`} className="hover:text-f1red transition-colors">
                            <span className="hidden sm:inline">{r.races?.name?.replace('Grand Prix', 'GP') || '—'}</span>
                            <span className="sm:hidden">{r.races?.name?.replace(' Grand Prix', '') || '—'}</span>
                          </Link>
                          <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                            {r.races?.seasons?.year}
                          </span>
                        </td>
                        <td className="py-1.5" style={{ fontSize: 12 }}>
                          <Link to={`/driver/${r.driver_id}`} className="flex items-center gap-1.5 hover:text-f1red transition-colors">
                            {r.drivers?.image_url && (
                              <img src={r.drivers.image_url} alt={r.drivers.name} className="w-5 h-5 rounded-full object-cover object-top shrink-0" />
                            )}
                            <span className="hidden sm:inline">{r.drivers?.name || '—'}</span>
                            <span className="sm:hidden font-semibold">{r.drivers?.code || r.drivers?.name?.split(' ').pop() || '—'}</span>
                          </Link>
                        </td>
                        <td className="py-1.5 text-center hidden sm:table-cell" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                        <td className="py-1.5 text-right" style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {r.time || r.status || '—'}
                        </td>
                        <td className="py-1.5 text-right pr-3 font-semibold" style={{ fontSize: 11 }}>{r.points ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
