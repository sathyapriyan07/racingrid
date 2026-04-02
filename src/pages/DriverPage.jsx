import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { resolveImageSrc } from '../lib/resolveImageSrc'
import { Spinner, Card, Badge } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { Trophy, ChevronDown, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

function Icon({ settingKey, emoji, className = '' }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={resolveImageSrc(url) || url} alt="" className={`inline-block w-4 h-4 object-contain ${className}`} />
    : <span>{emoji}</span>
}

function SeasonCard({ year, races, isChamp, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const wins = races.filter(r => r.position === 1).length
  const pts = races.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)

  return (
    <div className="apple-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center gap-3 transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Season {year}</span>
        {isChamp && (
          <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">🏆 Champion</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{races.length} races</span>
          {wins > 0 && <span className="text-xs font-semibold text-f1red">{wins}W</span>}
          <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pts.toFixed(0)} pts</span>
          <ChevronDown
            size={14}
            style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <table className="w-full table-fixed">
            <thead>
              <tr style={{ fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2 pl-5 w-[52%]">Race</th>
                <th className="text-center py-2 w-12 whitespace-nowrap">Pos</th>
                <th className="text-center py-2 w-14 whitespace-nowrap hidden sm:table-cell">Grid</th>
                <th className="text-center py-2 w-12 whitespace-nowrap">Pts</th>
                <th className="text-left py-2 pr-5 w-[36%]">Team</th>
              </tr>
            </thead>
            <tbody>
              {races.map(r => (
                <tr key={r.id} className="hover:bg-muted transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 pl-5">
                    <Link to={`/race/${r.race_id}`} className="text-xs font-medium hover:text-f1red transition-colors block truncate" title={r.races?.name || ''}>
                      {r.races?.name?.replace('Grand Prix', 'GP') || '—'}
                    </Link>
                  </td>
                  <td className="py-2 text-center tabular-nums whitespace-nowrap">
                    <span className={`text-xs font-bold ${r.position === 1 ? 'pos-1' : r.position <= 3 ? 'pos-2' : ''}`}
                      style={{ color: r.position > 3 ? 'var(--text-secondary)' : undefined }}>
                      {r.position ?? '—'}
                    </span>
                  </td>
                  <td className="py-2 text-center text-xs tabular-nums whitespace-nowrap hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                  <td className="py-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{r.points ?? 0}</td>
                  <td className="py-2 pr-5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {r.teams?.logo_url && <img src={r.teams.logo_url} alt={r.teams.name} className="h-4 w-auto object-contain shrink-0" loading="lazy" />}
                      <span className="text-xs hidden sm:inline truncate min-w-0 flex-1" style={{ color: 'var(--text-muted)' }}>{r.teams?.name || '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'teams', label: 'Teams' },
  { id: 'teammates', label: 'Teammates' },
  { id: 'performance', label: 'Performance' },
  { id: 'records', label: 'Records' },
  { id: 'biography', label: 'Biography' },
  { id: 'championships', label: 'Championships' },
]

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

export default function DriverPage() {
  const { id } = useParams()
  const { fetchDriver, fetchDriverStats, fetchAllChampionships } = useDataStore()
  const [driver, setDriver] = useState(null)
  const [results, setResults] = useState([])
  const [champYears, setChampYears] = useState([])
  const [poleRows, setPoleRows] = useState([])
  const [driverLaps, setDriverLaps] = useState([])
  const [allTeamResults, setAllTeamResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('results')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchDriver(id),
      fetchDriverStats(id),
      fetchAllChampionships(),
      supabase
        .from('qualifying_results')
        .select('race_id, races(circuit_id, circuits(id, name))')
        .eq('driver_id', id)
        .eq('position', 1)
        .then(({ data }) => data || []),
      supabase
        .from('laps')
        .select('race_id, lap_time')
        .eq('driver_id', id)
        .not('lap_time', 'is', null)
        .then(({ data }) => data || []),
    ])
      .then(([d, r, champs, p, driverLaps]) => {
        if (cancelled) return
        setDriver(d)
        setResults(r || [])
        setChampYears(champs.driverChamps[id] || [])
        setPoleRows(p || [])
        setDriverLaps(driverLaps || [])
        // fetch all results for teams this driver raced with, to compute teammates
        const teamIds = [...new Set((r || []).map(x => x.team_id).filter(Boolean))]
        if (!teamIds.length) return
        supabase
          .from('results')
          .select('driver_id, team_id, position, points, races(season_id, seasons(year)), drivers(id, name, code, image_url)')
          .in('team_id', teamIds)
          .neq('driver_id', id)
          .then(({ data }) => { if (!cancelled) setAllTeamResults(data || []) })
      })
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const wins = results.filter(r => r.position === 1).length
  const podiums = results.filter(r => r.position <= 3).length
  const poles = results.filter(r => r.grid === 1).length
  const totalPoints = results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)
  const fastestLaps = useMemo(() => {
    // Group all laps by race, find min lap_time per race, count races where this driver has the min
    const byRace = {}
    for (const lap of driverLaps) {
      if (!lap.race_id || !lap.lap_time) continue
      if (!byRace[lap.race_id] || lap.lap_time < byRace[lap.race_id]) {
        byRace[lap.race_id] = lap.lap_time
      }
    }
    // fallback: also count status-based if no lap data
    const fromStatus = results.filter(r => /fastest.?lap/i.test(r.status || '')).length
    return Object.keys(byRace).length > 0 ? Object.keys(byRace).length : fromStatus
  }, [driverLaps, results])

  const racesByDate = results
    .filter(r => r.races?.date)
    .sort((a, b) => new Date(a.races.date) - new Date(b.races.date))
  const winsByDate = racesByDate.filter(r => r.position === 1)

  const fmtRace = (r) => r ? `${r.races?.name?.replace(' Grand Prix', ' GP') || '—'} (${r.races?.seasons?.year || '—'})` : '—'

  const milestones = [
    { label: 'Wins', value: wins },
    { label: 'Podiums', value: podiums },
    { label: 'Poles', value: poles },
    { label: 'Points', value: totalPoints.toFixed(0) },
    { label: 'Fastest Laps', value: fastestLaps },
    { label: 'First Entry', value: racesByDate.length ? fmtRace(racesByDate[0]) : '—', raceId: racesByDate[0]?.race_id },
    { label: 'First Win', value: winsByDate.length ? fmtRace(winsByDate[0]) : '—', raceId: winsByDate[0]?.race_id },
    { label: 'Last Win', value: winsByDate.length ? fmtRace(winsByDate[winsByDate.length - 1]) : '—', raceId: winsByDate[winsByDate.length - 1]?.race_id },
    { label: 'Last Entry', value: racesByDate.length ? fmtRace(racesByDate[racesByDate.length - 1]) : '—', raceId: racesByDate[racesByDate.length - 1]?.race_id },
  ]

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

  const seasonSummaries = Object.entries(seasonGroups)
    .sort(([a], [b]) => b - a)
    .map(([year, races]) => {
      const pts = races.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)
      const w = races.filter(r => r.position === 1).length
      const pod = races.filter(r => r.position <= 3).length
      const isChamp = champYears.includes(Number(year))
      const teamMap = {}
      races.forEach(r => { if (r.teams?.name) teamMap[r.teams.name] = r.teams })
      return { year, pts, wins: w, podiums: pod, races: races.length, isChamp, teams: Object.values(teamMap) }
    })

  const teamStints = useMemo(() => {
    const map = {}
    let latestYear = null
    let currentTeamId = null

    for (const r of results) {
      const teamId = r.team_id
      const year = r.races?.seasons?.year
      if (typeof year === 'number') latestYear = latestYear === null ? year : Math.max(latestYear, year)
      if (teamId) currentTeamId = teamId
      if (!teamId) continue

      if (!map[teamId]) {
        map[teamId] = { teamId, team: r.teams || null, minYear: null, maxYear: null, races: 0, wins: 0 }
      }

      const row = map[teamId]
      row.races += 1
      if (r.position === 1) row.wins += 1
      if (typeof year === 'number') {
        row.minYear = row.minYear === null ? year : Math.min(row.minYear, year)
        row.maxYear = row.maxYear === null ? year : Math.max(row.maxYear, year)
      }
      if (!row.team?.name && r.teams?.name) row.team = r.teams
    }

    const formatPeriod = (minYear, maxYear, isCurrent) => {
      if (!minYear) return 'â€”'
      if (isCurrent && latestYear !== null && maxYear === latestYear) return `${minYear}â€“Present`
      if (!maxYear || minYear === maxYear) return String(minYear)
      return `${minYear}â€“${maxYear}`
    }

    const list = Object.values(map)
      .map(s => ({
        ...s,
        isCurrent: !!currentTeamId && s.teamId === currentTeamId,
        period: formatPeriod(s.minYear, s.maxYear, !!currentTeamId && s.teamId === currentTeamId),
      }))
      .sort((a, b) =>
        (b.isCurrent - a.isCurrent) ||
        ((b.maxYear || 0) - (a.maxYear || 0)) ||
        (b.races - a.races) ||
        String(a.team?.name || '').localeCompare(String(b.team?.name || ''))
      )

    return { list, currentTeamId }
  }, [results])

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

  const teammates = useMemo(() => {
    // Build a set of (teamId, year) pairs this driver raced in
    const myStints = new Set(results.map(r => `${r.team_id}__${r.races?.seasons?.year}`))

    const map = {}
    for (const r of allTeamResults) {
      const key = `${r.team_id}__${r.races?.seasons?.year}`
      if (!myStints.has(key)) continue // only same team + same season
      const driverId = r.driver_id
      if (!driverId) continue
      if (!map[driverId]) {
        map[driverId] = { driverId, driver: r.drivers || null, seasons: new Set(), races: 0, wins: 0, podiums: 0, points: 0 }
      }
      const row = map[driverId]
      if (r.races?.seasons?.year) row.seasons.add(r.races.seasons.year)
      row.races += 1
      if (r.position === 1) row.wins += 1
      if (r.position && r.position <= 3) row.podiums += 1
      row.points += parseFloat(r.points) || 0
    }

    return Object.values(map)
      .map(t => ({ ...t, seasons: [...t.seasons].sort((a, b) => b - a) }))
      .sort((a, b) => b.seasons.length - a.seasons.length || b.races - a.races)
  }, [allTeamResults, results])

  if (loading) return <Spinner />
  if (!driver) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Driver not found.</div>

  const activeTabs = [
    ...TABS.filter(t => t.id !== 'championships' || champYears.length > 0),
    ...(!driver.biography ? TABS.filter(t => t.id === 'biography') : []),
  ].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)

  return (
    <div className="space-y-6">
      {/* ── Banner ── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 320 }}>
        {/* Hero image full-bleed */}
        {driver.hero_image_url
          ? <img src={driver.hero_image_url} alt={driver.name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          : <div className="absolute inset-0 bg-surface" />
        }
        {driver.hero_image_url
          ? <div className="absolute inset-0 bg-gradient-to-t from-base/90 to-transparent" />
          : <div className="absolute inset-0 bg-radial-glow from-accent/10 via-transparent to-transparent" />
        }
      </div>

      {/* ── Driver Info (below hero) ── */}
      <div className="apple-card p-6 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            {driver.code && <Badge color="red">{driver.code}</Badge>}
            <h1 className="text-3xl md:text-4xl font-black" style={{ letterSpacing: '-0.04em' }}>{driver.name}</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
            {driver.nationality && (
              <span className="flex items-center gap-1.5 font-medium">
                {driver.flag_url ? <img src={driver.flag_url} alt={driver.nationality} className="h-4 w-auto rounded-sm" /> : <Icon settingKey="icon_flag" emoji="🌍" />}
                {driver.nationality}
              </span>
            )}
            {driver.dob && (
              <span className="flex items-center gap-1.5 font-medium">
                {new Date(driver.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto sm:justify-end">
          {driver.instagram_url && (
            <a
              href={normalizeSocialUrl('instagram', driver.instagram_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap"
              aria-label="Instagram"
              title="Instagram"
            >
              <img src="/Instagram_icon.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Instagram
            </a>
          )}
          {driver.twitter_url && (
            <a
              href={normalizeSocialUrl('twitter', driver.twitter_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap"
              aria-label="Twitter"
              title="Twitter"
            >
              <img src="/twitter%20logo.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Twitter
            </a>
          )}
          {driver.website_url && (
            <a
              href={normalizeWebsiteUrl(driver.website_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap"
            >
              <ExternalLink size={12} /> Visit website
            </a>
          )}
          <Link to={`/compare?a=${id}`} className="btn-ghost text-xs py-1.5 px-3">Compare</Link>
        </div>
      </div>

      {/* ── Milestones ── */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full">
          <tbody>
            {milestones.map((m, i) => (
              <tr key={m.label} style={{ borderBottom: i < milestones.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="py-2.5 pl-5 text-xs font-semibold uppercase tracking-widest w-32 shrink-0" style={{ color: 'var(--text-muted)' }}>{m.label}</td>
                <td className="py-2.5 pr-5 text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                  {m.raceId
                    ? <Link to={`/race/${m.raceId}`} className="hover:text-f1red transition-colors">{m.value}</Link>
                    : m.value
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        {activeTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
            {t.id === 'championships' && <Trophy size={11} className="inline mr-1" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Performance ── */}
      {tab === 'performance' && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Points Per Race</p>
          <PerformanceChart data={chartData} dataKey="points" label="Points" />
        </Card>
      )}

      {/* â”€â”€ Teams â”€â”€ */}
      {tab === 'teams' && (
        <div className="space-y-3">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Current Team</p>
            {teamStints.list.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No team data available for this driver.</p>
            ) : (
              (() => {
                const current = teamStints.list.find(s => s.isCurrent) || teamStints.list[0]
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {current.team?.logo_url
                        ? <img src={current.team.logo_url} alt={current.team?.name || 'Team'} className="w-10 h-10 object-contain" loading="lazy" />
                        : <span className="text-sm font-black" style={{ color: 'var(--text-muted)' }}>{(current.team?.name || '?').slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <Link to={`/team/${current.teamId}`} className="text-sm font-bold hover:text-f1red transition-colors block truncate">
                        {current.team?.name || 'â€”'}
                      </Link>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {current.period} Â· {current.races} race{current.races !== 1 ? 's' : ''}{current.wins ? ` Â· ${current.wins} win${current.wins !== 1 ? 's' : ''}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Teams</span>
            </div>
            {teamStints.list.length === 0 ? (
              <p className="text-sm px-5 py-6" style={{ color: 'var(--text-muted)' }}>No teams found.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left py-2 pl-5">Team</th>
                    <th className="text-right py-2">Period</th>
                    <th className="text-right py-2 pr-5">Races</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStints.list.map(s => (
                    <tr key={s.teamId} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2.5 pl-5">
                        <Link to={`/team/${s.teamId}`} className="flex items-center gap-2 min-w-0 hover:text-f1red transition-colors">
                          {s.team?.logo_url && <img src={s.team.logo_url} alt={s.team?.name || 'Team'} className="h-4 w-auto object-contain shrink-0" loading="lazy" />}
                          <span className="text-sm font-medium truncate">{s.team?.name || 'â€”'}</span>
                          {s.isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'rgba(34,197,94,0.25)', color: 'rgb(34,197,94)', background: 'rgba(34,197,94,0.08)' }}>Current</span>}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.period}</td>
                      <td className="py-2.5 pr-5 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.races}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === 'teammates' && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Teammates</span>
          </div>
          {teammates.length === 0 ? (
            <p className="text-sm px-5 py-6" style={{ color: 'var(--text-muted)' }}>No teammates found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pl-5">Driver</th>
                  <th className="text-right py-2 whitespace-nowrap">Seasons</th>
                  <th className="text-right py-2 whitespace-nowrap hidden sm:table-cell">Races</th>
                  <th className="text-right py-2 whitespace-nowrap hidden sm:table-cell">Wins</th>
                  <th className="text-right py-2 pr-5 whitespace-nowrap">Pts</th>
                </tr>
              </thead>
              <tbody>
                {teammates.map(t => (
                  <tr key={t.driverId} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 pl-5">
                      <Link to={`/driver/${t.driverId}`} className="flex items-center gap-2 min-w-0 hover:text-f1red transition-colors">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                          {t.driver?.image_url
                            ? <img src={t.driver.image_url} alt={t.driver?.name || ''} className="w-full h-full object-cover object-top" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{t.driver?.code || '?'}</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{t.driver?.name || '—'}</div>
                          <div className="text-xs font-bold text-f1red">{t.driver?.code || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {t.seasons.length === 1 ? t.seasons[0] : `${t.seasons[t.seasons.length - 1]}–${t.seasons[0]}`}
                    </td>
                    <td className="py-2.5 text-right text-sm font-semibold tabular-nums hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{t.races}</td>
                    <td className="py-2.5 text-right text-sm font-semibold tabular-nums hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{t.wins}</td>
                    <td className="py-2.5 pr-5 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{t.points.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

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

      {/* ── Biography ── */}
      {tab === 'biography' && (
        <Card>
          {driver.biography
            ? <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{driver.biography}</p>
            : <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No biography added yet.</p>
          }
        </Card>
      )}

      {/* ── Results ── */}
      {tab === 'results' && (
        <div className="space-y-3">
          {results.length === 0
            ? <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No race results for this driver.</p></Card>
            : Object.keys(seasonGroups).sort((a, b) => b - a).map((year, i) => (
              <SeasonCard
                key={year}
                year={year}
                races={seasonGroups[year]}
                isChamp={champYears.includes(Number(year))}
                defaultOpen={i === 0}
              />
            ))
          }
        </div>
      )}

      {/* ── Championships ── */}
      {tab === 'championships' && (
        <div className="space-y-4">
          {champYears.length > 0 && (
            <div className="apple-card p-6 flex items-center gap-5 flex-wrap"
              style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(5,5,8,0) 100%)', borderColor: 'rgba(234,179,8,0.2)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(234,179,8,0.12)' }}>
                <Icon settingKey="icon_trophy" emoji="🏆" className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(234,179,8,0.7)' }}>World Champion</div>
                <div className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>{champYears.sort().join(' · ')}</div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {champYears.length} World Championship{champYears.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seasonSummaries.map(s => (
              <div key={s.year} className="apple-card p-5"
                style={s.isChamp ? { borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.04)' } : {}}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black" style={{ letterSpacing: '-0.04em' }}>{s.year}</span>
                    {s.isChamp && (
                      <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">
                        <Icon settingKey="icon_trophy" emoji="🏆" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.races} races</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Pts', value: s.pts.toFixed(0) },
                    { label: 'Wins', value: s.wins },
                    { label: 'Pods', value: s.podiums },
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
                      <div key={team.name}>
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.name} className="h-5 w-auto object-contain" loading="lazy" />
                          : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.name}</span>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
