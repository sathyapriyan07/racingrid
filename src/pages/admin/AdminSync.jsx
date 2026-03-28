import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Card } from '../../components/ui'
import {
  normalizeDrivers, normalizeTeams, normalizeCircuits,
  normalizeRaces, normalizeResults, normalizeQualifying,
  normalizeDriverStandings, normalizeConstructorStandings,
} from '../../utils/normalizers'

async function callEdgeFunction(name, payload) {
  const { data, error } = await supabase.functions.invoke(name, { body: payload })
  if (error) throw error
  return data
}

async function ergastFetch(endpoint, devPath) {
  const isDev = import.meta.env.DEV
  if (!isDev) {
    const res = await fetch(endpoint)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    return res.json()
  }
  try {
    return await callEdgeFunction('sync-ergast', { endpoint })
  } catch {
    const res = await fetch(devPath)
    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`)
    return res.json()
  }
}

function SyncStatus({ result }) {
  if (result.status === 'fetching') return (
    <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
      <Loader size={11} className="animate-spin" />
      Fetching{result.fetched ? ` — ${result.fetched} records so far...` : ' from API...'}
    </div>
  )
  if (result.status === 'saving') {
    const pct = result.total ? Math.round((result.saved / result.total) * 100) : 0
    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader size={11} className="animate-spin" />
          Saving... {result.saved} / {result.total} records
        </div>
        <div className="w-full bg-white/10 rounded-full h-1">
          <div className="bg-f1red h-1 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }
  if (result.status === 'done') return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs">
      <span className="flex items-center gap-1 text-green-400">
        <CheckCircle size={11} /> {result.saved} upserted
      </span>
      <span className="text-white/30">Total: {result.total}</span>
    </div>
  )
  if (result.status === 'error') return (
    <div className="flex items-center gap-1 mt-2 text-xs text-f1red">
      <XCircle size={11} /> {result.error}
    </div>
  )
  return null
}

const GLOBAL_SYNC_ACTIONS = [
  {
    id: 'ergast-drivers',
    label: 'Sync Drivers',
    description: 'All F1 drivers via api.jolpi.ca',
    baseEndpoint: 'https://api.jolpi.ca/ergast/f1/drivers/',
    devBasePath: '/api/ergast/drivers/',
    table: 'drivers',
    conflictCol: 'name',
    pageSize: 200,
    normalize: (data) => normalizeDrivers(data, 'ergast'),
  },
  {
    id: 'ergast-constructors',
    label: 'Sync Teams',
    description: 'All F1 constructors via api.jolpi.ca',
    baseEndpoint: 'https://api.jolpi.ca/ergast/f1/constructors/',
    devBasePath: '/api/ergast/constructors/',
    table: 'teams',
    conflictCol: 'name',
    pageSize: 200,
    normalize: (data) => normalizeTeams(data, 'ergast'),
  },
  {
    id: 'ergast-circuits',
    label: 'Sync Circuits',
    description: 'All F1 circuits via api.jolpi.ca',
    baseEndpoint: 'https://api.jolpi.ca/ergast/f1/circuits/',
    devBasePath: '/api/ergast/circuits/',
    table: 'circuits',
    conflictCol: 'name',
    pageSize: 100,
    normalize: (data) => normalizeCircuits(data, 'ergast'),
  },
]

export default function AdminSync() {
  const [running, setRunning] = useState({})
  const [results, setResults] = useState({})
  const [year, setYear] = useState(new Date().getFullYear())
  const [seasonResult, setSeasonResult] = useState(null)
  const [syncYear, setSyncYear] = useState(new Date().getFullYear())

  // ── helpers ──────────────────────────────────────────────

  const setResult = (id, val) => setResults(r => ({ ...r, [id]: val }))
  const setRun = (id, val) => setRunning(r => ({ ...r, [id]: val }))

  const upsertChunked = async (id, table, rows, conflictCol) => {
    const CHUNK = 200
    let saved = 0
    setResult(id, { status: 'saving', total: rows.length, saved: 0 })
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase.from(table)
        .upsert(rows.slice(i, i + CHUNK), { onConflict: conflictCol, ignoreDuplicates: false })
      if (error) throw error
      saved += Math.min(CHUNK, rows.length - i)
      setResult(id, { status: 'saving', total: rows.length, saved })
    }
    setResult(id, { status: 'done', total: rows.length, saved })
    return saved
  }

  // ── global sync (drivers / teams / circuits) ─────────────

  const fetchPage = async (action, offset) => {
    const url = `${action.baseEndpoint}?limit=${action.pageSize}&offset=${offset}&format=json`
    const devUrl = `${action.devBasePath}?limit=${action.pageSize}&offset=${offset}&format=json`
    return ergastFetch(url, devUrl)
  }

  const runGlobalSync = async (action) => {
    setRun(action.id, true)
    setResult(action.id, { status: 'fetching', fetched: 0 })
    try {
      let all = []
      let offset = 0
      while (true) {
        const page = await fetchPage(action, offset)
        const batch = action.normalize(page)
        if (!batch.length) break
        all = all.concat(batch)
        setResult(action.id, { status: 'fetching', fetched: all.length })
        if (batch.length < action.pageSize) break
        offset += action.pageSize
      }
      if (!all.length) throw new Error('No data returned')
      const clean = all.map(r => { const x = { ...r }; delete x.id; return x })
      const saved = await upsertChunked(action.id, action.table, clean, action.conflictCol)
      toast.success(`${action.table}: ${saved} upserted`)
    } catch (err) {
      setResult(action.id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(action.id, false)
    }
  }

  // ── season sync helpers ───────────────────────────────────

  const getSeasonId = async (yr) => {
    const { data, error } = await supabase.from('seasons').select('id').eq('year', yr).single()
    if (error) throw new Error(`Season ${yr} not found — add it first`)
    return data.id
  }

  const getDriverMap = async () => {
    const { data } = await supabase.from('drivers').select('id, name, code')
    const map = {}
    data?.forEach(d => {
      if (d.code) map[d.code] = d.id
      map[d.name] = d.id
    })
    return map
  }

  const getTeamMap = async () => {
    const { data } = await supabase.from('teams').select('id, name')
    const map = {}
    data?.forEach(t => { map[t.name] = t.id })
    return map
  }

  const getCircuitMap = async () => {
    const { data } = await supabase.from('circuits').select('id, name')
    const map = {}
    data?.forEach(c => { map[c.name] = c.id })
    return map
  }

  const getRaceMap = async (seasonId) => {
    const { data } = await supabase.from('races').select('id, round').eq('season_id', seasonId)
    const map = {}
    data?.forEach(r => { map[r.round] = r.id })
    return map
  }

  // ── season-scoped syncs ───────────────────────────────────

  const syncRaces = async (yr) => {
    const id = `races-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const circuitMap = await getCircuitMap()
      const url = `https://api.jolpi.ca/ergast/f1/${yr}/races/?limit=30&format=json`
      const raw = await ergastFetch(url, `/api/ergast/${yr}/races/?limit=30&format=json`)
      const rows = normalizeRaces(raw, seasonId, circuitMap, 'ergast')
      if (!rows.length) throw new Error('No races found')
      const saved = await upsertChunked(id, 'races', rows, 'season_id,round')
      toast.success(`Races ${yr}: ${saved} upserted`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncRaceResults = async (yr) => {
    const id = `results-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const [driverMap, teamMap, raceMap] = await Promise.all([getDriverMap(), getTeamMap(), getRaceMap(seasonId)])
      // fetch all results for the season (paginated)
      const firstPage = await ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/results/?limit=100&format=json`,
        `/api/ergast/${yr}/results/?limit=100&format=json`
      )
      const total = parseInt(firstPage?.MRData?.total || 0)
      const pages = Math.ceil(total / 100)
      let allRaces = firstPage?.MRData?.RaceTable?.Races || []
      for (let p = 1; p < pages; p++) {
        const page = await ergastFetch(
          `https://api.jolpi.ca/ergast/f1/${yr}/results/?limit=100&offset=${p * 100}&format=json`,
          `/api/ergast/${yr}/results/?limit=100&offset=${p * 100}&format=json`
        )
        allRaces = allRaces.concat(page?.MRData?.RaceTable?.Races || [])
      }
      const rows = allRaces.flatMap(race => {
        const raceId = raceMap[parseInt(race.round)]
        if (!raceId) return []
        return (race.Results || []).map(r => ({
          race_id: raceId,
          driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
          team_id: teamMap[r.Constructor?.name] || null,
          position: parseInt(r.position) || null,
          grid: parseInt(r.grid) || null,
          laps: parseInt(r.laps) || null,
          time: r.Time?.time || null,
          points: parseFloat(r.points) || 0,
          status: r.status || 'Finished',
        }))
      })
      if (!rows.length) throw new Error('No results found')
      const saved = await upsertChunked(id, 'results', rows, 'race_id,driver_id')
      toast.success(`Results ${yr}: ${saved} upserted`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncQualifying = async (yr) => {
    const id = `qualifying-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const [driverMap, teamMap, raceMap] = await Promise.all([getDriverMap(), getTeamMap(), getRaceMap(seasonId)])
      const firstPage = await ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/qualifying/?limit=100&format=json`,
        `/api/ergast/${yr}/qualifying/?limit=100&format=json`
      )
      const total = parseInt(firstPage?.MRData?.total || 0)
      const pages = Math.ceil(total / 100)
      let allRaces = firstPage?.MRData?.RaceTable?.Races || []
      for (let p = 1; p < pages; p++) {
        const page = await ergastFetch(
          `https://api.jolpi.ca/ergast/f1/${yr}/qualifying/?limit=100&offset=${p * 100}&format=json`,
          `/api/ergast/${yr}/qualifying/?limit=100&offset=${p * 100}&format=json`
        )
        allRaces = allRaces.concat(page?.MRData?.RaceTable?.Races || [])
      }
      const rows = allRaces.flatMap(race => {
        const raceId = raceMap[parseInt(race.round)]
        if (!raceId) return []
        return (race.QualifyingResults || []).map(r => ({
          race_id: raceId,
          driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
          team_id: teamMap[r.Constructor?.name] || null,
          position: parseInt(r.position) || null,
          q1: r.Q1 || null,
          q2: r.Q2 || null,
          q3: r.Q3 || null,
        }))
      })
      if (!rows.length) throw new Error('No qualifying data found')
      const saved = await upsertChunked(id, 'qualifying_results', rows, 'race_id,driver_id')
      toast.success(`Qualifying ${yr}: ${saved} upserted`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncDriverStandings = async (yr) => {
    const id = `driver-standings-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const [driverMap, teamMap] = await Promise.all([getDriverMap(), getTeamMap()])
      const raw = await ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/driverStandings/?format=json`,
        `/api/ergast/${yr}/driverStandings/?format=json`
      )
      const rows = normalizeDriverStandings(raw, seasonId, driverMap, teamMap)
      if (!rows.length) throw new Error('No standings found')
      const saved = await upsertChunked(id, 'driver_standings', rows, 'season_id,driver_id')
      toast.success(`Driver standings ${yr}: ${saved} upserted`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncConstructorStandings = async (yr) => {
    const id = `constructor-standings-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const teamMap = await getTeamMap()
      const raw = await ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/constructorStandings/?format=json`,
        `/api/ergast/${yr}/constructorStandings/?format=json`
      )
      const rows = normalizeConstructorStandings(raw, seasonId, teamMap)
      if (!rows.length) throw new Error('No standings found')
      const saved = await upsertChunked(id, 'constructor_standings', rows, 'season_id,team_id')
      toast.success(`Constructor standings ${yr}: ${saved} upserted`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncSeason = async () => {
    setRun('season', true)
    setSeasonResult(null)
    try {
      const yr = parseInt(year)
      if (!yr || yr < 1950 || yr > 2030) throw new Error('Invalid year')
      const { error } = await supabase.from('seasons').insert({ year: yr })
      if (error && !error.code?.includes('23505')) throw error
      const msg = error ? `Season ${yr} already exists` : `Season ${yr} added`
      setSeasonResult({ ok: true, msg })
      toast.success(msg)
    } catch (err) {
      setSeasonResult({ ok: false, msg: err.message })
      toast.error(err.message)
    } finally {
      setRun('season', false)
    }
  }

  const SEASON_ACTIONS = [
    { key: 'races', label: 'Races', description: 'Race schedule + circuit links', fn: syncRaces },
    { key: 'results', label: 'Race Results', description: 'Final positions, points, status', fn: syncRaceResults },
    { key: 'qualifying', label: 'Qualifying Results', description: 'Q1/Q2/Q3 times per driver', fn: syncQualifying },
    { key: 'driver-standings', label: 'Driver Standings', description: 'Championship standings', fn: syncDriverStandings },
    { key: 'constructor-standings', label: 'Constructor Standings', description: 'Team championship standings', fn: syncConstructorStandings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sync Tools</h1>
        <p className="text-white/40 text-sm mt-1">
          Fetch data from Ergast API. All syncs are idempotent — re-running will upsert, not duplicate.
        </p>
      </div>

      {/* Add Season */}
      <Card>
        <h2 className="text-sm font-bold mb-3">Add Season</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Year</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)}
              className="input w-28" min="1950" max="2030" />
          </div>
          <button onClick={syncSeason} disabled={running.season} className="btn-primary flex items-center gap-2">
            {running.season ? <><Loader size={12} className="animate-spin" /> Adding...</> : 'Add Season'}
          </button>
        </div>
        {seasonResult && (
          <div className={`flex items-center gap-1.5 mt-3 text-xs ${seasonResult.ok ? 'text-green-400' : 'text-f1red'}`}>
            {seasonResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {seasonResult.msg}
          </div>
        )}
      </Card>

      {/* Global sync — drivers / teams / circuits */}
      <div>
        <h2 className="text-sm font-bold mb-3 text-white/70 flex items-center gap-2">
          Global Data
          <a href="https://api.jolpi.ca" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white">
            <ExternalLink size={12} />
          </a>
        </h2>
        <div className="space-y-3">
          {GLOBAL_SYNC_ACTIONS.map(action => (
            <div key={action.id} className="glass p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{action.description}</div>
                {results[action.id] && <SyncStatus result={results[action.id]} />}
              </div>
              <button onClick={() => runGlobalSync(action)} disabled={running[action.id]}
                className="btn-ghost flex items-center gap-2 shrink-0">
                <RefreshCw size={12} className={running[action.id] ? 'animate-spin' : ''} />
                {running[action.id] ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Season-scoped sync */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-white/70">Season Data</h2>
          <input type="number" value={syncYear} onChange={e => setSyncYear(parseInt(e.target.value))}
            className="input w-24 text-sm" min="1950" max="2030" />
          <span className="text-xs text-white/30">Sync races, results & standings for this year</span>
        </div>
        <div className="space-y-3">
          {SEASON_ACTIONS.map(({ key, label, description, fn }) => {
            const id = `${key}-${syncYear}`
            return (
              <div key={key} className="glass p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{description}</div>
                  {results[id] && <SyncStatus result={results[id]} />}
                </div>
                <button onClick={() => fn(syncYear)} disabled={running[id]}
                  className="btn-ghost flex items-center gap-2 shrink-0">
                  <RefreshCw size={12} className={running[id] ? 'animate-spin' : ''} />
                  {running[id] ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-bold mb-3">Deploy Edge Function</h2>
        <pre className="text-xs text-white/50 bg-dark-900 rounded-lg p-3 overflow-x-auto">{`supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy sync-ergast`}</pre>
      </Card>
    </div>
  )
}
