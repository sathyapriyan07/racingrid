import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, StatCard, Card } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { BarChart2, Flag, Trophy } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

function Icon({ settingKey, emoji }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={url} alt="" className="inline-block w-4 h-4 object-contain" />
    : <span>{emoji}</span>
}

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
          .select('*, drivers(id, name, code, image_url, flag_url, nationality, is_active), races(id, name, date, round, seasons(year))')
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
  const filteredResults = seasonFilter === 'all' ? results : results.filter(r => String(r.races?.seasons?.year) === seasonFilter)

  // Season summaries for championships tab
  const seasonSummaries = Object.entries(seasonData)
    .sort(([a], [b]) => b - a)
    .map(([year, data]) => ({
      year,
      pts: data.points,
      wins: data.wins,
      races: results.filter(r => String(r.races?.seasons?.year) === year).length,
      isChamp: champYears.includes(Number(year)),
    }))

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'info', label: 'Info' },
    { id: 'results', label: 'Results' },
    ...(champYears.length > 0 ? [{ id: 'championships', label: 'Championships' }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* ── Cinematic Banner ── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 280 }}>
        {team.hero_image_url
          ? <img src={team.hero_image_url} alt={team.name} className="absolute inset-0 w-full h-full object-cover object-center" />
          : <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #0a0a0f 100%)' }} />
        }
        <div className="absolute inset-0" style={{
          background: team.hero_image_url
            ? 'linear-gradient(to top, rgba(5,5,8,0.95) 0%, rgba(5,5,8,0.5) 50%, rgba(5,5,8,0.2) 100%)'
            : 'radial-gradient(ellipse 60% 100% at 20% 50%, rgba(225,6,0,0.1) 0%, transparent 70%)'
        }} />

        <div className="relative z-10 p-8 md:p-10 flex flex-col justify-end" style={{ minHeight: 280 }}>
          <div className="flex items-end gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {team.logo_url
                ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-2" />
                : <span className="text-xl font-black" style={{ color: 'var(--text-muted)' }}>{team.name.slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black mb-2" style={{ letterSpacing: '-0.04em' }}>{team.name}</h1>
              <div className="flex gap-4 text-sm flex-wrap items-center" style={{ color: 'rgba(245,245,247,0.6)' }}>
                {team.nationality && (
                  <span className="flex items-center gap-1.5">
                    {team.flag_url
                      ? <img src={team.flag_url} alt={team.nationality} className="h-4 w-auto rounded-sm" />
                      : <Icon settingKey="icon_flag" emoji="🌍" />
                    }
                    {team.nationality}
                  </span>
                )}
                {team.base && <span className="flex items-center gap-1"><Icon settingKey="icon_location" emoji="📍" /> {team.base}</span>}
                {team.founded && <span>Est. {team.founded}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="apple-card p-4 text-center">
          <div className="metric-value">{wins}</div>
          <div className="metric-label mt-1">Wins</div>
        </div>
        <div className="apple-card p-4 text-center">
          <div className="metric-value">{podiums}</div>
          <div className="metric-label mt-1">Podiums</div>
        </div>
        <div className="apple-card p-4 text-center">
          <div className="metric-value">{totalPoints.toFixed(0)}</div>
          <div className="metric-label mt-1">Points</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
            {t.id === 'championships' && <Trophy size={11} className="inline mr-1" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <>
          {chartData.length > 0 && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Points by Season</p>
              <PerformanceChart data={chartData} dataKey="points" label="Points" />
            </Card>
          )}
          {drivers.length > 0 && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Drivers</p>
              <div className="flex flex-wrap gap-2">
                {drivers.slice(0, 6).map(d => (
                  <Link key={d.driver_id} to={`/driver/${d.driver_id}`}>
                    <div className="glass-hover flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
                      {d.image_url && <img src={d.image_url} alt={d.name} className="w-5 h-5 rounded-full object-cover object-top" />}
                      {d.code && <span className="text-f1red">{d.code}</span>}
                      {d.name}
                    </div>
                  </Link>
                ))}
                {drivers.length > 6 && (
                  <button onClick={() => setTab('drivers')} className="glass-hover px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    +{drivers.length - 6} more
                  </button>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Drivers ── */}
      {tab === 'drivers' && (
        <div>
          {drivers.length === 0
            ? <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No drivers found.</p></Card>
            : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {drivers.map(d => (
                  <Link key={d.driver_id} to={`/driver/${d.driver_id}`}>
                    <div className="apple-card overflow-hidden">
                      <div className="h-36 bg-white/4 overflow-hidden relative">
                        {d.image_url
                          ? <img src={d.image_url} alt={d.name} className="w-full h-full object-cover object-top" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: 'var(--text-muted)' }}>{d.code || '?'}</div>
                        }
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.75) 0%, transparent 55%)' }} />
                        {d.flag_url && (
                          <img src={d.flag_url} alt="" className="absolute bottom-2 right-2 h-4 w-auto rounded-sm shadow" loading="lazy" />
                        )}
                        {d.is_active && (
                          <span className="absolute top-2 left-2 text-xs bg-green-500/20 text-green-400 border border-green-500/25 px-1.5 py-0.5 rounded-full font-semibold" style={{ fontSize: 9 }}>Active</span>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-bold text-f1red">{d.code || '—'}</div>
                        <div className="text-xs font-semibold mt-0.5 leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{d.name}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{d.nationality || '—'}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── Info ── */}
      {tab === 'info' && (
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              {team.full_name && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Full Name</p>
                  <p className="text-sm font-medium">{team.full_name}</p>
                </div>
              )}
              {team.founded && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Founded</p>
                  <p className="text-sm font-medium">{team.founded}</p>
                </div>
              )}
              {team.base && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Base</p>
                  <p className="text-sm font-medium">{team.base}</p>
                </div>
              )}
              {team.nationality && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Nationality</p>
                  <div className="flex items-center gap-1.5">
                    {team.flag_url && <img src={team.flag_url} alt="" className="h-4 w-auto rounded-sm" />}
                    <p className="text-sm font-medium">{team.nationality}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
          {team.bio && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>About</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{team.bio}</p>
            </Card>
          )}
          {!team.full_name && !team.founded && !team.bio && (
            <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No team info added yet.</p></Card>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {tab === 'results' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSeasonFilter('all')} className={`tab-pill ${seasonFilter === 'all' ? 'active' : ''}`}>All</button>
            {seasons.map(yr => (
              <button key={yr} onClick={() => setSeasonFilter(String(yr))} className={`tab-pill ${seasonFilter === String(yr) ? 'active' : ''}`}>{yr}</button>
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
                  {filteredResults.map(r => {
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
                          <span className="ml-1.5" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{r.races?.seasons?.year}</span>
                        </td>
                        <td className="py-1.5" style={{ fontSize: 12 }}>
                          <Link to={`/driver/${r.driver_id}`} className="flex items-center gap-1.5 hover:text-f1red transition-colors">
                            {r.drivers?.image_url && <img src={r.drivers.image_url} alt={r.drivers.name} className="w-5 h-5 rounded-full object-cover object-top shrink-0" />}
                            <span className="hidden sm:inline">{r.drivers?.name || '—'}</span>
                            <span className="sm:hidden font-semibold">{r.drivers?.code || r.drivers?.name?.split(' ').pop() || '—'}</span>
                          </Link>
                        </td>
                        <td className="py-1.5 text-center hidden sm:table-cell" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                        <td className="py-1.5 text-right" style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.time || r.status || '—'}</td>
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

      {/* ── Championships ── */}
      {tab === 'championships' && (
        <div className="space-y-4">
          {/* Hero banner */}
          <div className="apple-card p-6 flex items-center gap-5 flex-wrap"
            style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(5,5,8,0) 100%)', borderColor: 'rgba(234,179,8,0.2)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(234,179,8,0.12)' }}>
              <Icon settingKey="icon_trophy" emoji="🏆" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(234,179,8,0.7)' }}>Constructors Champion</div>
              <div className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>{champYears.sort().join(' · ')}</div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {champYears.length} Constructors Championship{champYears.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Season cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seasonSummaries.map(s => (
              <div key={s.year} className="apple-card p-5"
                style={s.isChamp ? { borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.04)' } : {}}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black" style={{ letterSpacing: '-0.04em' }}>{s.year}</span>
                    {s.isChamp && (
                      <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">🏆</span>
                    )}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.races} races</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Pts', value: s.pts.toFixed(0) },
                    { label: 'Wins', value: s.wins },
                    { label: 'Races', value: s.races },
                  ].map(m => (
                    <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                      <div className="text-base font-black" style={{ letterSpacing: '-0.04em' }}>{m.value}</div>
                      <div className="text-xs font-medium uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
