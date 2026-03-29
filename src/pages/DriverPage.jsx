import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, Badge } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'performance', label: 'Performance' },
  { id: 'championships', label: 'Championships' },
]

export default function DriverPage() {
  const { id } = useParams()
  const { fetchDriver, fetchDriverStats, fetchAllChampionships } = useDataStore()
  const [driver, setDriver] = useState(null)
  const [results, setResults] = useState([])
  const [champYears, setChampYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('results')

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
  if (!driver) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Driver not found.</div>

  const wins = results.filter(r => r.position === 1).length
  const podiums = results.filter(r => r.position <= 3).length
  const poles = results.filter(r => r.grid === 1).length
  const totalPoints = results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)

  const chartData = results.map(r => ({
    name: r.races?.name?.replace('Grand Prix', 'GP') || '?',
    points: parseFloat(r.points) || 0,
  }))

  const seasonGroups = results.reduce((acc, r) => {
    const year = r.races?.seasons?.year || 'Unknown'
    if (!acc[year]) acc[year] = []
    acc[year].push(r)
    return acc
  }, {})

  // Per-season summary for championships tab
  const seasonSummaries = Object.entries(seasonGroups)
    .sort(([a], [b]) => b - a)
    .map(([year, races]) => {
      const pts = races.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)
      const w = races.filter(r => r.position === 1).length
      const pod = races.filter(r => r.position <= 3).length
      const isChamp = champYears.includes(Number(year))
      const teamMap = {}
      races.forEach(r => {
        if (r.teams?.name) teamMap[r.teams.name] = r.teams
      })
      const teams = Object.values(teamMap)
      return { year, pts, wins: w, podiums: pod, races: races.length, isChamp, teams }
    })

  const activeTabs = champYears.length > 0 ? TABS : TABS.filter(t => t.id !== 'championships')

  return (
    <div className="space-y-6">
      {/* ── Cinematic banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl noise-overlay"
        style={{ minHeight: 280 }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a0008 0%, #0f0010 50%, #0a0a0f 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 100% at 80% 50%, rgba(225,6,0,0.12) 0%, transparent 70%)' }} />

        {driver.image_url && (
          <div className="absolute right-0 bottom-0 h-full w-1/2 md:w-2/5 pointer-events-none">
            <img src={driver.image_url} alt={driver.name}
              className="absolute bottom-0 right-0 h-full w-full object-contain object-bottom"
              style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 40%, transparent 100%)' }}
            />
          </div>
        )}

        <div className="relative z-10 p-8 md:p-10 flex flex-col justify-end" style={{ minHeight: 280 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-3">
              {driver.code && <Badge color="red">{driver.code}</Badge>}
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ letterSpacing: '-0.04em' }}>{driver.name}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              {driver.nationality && (
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'rgba(245,245,247,0.55)' }}>
                  {driver.flag_url ? <img src={driver.flag_url} alt={driver.nationality} className="h-4 w-auto rounded-sm" /> : '🌍'}
                  {driver.nationality}
                </span>
              )}
              {driver.dob && (
                <span className="text-sm font-medium" style={{ color: 'rgba(245,245,247,0.55)' }}>
                  🎂 {new Date(driver.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              <Link to={`/compare?a=${id}`} className="btn-ghost text-xs py-1.5 px-3 ml-auto">Compare</Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Metrics ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
        className="grid grid-cols-4 gap-3"
      >
        {[
          { label: 'Wins', value: wins },
          { label: 'Podiums', value: podiums },
          { label: 'Poles', value: poles },
          { label: 'Points', value: totalPoints.toFixed(0) },
        ].map(m => (
          <div key={m.label} className="apple-card p-4 text-center">
            <div className="metric-value">{m.value}</div>
            <div className="metric-label mt-1">{m.label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-raised)' }}>
        {activeTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
            {t.id === 'championships' && <Trophy size={11} className="inline mr-1" />}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Performance ── */}
        {tab === 'performance' && (
          <motion.div key="performance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Points Per Race</p>
              <PerformanceChart data={chartData} dataKey="points" label="Points" />
            </Card>
          </motion.div>
        )}

        {/* ── Results ── */}
        {tab === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="space-y-4">
            {results.length === 0
              ? <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No race results for this driver.</p></Card>
              : Object.keys(seasonGroups).sort((a, b) => b - a).map(year => (
                <Card key={year} className="p-0 overflow-hidden">
                  <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Season {year}</span>
                    {champYears.includes(Number(year)) && (
                      <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">🏆 Champion</span>
                    )}
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr style={{ fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                        <th className="text-left py-2 pl-5">Race</th>
                        <th className="text-center py-2">Pos</th>
                        <th className="text-center py-2 hidden sm:table-cell">Grid</th>
                        <th className="text-center py-2">Pts</th>
                        <th className="text-left py-2 pr-5">Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonGroups[year].map(r => (
                        <tr key={r.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="py-2 pl-5">
                            <Link to={`/race/${r.race_id}`} className="text-xs font-medium hover:text-f1red transition-colors">
                              {r.races?.name?.replace('Grand Prix', 'GP') || '—'}
                            </Link>
                          </td>
                          <td className="py-2 text-center">
                            <span className={`text-xs font-bold ${r.position === 1 ? 'pos-1' : r.position <= 3 ? 'pos-2' : ''}`}
                              style={{ color: r.position > 3 ? 'var(--text-secondary)' : undefined }}>
                              {r.position ?? '—'}
                            </span>
                          </td>
                          <td className="py-2 text-center text-xs hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                          <td className="py-2 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{r.points ?? 0}</td>
                          <td className="py-2 pr-5">
                            <div className="flex items-center gap-1.5">
                              {r.teams?.logo_url
                                ? <img src={r.teams.logo_url} alt={r.teams.name} className="h-4 w-auto object-contain shrink-0" />
                                : null
                              }
                              <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{r.teams?.name || '—'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ))
            }
          </motion.div>
        )}

        {/* ── Championships ── */}
        {tab === 'championships' && (
          <motion.div key="championships" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="space-y-4">

            {/* Champion years hero */}
            {champYears.length > 0 && (
              <div className="apple-card p-6 flex items-center gap-5 flex-wrap"
                style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(5,5,8,0) 100%)', borderColor: 'rgba(234,179,8,0.2)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: 'rgba(234,179,8,0.12)' }}>🏆</div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(234,179,8,0.7)' }}>World Champion</div>
                  <div className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>
                    {champYears.sort().join(' · ')}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {champYears.length} World Championship{champYears.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Season-by-season breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {seasonSummaries.map(s => (
                <motion.div key={s.year}
                  whileHover={{ y: -2, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="apple-card p-5"
                  style={s.isChamp ? { borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.04)' } : {}}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black" style={{ letterSpacing: '-0.04em' }}>{s.year}</span>
                      {s.isChamp && (
                        <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">🏆 Champion</span>
                      )}
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.races} races</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Points', value: s.pts.toFixed(0) },
                      { label: 'Wins', value: s.wins },
                      { label: 'Podiums', value: s.podiums },
                      { label: 'Races', value: s.races },
                    ].map(m => (
                      <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                        <div className="text-base font-black" style={{ letterSpacing: '-0.04em' }}>{m.value}</div>
                        <div className="text-xs font-medium uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {s.teams.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.teams.map(team => (
                        <div key={team.name} className="flex items-center gap-1.5">
                          {team.logo_url
                            ? <img src={team.logo_url} alt={team.name} className="h-5 w-auto object-contain" />
                            : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.name}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
