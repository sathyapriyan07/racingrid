import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { resolveImageSrc } from '../lib/resolveImageSrc'
import { Spinner, Card, Badge, StatCard, Select, ErrorState, SkeletonHero, SkeletonTable, Tabs } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import TrendChart from '../components/charts/TrendChart'
import { Trophy, ChevronDown, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { buildQualiRaceDelta, calcConsistency, calcOvertakesFromLaps } from '../utils/insights'

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
  { id: 'team-champs', label: "Team's Champion" },
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
  const [qualifyingRows, setQualifyingRows] = useState([])
  const [champYears, setChampYears] = useState([])
  const [allTeamChamps, setAllTeamChamps] = useState({})
  const [poleRows, setPoleRows] = useState([])
  const [driverLaps, setDriverLaps] = useState([])
  const [allTeamResults, setAllTeamResults] = useState([])
  const [allTeamQualifying, setAllTeamQualifying] = useState([])
  const [perfYear, setPerfYear] = useState('all')
  const [perfLaps, setPerfLaps] = useState([])
  const [mateYear, setMateYear] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('results')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
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
      supabase
        .from('qualifying_results')
        .select('race_id, team_id, position, q1, q2, q3, races(id, name, date, round, seasons(year))')
        .eq('driver_id', id)
        .then(({ data }) => (data || []).sort((a, b) => (a.races?.date || '').localeCompare(b.races?.date || ''))),
    ])
      .then(([d, r, champs, p, driverLaps, qRows]) => {
        if (cancelled) return
        setDriver(d)
        setResults(r || [])
        setQualifyingRows(qRows || [])
        setChampYears(champs.driverChamps[id] || [])
        setAllTeamChamps(champs.teamChamps || {})
        setPoleRows(p || [])
        setDriverLaps(driverLaps || [])
        // fetch all results for teams this driver raced with, to compute teammates
        const teamIds = [...new Set((r || []).map(x => x.team_id).filter(Boolean))]
        const raceIds = [...new Set((r || []).map(x => x.race_id).filter(Boolean))]
        if (!teamIds.length) return
        supabase
          .from('results')
          .select('race_id, driver_id, team_id, position, grid, points, status, races(id, name, date, round, seasons(year)), drivers(id, name, code, image_url)')
          .in('race_id', raceIds)
          .in('team_id', teamIds)
          .neq('driver_id', id)
          .then(({ data }) => { if (!cancelled) setAllTeamResults(data || []) })

        supabase
          .from('qualifying_results')
          .select('race_id, driver_id, team_id, position, races(id, date, round, seasons(year)), drivers(id, name, code, image_url)')
          .in('race_id', raceIds)
          .in('team_id', teamIds)
          .neq('driver_id', id)
          .then(({ data }) => { if (!cancelled) setAllTeamQualifying(data || []) })
      })
      .catch((err) => { console.error(err); if (!cancelled) setError(err?.message || 'Failed to load driver') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    const years = [...new Set(results.map(r => r.races?.seasons?.year).filter(Boolean))].sort((a, b) => b - a)
    if (!years.length) return
    if (perfYear === 'all') setPerfYear(String(years[0]))
    if (mateYear === 'all') setMateYear(String(years[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  useEffect(() => {
    if (tab !== 'performance') return
    if (perfYear === 'all') { setPerfLaps([]); return }

    const yearNum = parseInt(perfYear, 10)
    const raceIds = results.filter(r => r.races?.seasons?.year === yearNum).map(r => r.race_id).filter(Boolean)
    if (!raceIds.length) { setPerfLaps([]); return }

    let cancelled = false
    supabase
      .from('laps')
      .select('race_id, lap_number, position')
      .eq('driver_id', id)
      .in('race_id', raceIds)
      .order('lap_number')
      .then(({ data }) => { if (!cancelled) setPerfLaps(data || []) })
      .catch(() => { if (!cancelled) setPerfLaps([]) })

    return () => { cancelled = true }
  }, [id, perfYear, results, tab])

  const wins = results.filter(r => r.position === 1).length
  const podiums = results.filter(r => r.position <= 3).length
  const poles = results.filter(r => r.grid === 1).length
  const totalPoints = results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)
  const fastestLaps = useMemo(() => {
    if (driver?.fastest_laps != null) return driver.fastest_laps
    const byRace = {}
    for (const lap of driverLaps) {
      if (!lap.race_id || !lap.lap_time) continue
      if (!byRace[lap.race_id] || lap.lap_time < byRace[lap.race_id]) byRace[lap.race_id] = lap.lap_time
    }
    const fromStatus = results.filter(r => /fastest.?lap/i.test(r.status || '')).length
    return Object.keys(byRace).length > 0 ? Object.keys(byRace).length : fromStatus
  }, [driver, driverLaps, results])

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

  const years = useMemo(() => (
    [...new Set(results.map(r => r.races?.seasons?.year).filter(Boolean))].sort((a, b) => b - a)
  ), [results])

  const perfResults = useMemo(() => {
    if (perfYear === 'all') return results
    const y = parseInt(perfYear, 10)
    return results.filter(r => r.races?.seasons?.year === y)
  }, [perfYear, results])

  const pointsChartData = useMemo(() => (
    perfResults.map(r => ({
      name: r.races?.name?.replace('Grand Prix', 'GP') || '?',
      points: parseFloat(r.points) || 0,
    }))
  ), [perfResults])

  const perfQuali = useMemo(() => {
    if (perfYear === 'all') return qualifyingRows
    const y = parseInt(perfYear, 10)
    return qualifyingRows.filter(r => r.races?.seasons?.year === y)
  }, [perfYear, qualifyingRows])

  const consistency = useMemo(() => calcConsistency(perfResults), [perfResults])

  const consistencyBadge = useMemo(() => {
    const tier = consistency.tier
    if (tier === 'Elite') return <Badge color="green">Elite</Badge>
    if (tier === 'Strong') return <Badge color="blue">Strong</Badge>
    if (tier === 'Mid') return <Badge color="yellow">Mid</Badge>
    return <Badge color="gray">Weak</Badge>
  }, [consistency.tier])

  const deltaRows = useMemo(() => buildQualiRaceDelta({ results: perfResults, qualifying: perfQuali }), [perfResults, perfQuali])

  const avgDelta = useMemo(() => {
    const rows = deltaRows.filter(r => r.delta != null)
    if (!rows.length) return null
    return rows.reduce((s, r) => s + (r.delta || 0), 0) / rows.length
  }, [deltaRows])

  const trendData = useMemo(() => {
    const rows = perfResults
      .filter(r => r.races?.round != null && r.position != null)
      .map(r => ({
        round: r.races.round,
        position: Number(r.position),
        race: r.races?.name?.replace(' Grand Prix', ' GP') || r.races?.name || 'Race',
      }))
      .sort((a, b) => (a.round || 0) - (b.round || 0))
    return rows
  }, [perfResults])

  const dnaTraits = useMemo(() => {
    const traits = []
    const rows = deltaRows.filter(r => r.delta != null)
    const avgRace = consistency.avgFinish

    // Consistent
    if (consistency.raceCount >= 6 && consistency.dnfRate <= 0.12 && avgRace != null && avgRace <= 8) traits.push({ label: 'Consistent', color: 'green' })

    // Quali vs Race
    if (rows.length >= 6) {
      const avg = rows.reduce((s, r) => s + r.delta, 0) / rows.length
      if (avg >= 1.2) traits.push({ label: 'Race specialist', color: 'green' })
      if (avg <= -1.2) traits.push({ label: 'Qualifying specialist', color: 'blue' })
    }

    // Aggressive (needs lap positions)
    const overtakesByRace = calcOvertakesFromLaps(perfLaps)
    const overtakeVals = Object.values(overtakesByRace)
    if (overtakeVals.length >= 2) {
      const avgOv = overtakeVals.reduce((s, v) => s + (v || 0), 0) / overtakeVals.length
      if (avgOv >= 4.5) traits.push({ label: 'Aggressive', color: 'red' })
    }

    if (!traits.length) traits.push({ label: 'Developing', color: 'gray' })
    return traits
  }, [consistency.avgFinish, consistency.dnfRate, consistency.raceCount, deltaRows, perfLaps])

  const headToHead = useMemo(() => {
    const year = parseInt(mateYear, 10)
    if (!Number.isFinite(year)) return []

    const ourSeasonResults = results.filter(r => r.races?.seasons?.year === year)
    if (!ourSeasonResults.length) return []

    const teamByRace = new Map(ourSeasonResults.map(r => [r.race_id, r.team_id]))
    const ourPosByRace = new Map(ourSeasonResults.map(r => [r.race_id, Number(r.position)]))

    const ourQualiByRace = new Map(
      qualifyingRows
        .filter(q => q.races?.seasons?.year === year)
        .map(q => [q.race_id, Number(q.position)])
    )

    const out = {}

    allTeamResults
      .filter(r => r?.race_id && r.races?.seasons?.year === year)
      .forEach(r => {
        const ourTeam = teamByRace.get(r.race_id)
        if (!ourTeam || r.team_id !== ourTeam) return
        const mateId = r.driver_id
        if (!mateId) return
        if (!out[mateId]) out[mateId] = { driverId: mateId, driver: r.drivers, races: 0, racesAhead: 0, quali: 0, qualiAhead: 0 }
        const matePos = Number(r.position)
        const ourPos = ourPosByRace.get(r.race_id)
        if (Number.isFinite(ourPos) && Number.isFinite(matePos)) {
          out[mateId].races++
          if (ourPos < matePos) out[mateId].racesAhead++
        }
      })

    allTeamQualifying
      .filter(q => q?.race_id && q.races?.seasons?.year === year)
      .forEach(q => {
        const ourTeam = teamByRace.get(q.race_id)
        if (!ourTeam || q.team_id !== ourTeam) return
        const mateId = q.driver_id
        if (!mateId) return
        if (!out[mateId]) out[mateId] = { driverId: mateId, driver: q.drivers, races: 0, racesAhead: 0, quali: 0, qualiAhead: 0 }
        const matePos = Number(q.position)
        const ourPos = ourQualiByRace.get(q.race_id)
        if (Number.isFinite(ourPos) && Number.isFinite(matePos)) {
          out[mateId].quali++
          if (ourPos < matePos) out[mateId].qualiAhead++
        }
      })

    return Object.values(out)
      .sort((a, b) => (b.races - a.races) || (b.quali - a.quali))
      .map(row => ({
        ...row,
        racesAheadPct: row.races ? Math.round((row.racesAhead / row.races) * 100) : null,
        qualiAheadPct: row.quali ? Math.round((row.qualiAhead / row.quali) * 100) : null,
      }))
  }, [allTeamQualifying, allTeamResults, mateYear, qualifyingRows, results])

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
      if (isCurrent && latestYear !== null && maxYear === latestYear) return `${minYear}-Present`
      if (!maxYear || minYear === maxYear) return String(minYear)
      return `${minYear}-${maxYear}`
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

  // Teams that won the WCC in a year this driver raced for them
  const teamChampions = useMemo(() => {
    const map = {} // teamId -> { team, years[] }
    for (const r of results) {
      const year = r.races?.seasons?.year
      const teamId = r.team_id
      if (!teamId || !year) continue
      if (!map[teamId]) map[teamId] = { teamId, team: r.teams, years: new Set() }
      map[teamId].years.add(year)
    }
    return Object.values(map)
      .map(entry => {
        const champYearsForTeam = (allTeamChamps[entry.teamId] || [])
          .filter(y => entry.years.has(y))
        return { ...entry, champYears: champYearsForTeam.sort((a, b) => a - b) }
      })
      .filter(entry => entry.champYears.length > 0)
      .sort((a, b) => a.champYears[0] - b.champYears[0])
  }, [results, allTeamChamps])

  const teammates = useMemo(() => {
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

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonHero />
        <SkeletonTable rows={7} cols={4} />
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!driver) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Driver not found.</div>

  const activeTabs = [
    ...TABS.filter(t => {
      if (t.id === 'championships') return champYears.length > 0
      if (t.id === 'team-champs') return teamChampions.length > 0
      return true
    }),
    ...(!driver.biography ? [] : []),
  ].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)

  return (
    <div className="space-y-6">
      {/* ── Driver Hero ── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 380 }}>
        {driver.hero_image_url
          ? <img src={driver.hero_image_url} alt={driver.name} className="absolute inset-0 w-full h-full object-cover object-center" />
          : driver.image_url
            ? <img src={driver.image_url} alt={driver.name} className="absolute inset-0 w-full h-full object-cover object-top" />
            : <div className="absolute inset-0" style={{ background: 'var(--bg-surface)' }} />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
      </div>

      {/* ── Driver Info (below banner) ── */}
      <div className="flex flex-col items-center text-center gap-2 py-2">
        {driver.code && (
          <span className="text-xs font-black tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(229,57,53,0.15)', color: 'var(--f1red, #e53935)', letterSpacing: '0.15em' }}>{driver.code}</span>
        )}
        <h1 className="text-3xl md:text-4xl font-black" style={{ letterSpacing: '-0.04em' }}>{driver.name}</h1>
        {driver.nationality && (
          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {driver.flag_url && <img src={driver.flag_url} alt={driver.nationality} className="h-4 w-auto rounded-sm" />}
            {driver.nationality}
          </span>
        )}
        {driver.dob && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {new Date(driver.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
        <div className="flex gap-2 flex-wrap justify-center mt-1">
          {driver.instagram_url && (
            <a href={normalizeSocialUrl('instagram', driver.instagram_url)} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap">
              <img src="/Instagram_icon.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Instagram
            </a>
          )}
          {driver.twitter_url && (
            <a href={normalizeSocialUrl('twitter', driver.twitter_url)} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap">
              <img src="/twitter%20logo.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Twitter
            </a>
          )}
          {driver.website_url && (
            <a href={normalizeWebsiteUrl(driver.website_url)} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap">
              <ExternalLink size={12} /> Visit website
            </a>
          )}
          <Link to={`/compare?a=${id}`} className="btn-ghost text-xs py-1.5 px-3 whitespace-nowrap">Compare</Link>
        </div>
      </div>

      {/* ── Milestones ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Season</div>
              <Select value={perfYear} onChange={e => setPerfYear(e.target.value)} className="h-9 text-sm mt-1">
                <option value="all">Career</option>
                {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Consistency</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-2xl font-black tabular-nums" style={{ letterSpacing: '-0.04em' }}>{consistency.score}</div>
                {consistencyBadge}
              </div>
            </div>
          </div>

          <div className="sm:hidden flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary">Consistency</span>
            <span className="text-sm font-black tabular-nums">{consistency.score}</span>
            {consistencyBadge}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <StatCard label="Avg Finish" value={consistency.avgFinish != null ? consistency.avgFinish.toFixed(1) : '—'} sub={perfYear === 'all' ? 'Career' : perfYear} />
          <StatCard label="DNFs" value={consistency.dnfCount} sub={`${consistency.raceCount} races`} />
          <StatCard label="Points" value={consistency.pointsFinishes} sub="Points finishes" />
          <StatCard label="Δ Quali→Race" value={avgDelta != null ? (avgDelta >= 0 ? `+${avgDelta.toFixed(1)}` : avgDelta.toFixed(1)) : '—'} sub="Avg positions" />
          <StatCard label="Tier" value={consistency.tier} sub="Consistency" />
        </div>
      </Card>

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
      <Tabs
        id={`driver-${id}`}
        items={activeTabs.map(t => ({ ...t, icon: t.id === 'championships' ? Trophy : undefined }))}
        value={tab}
        onChange={setTab}
      />

      {/* ── Performance ── */}
      {tab === 'performance' && (
        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Performance trend</p>
                <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>Finishing position by round (lower is better)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary">Season</span>
                <span className="text-xs font-bold tabular-nums">{perfYear === 'all' ? 'Career' : perfYear}</span>
              </div>
            </div>
            <TrendChart
              data={trendData}
              xKey="round"
              yKey="position"
              yReversed
              yDomain={[1, 'dataMax']}
              label="Finish"
            />
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Points per race</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary">Consistency</span>
                <span className="text-xs font-bold tabular-nums">{consistency.score}</span>
                {consistencyBadge}
              </div>
            </div>
            <PerformanceChart data={pointsChartData} dataKey="points" label="Points" />
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Qualifying vs race delta</div>
                <div className="text-xs mt-1 text-secondary">Positions gained/lost (Quali → Finish)</div>
              </div>
              <div className="text-xs font-semibold text-secondary tabular-nums">
                Avg: {avgDelta != null ? (avgDelta >= 0 ? `+${avgDelta.toFixed(1)}` : avgDelta.toFixed(1)) : '—'}
              </div>
            </div>
            {deltaRows.filter(r => r.qualiPos != null && r.racePos != null).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No qualifying data imported for this season.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left py-2 pl-5">Race</th>
                    <th className="text-right py-2 w-14">Q</th>
                    <th className="text-right py-2 w-14">R</th>
                    <th className="text-right py-2 pr-5 w-16">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {deltaRows
                    .filter(r => r.qualiPos != null && r.racePos != null)
                    .slice(-14)
                    .reverse()
                    .map(r => (
                      <tr key={r.raceId} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2.5 pl-5 min-w-0">
                          <Link to={`/race/${r.raceId}`} className="text-sm font-medium hover:text-f1red transition-colors block truncate">
                            {r.raceName?.replace(' Grand Prix', ' GP') || '—'}
                          </Link>
                          <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5 text-secondary">{r.year} · R{r.round}</div>
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-secondary">{r.qualiPos}</td>
                        <td className="py-2.5 text-right tabular-nums text-secondary">{r.racePos}</td>
                        <td className="py-2.5 pr-5 text-right tabular-nums font-bold">
                          {r.delta > 0 && <span className="text-green-400 inline-flex items-center gap-1"><ArrowUp size={12} /> {r.delta}</span>}
                          {r.delta < 0 && <span className="text-red-400 inline-flex items-center gap-1"><ArrowDown size={12} /> {Math.abs(r.delta)}</span>}
                          {r.delta === 0 && <span className="text-secondary">0</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Driver DNA</div>
                <div className="text-xs mt-1 text-secondary">Auto-generated traits (derived from imported data)</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dnaTraits.map(t => (
                  <Badge key={t.label} color={t.color}>{t.label}</Badge>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Races" value={consistency.raceCount} sub={perfYear === 'all' ? 'Career' : perfYear} />
              <StatCard label="Points rate" value={`${Math.round(consistency.pointsRate * 100)}%`} sub="Points finishes" />
              <StatCard label="DNF rate" value={`${Math.round(consistency.dnfRate * 100)}%`} sub="DNFs" />
              <StatCard label="Overtakes" value={Object.values(calcOvertakesFromLaps(perfLaps)).reduce((s, v) => s + (v || 0), 0) || '—'} sub="Estimated" />
            </div>
          </Card>
        </div>
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

          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Domination</div>
                <div className="text-xs mt-1 text-secondary">Races ahead % and qualifying ahead % vs teammates</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary">Season</span>
                <Select value={mateYear} onChange={e => setMateYear(e.target.value)} className="h-9 text-sm">
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </Select>
              </div>
            </div>

            {headToHead.length === 0 ? (
              <div className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Not enough teammate data for {mateYear}.</div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {headToHead.slice(0, 4).map(row => (
                  <Link key={row.driverId} to={`/driver/${row.driverId}`} className="apple-card p-3 hover:bg-muted transition-colors block">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{row.driver?.name || '—'}</div>
                        <div className="text-[10px] mt-0.5 text-secondary tabular-nums">{row.races} races · {row.quali} quali</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] text-secondary">Race</div>
                          <div className={['text-xs font-black tabular-nums', row.racesAheadPct != null && row.racesAheadPct >= 50 ? 'text-green-400' : 'text-red-400'].join(' ')}>
                            {row.racesAheadPct ?? '—'}{row.racesAheadPct != null ? '%' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-secondary">Quali</div>
                          <div className={['text-xs font-black tabular-nums', row.qualiAheadPct != null && row.qualiAheadPct >= 50 ? 'text-green-400' : 'text-red-400'].join(' ')}>
                            {row.qualiAheadPct ?? '—'}{row.qualiAheadPct != null ? '%' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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

      {tab === 'team-champs' && (
        <div className="space-y-3">
          <div className="apple-card p-6 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(5,5,8,0) 100%)', borderColor: 'rgba(234,179,8,0.2)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(234,179,8,0.12)' }}>
              <Trophy size={22} style={{ color: 'rgba(234,179,8,0.9)' }} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(234,179,8,0.7)' }}>Constructors' Champion</div>
              <div className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>
                {teamChampions.reduce((s, t) => s + t.champYears.length, 0)} Title{teamChampions.reduce((s, t) => s + t.champYears.length, 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamChampions.map(entry => (
              <Link key={entry.teamId} to={`/team/${entry.teamId}`}>
                <div className="apple-card p-4 flex items-center gap-4 hover:border-accent/40 transition-colors"
                  style={{ borderColor: 'rgba(234,179,8,0.2)', background: 'rgba(234,179,8,0.03)' }}>
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 p-1">
                    {entry.team?.logo_url
                      ? <img src={entry.team.logo_url} alt={entry.team?.name || ''} className="w-full h-full object-contain" />
                      : <span className="text-sm font-black" style={{ color: 'var(--text-muted)' }}>{entry.team?.name?.slice(0, 2).toUpperCase() || '?'}</span>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{entry.team?.name || '—'}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.champYears.map(y => (
                        <span key={y} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'rgba(234,179,8,0.12)', color: 'rgba(234,179,8,0.9)', border: '1px solid rgba(234,179,8,0.25)' }}>
                          🏆 {y}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
