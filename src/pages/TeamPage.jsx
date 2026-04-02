import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { resolveImageSrc } from '../lib/resolveImageSrc'
import { Spinner, StatCard, Card } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { BarChart2, Flag, Trophy, ExternalLink, MapPin } from 'lucide-react'
import { formatPeriod } from '../utils/formatPeriod'
import { useSettingsStore } from '../store/settingsStore'

function Icon({ settingKey, emoji }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={resolveImageSrc(url) || url} alt="" className="inline-block w-4 h-4 object-contain" />
    : <span>{emoji}</span>
}

function normalizeWebsiteUrl(url) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizeSocialUrl(platform, value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const v = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (v.includes('instagram.com') || v.includes('twitter.com') || v.includes('x.com')) return `https://${v}`

  if (platform === 'instagram') return `https://instagram.com/${v}`
  return `https://x.com/${v}`
}

export default function TeamPage() {
  const { id } = useParams()
  const { fetchTeam, fetchAllChampionships } = useDataStore()
  const [team, setTeam] = useState(null)
  const [results, setResults] = useState([])
  const [poleRows, setPoleRows] = useState([])
  const [champYears, setChampYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [partners, setPartners] = useState([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [t, champs] = await Promise.all([fetchTeam(id), fetchAllChampionships()])
        if (cancelled) return
        setTeam(t)
        setChampYears(champs.teamChamps[id] || [])
        const [{ data }, { data: poles }] = await Promise.all([
          supabase
            .from('results')
            .select('*, drivers(id, name, code, image_url, flag_url, nationality, is_active), races(id, name, date, round, circuit_id, circuits(id, name), seasons(year))')
            .eq('team_id', id)
            .order('races(date)', { ascending: false }),
          supabase
            .from('qualifying_results')
            .select('race_id, races(circuit_id, circuits(id, name))')
            .eq('team_id', id)
            .eq('position', 1),
        ])
        if (cancelled) return
        setResults(data || [])
        setPoleRows(poles || [])
        supabase.from('team_partners').select('*').eq('team_id', id).order('sort_order').order('created_at')
          .then(({ data: p }) => { if (!cancelled) setPartners(p || []) })
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

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

  const driverStints = useMemo(() => {
    const map = {}
    let latestYear = null

    for (const r of results) {
      const driverId = r.driver_id
      if (!driverId) continue
      const year = r.races?.seasons?.year
      if (typeof year === 'number') latestYear = latestYear === null ? year : Math.max(latestYear, year)

      if (!map[driverId]) {
        map[driverId] = { driverId, driver: r.drivers || null, minYear: null, maxYear: null, races: 0 }
      }
      const row = map[driverId]
      row.races += 1
      if (typeof year === 'number') {
        row.minYear = row.minYear === null ? year : Math.min(row.minYear, year)
        row.maxYear = row.maxYear === null ? year : Math.max(row.maxYear, year)
      }
      if (!row.driver?.name && r.drivers?.name) row.driver = r.drivers
    }

    const formatPeriod = (minYear, maxYear, isCurrent) => { // fixed
      if (!minYear) return 'â€”'
      if (isCurrent && latestYear !== null && maxYear === latestYear) return `${minYear}-Present`
      if (!maxYear || minYear === maxYear) return String(minYear)
      return `${minYear}-${maxYear}`
    }

    const list = Object.values(map)
      .map(s => ({
        ...s,
        isCurrent: latestYear !== null && s.maxYear === latestYear,
        period: formatPeriod(s.minYear, s.maxYear, latestYear !== null && s.maxYear === latestYear),
      }))
      .sort((a, b) =>
        (b.isCurrent - a.isCurrent) ||
        ((b.maxYear || 0) - (a.maxYear || 0)) ||
        (b.races - a.races) ||
        String(a.driver?.name || '').localeCompare(String(b.driver?.name || ''))
      )

    return { list, latestYear }
  }, [results])

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

  const circuitRecords = useMemo(() => {
    const map = {}

    for (const r of results) {
      const circuitId = r?.races?.circuit_id
      const circuitName = r?.races?.circuits?.name
      if (!circuitId) continue

      if (!map[circuitId]) map[circuitId] = { circuitId, circuitName: circuitName || '—', wins: 0, podiums: 0, poles: 0, races: 0 }
      map[circuitId].races += 1
      if (r.position === 1) map[circuitId].wins += 1
      if (r.position && r.position <= 3) map[circuitId].podiums += 1
    }

    for (const p of poleRows) {
      const circuitId = p?.races?.circuit_id
      const circuitName = p?.races?.circuits?.name
      if (!circuitId) continue
      if (!map[circuitId]) map[circuitId] = { circuitId, circuitName: circuitName || '—', wins: 0, podiums: 0, poles: 0, races: 0 }
      map[circuitId].poles += 1
    }

    return Object.values(map)
      .sort((a, b) =>
        (b.wins - a.wins) ||
        (b.podiums - a.podiums) ||
        (b.poles - a.poles) ||
        (b.races - a.races) ||
        String(a.circuitName).localeCompare(String(b.circuitName))
      )
      .slice(0, 30)
  }, [poleRows, results])

  if (loading) return <Spinner />
  if (!team) return <div className="text-secondary text-center py-16">Team not found.</div>

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'info', label: 'Info' },
    { id: 'results', label: 'Results' },
    { id: 'records', label: 'Records' },
    ...(partners.length > 0 ? [{ id: 'partners', label: 'Partners' }] : []),
    ...(champYears.length > 0 ? [{ id: 'championships', label: 'Championships' }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* ── Cinematic Banner ── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 280 }}>
        {team.hero_image_url
          ? <img src={team.hero_image_url} alt={team.name} className="absolute inset-0 w-full h-full object-cover object-center" />
          : <div className="absolute inset-0 bg-surface" />
        }
        {team.hero_image_url
          ? <div className="absolute inset-0 bg-gradient-to-t from-base/90 to-transparent" />
          : <div className="absolute inset-0 bg-radial-glow from-accent/10 via-transparent to-transparent" />
        }
      </div>

      {/* ── Team Header ── */}
      <div className="flex flex-col items-center text-center gap-3 py-2">
        {(team.detail_logo_url || team.logo_url) && (
          <img src={team.detail_logo_url || team.logo_url} alt={team.name} className="w-32 h-32 object-contain" />
        )}
        <h1 className="text-3xl md:text-4xl font-black" style={{ letterSpacing: '-0.04em' }}>{team.name}</h1>
        {team.nationality && (
          <span className="flex items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {team.flag_url && <img src={team.flag_url} alt={team.nationality} className="h-4 w-auto rounded-sm" />}
            {team.nationality}
          </span>
        )}
        {team.base && (
          <span className="flex items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={13} /> {team.base}
          </span>
        )}
        {team.founded && (
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Est. {team.founded}</span>
        )}
        <div className="flex gap-2 flex-wrap justify-center mt-1">
          {team.instagram_url && (
            <a href={normalizeSocialUrl('instagram', team.instagram_url)} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap">
              <img src="/Instagram_icon.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Instagram
            </a>
          )}
          {team.twitter_url && (
            <a href={normalizeSocialUrl('twitter', team.twitter_url)} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap">
              <img src="/twitter%20logo.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Twitter
            </a>
          )}
          {team.website_url && (
            <a href={normalizeWebsiteUrl(team.website_url)} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap">
              <ExternalLink size={12} /> Visit website
            </a>
          )}
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
        <div className="space-y-4">
          {driverStints.list.length === 0 ? (
            <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No drivers found.</p></Card>
          ) : (
            <>
              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Current Drivers</span>
                  {driverStints.latestYear && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>({driverStints.latestYear})</span>
                  )}
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      <th className="text-left py-2 pl-5">Driver</th>
                      <th className="text-right py-2">Period</th>
                      <th className="text-right py-2 pr-5">Races</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverStints.list.filter(x => x.isCurrent).map(x => (
                      <tr key={x.driverId} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2.5 pl-5">
                          <Link to={`/driver/${x.driverId}`} className="flex items-center gap-2 min-w-0 hover:text-f1red transition-colors">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                              {x.driver?.image_url
                                ? <img src={x.driver.image_url} alt={x.driver?.name || 'Driver'} className="w-full h-full object-cover object-top" loading="lazy" />
                                : <div className="w-full h-full flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{x.driver?.code || '?'}</div>
                              }
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{x.driver?.name || '—'}</div>
                              <div className="text-xs font-bold text-f1red">{x.driver?.code || '—'}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5 text-right text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{x.period}</td>
                        <td className="py-2.5 pr-5 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{x.races}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Previous Drivers</span>
                </div>
                {driverStints.list.filter(x => !x.isCurrent).length === 0 ? (
                  <p className="text-sm px-5 py-6" style={{ color: 'var(--text-muted)' }}>No previous drivers found.</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <th className="text-left py-2 pl-5">Driver</th>
                        <th className="text-right py-2">Period</th>
                        <th className="text-right py-2 pr-5">Races</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverStints.list.filter(x => !x.isCurrent).map(x => (
                        <tr key={x.driverId} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-2.5 pl-5">
                            <Link to={`/driver/${x.driverId}`} className="flex items-center gap-2 min-w-0 hover:text-f1red transition-colors">
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                                {x.driver?.image_url
                                  ? <img src={x.driver.image_url} alt={x.driver?.name || 'Driver'} className="w-full h-full object-cover object-top" loading="lazy" />
                                  : <div className="w-full h-full flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{x.driver?.code || '?'}</div>
                                }
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{x.driver?.name || '—'}</div>
                                <div className="text-xs font-bold text-f1red">{x.driver?.code || '—'}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-2.5 text-right text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{x.period}</td>
                          <td className="py-2.5 pr-5 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{x.races}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}
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
              {team.team_boss && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Team Boss</p>
                  <p className="text-sm font-medium">{team.team_boss}</p>
                </div>
              )}
              {team.engine_manufacturer && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Engine Manufacturer</p>
                  <p className="text-sm font-medium">{team.engine_manufacturer}</p>
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
          {!team.full_name && !team.founded && !team.bio && !team.team_boss && !team.engine_manufacturer && (
            <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No team info added yet.</p></Card>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {tab === 'records' && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Circuit Records</span>
          </div>
          {circuitRecords.length === 0 ? (
            <p className="text-sm px-5 py-6" style={{ color: 'var(--text-muted)' }}>No circuit records yet.</p>
          ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left py-2 pl-5">Circuit</th>
                    <th className="text-right py-2 whitespace-nowrap">Wins</th>
                    <th className="text-right py-2 whitespace-nowrap">Podiums</th>
                    <th className="text-right py-2 pr-5 whitespace-nowrap">Poles</th>
                  </tr>
                </thead>
                <tbody>
                  {circuitRecords.map(row => (
                    <tr key={row.circuitId} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2.5 pl-5 min-w-0">
                        <Link to={`/circuit/${row.circuitId}`} className="hover:text-f1red transition-colors font-medium" style={{ fontSize: 13 }}>
                          {row.circuitName}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.wins}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.podiums}</td>
                      <td className="py-2.5 pr-5 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.poles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
        </Card>
      )}

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
                    const posColor = r.position === 1 ? 'pos-1' : r.position === 2 ? 'pos-2' : r.position === 3 ? 'pos-3' : ''
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
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

      {tab === 'partners' && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Partners</p>
          <div className="flex flex-wrap gap-6 items-center">
            {partners.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-2">
                <img src={p.logo_url} alt={p.name || 'Partner'} className="h-12 w-auto max-w-[120px] object-contain" />
                {p.name && <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{p.name}</span>}
              </div>
            ))}
          </div>
        </Card>
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
