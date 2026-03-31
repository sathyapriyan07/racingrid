import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Card } from '../../components/ui'
import {
  normalizeDrivers, normalizeTeams, normalizeCircuits,
  normalizeRaces, normalizeQualifying,
  normalizeDriverStandings, normalizeConstructorStandings,
  normalizeSprintResults,
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

function canonicalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\b(f1|team|racing|scuderia|formula|one)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fmtLap(seconds) {
  if (!seconds || seconds <= 0) return null
  const totalMs = Math.round(seconds * 1000)
  const ms = totalMs % 1000
  const totalSeconds = Math.floor(totalMs / 1000)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60)
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

function SyncStatus({ result }) {
  if (result.status === 'fetching') return (
    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <Loader size={11} className="animate-spin" /> Fetching...
    </div>
  )
  if (result.status === 'saving') return (
    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <Loader size={11} className="animate-spin" /> Saving {result.total} records...
    </div>
  )
  if (result.status === 'done') return (
    <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
      <CheckCircle size={11} /> {result.saved} upserted
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
    setResult(id, { status: 'saving', total: rows.length, saved: 0 })
    const CHUNK = 1000
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase.from(table)
        .upsert(rows.slice(i, i + CHUNK), { onConflict: conflictCol, ignoreDuplicates: false })
      if (error) throw error
    }
    setResult(id, { status: 'done', total: rows.length, saved: rows.length })
    return rows.length
  }

  // ── global sync (drivers / teams / circuits) ─────────────

  const fetchPage = async (action, offset) => {
    const url = `${action.baseEndpoint}?limit=100&offset=${offset}&format=json`
    const devUrl = `${action.devBasePath}?limit=100&offset=${offset}&format=json`
    return ergastFetch(url, devUrl)
  }

  const runGlobalSync = async (action) => {
    setRun(action.id, true)
    setResult(action.id, { status: 'fetching' })
    try {
      const firstPage = await fetchPage(action, 0)
      const total = parseInt(firstPage?.MRData?.total || 0)
      const offsets = Array.from({ length: Math.ceil(total / 100) - 1 }, (_, i) => (i + 1) * 100)
      const pages = await Promise.all(offsets.map(o => fetchPage(action, o)))
      const all = [firstPage, ...pages].flatMap(p => action.normalize(p))
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
    const { data } = await supabase.from('teams').select('id, name, ergast_id')
    const map = {}
    data?.forEach(t => {
      map[t.name] = t.id
      if (t.ergast_id) map[t.ergast_id] = t.id
    })
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
      const firstPage = await ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/results/?limit=100&format=json`,
        `/api/ergast/${yr}/results/?limit=100&format=json`
      )
      const total = parseInt(firstPage?.MRData?.total || 0)
      const offsets = Array.from({ length: Math.ceil(total / 100) - 1 }, (_, i) => (i + 1) * 100)
      const rest = await Promise.all(offsets.map(o => ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/results/?limit=100&offset=${o}&format=json`,
        `/api/ergast/${yr}/results/?limit=100&offset=${o}&format=json`
      )))
      const allRaces = [firstPage, ...rest].flatMap(p => p?.MRData?.RaceTable?.Races || [])
      const rows = allRaces.flatMap(race => {
        const raceId = raceMap[parseInt(race.round)]
        if (!raceId) return []
        return (race.Results || []).map(r => ({
          race_id: raceId,
          driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
          team_id: teamMap[r.Constructor?.constructorId] || teamMap[r.Constructor?.name] || null,
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
      const offsets = Array.from({ length: Math.ceil(total / 100) - 1 }, (_, i) => (i + 1) * 100)
      const rest = await Promise.all(offsets.map(o => ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/qualifying/?limit=100&offset=${o}&format=json`,
        `/api/ergast/${yr}/qualifying/?limit=100&offset=${o}&format=json`
      )))
      const allRaces = [firstPage, ...rest].flatMap(p => p?.MRData?.RaceTable?.Races || [])
      const rows = allRaces.flatMap(race => {
        const raceId = raceMap[parseInt(race.round)]
        if (!raceId) return []
        return (race.QualifyingResults || []).map(r => ({
          race_id: raceId,
          driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
          team_id: teamMap[r.Constructor?.constructorId] || teamMap[r.Constructor?.name] || null,
          position: parseInt(r.position) || null,
          q1: r.Q1 || null, q2: r.Q2 || null, q3: r.Q3 || null,
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

  const syncSprintResults = async (yr) => {
    const id = `sprint-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const [driverMap, teamMap, raceMap] = await Promise.all([getDriverMap(), getTeamMap(), getRaceMap(seasonId)])
      const firstPage = await ergastFetch(
        `https://api.jolpi.ca/ergast/f1/${yr}/sprint/?limit=100&format=json`,
        `/api/ergast/${yr}/sprint/?limit=100&format=json`
      )
      const total = parseInt(firstPage?.MRData?.total || 0)
      let allRaces = firstPage?.MRData?.RaceTable?.Races || []
      for (let p = 100; p < total; p += 100) {
        const page = await ergastFetch(
          `https://api.jolpi.ca/ergast/f1/${yr}/sprint/?limit=100&offset=${p}&format=json`,
          `/api/ergast/${yr}/sprint/?limit=100&offset=${p}&format=json`
        )
        allRaces = allRaces.concat(page?.MRData?.RaceTable?.Races || [])
      }
      const rows = allRaces.flatMap(race => {
        const raceId = raceMap[parseInt(race.round)]
        if (!raceId) return []
        return (race.SprintResults || []).map(r => ({
          race_id: raceId,
          driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
          team_id: teamMap[r.Constructor?.constructorId] || teamMap[r.Constructor?.name] || null,
          position: parseInt(r.position) || null,
          grid: parseInt(r.grid) || null,
          laps: parseInt(r.laps) || null,
          time: r.Time?.time || null,
          points: parseFloat(r.points) || 0,
          status: r.status || 'Finished',
        }))
      })
      if (!rows.length) throw new Error(`No sprint results found for ${yr}`)
      const saved = await upsertChunked(id, 'sprint_results', rows, 'race_id,driver_id')
      toast.success(`Sprint results ${yr}: ${saved} upserted`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncSessionKeys = async (yr) => {
    const id = `session-keys-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const [sessionsRes, seasonId] = await Promise.all([
        fetch(`https://api.openf1.org/v1/sessions?year=${yr}&session_name=Race`).then(r => {
          if (!r.ok) throw new Error(`OpenF1 fetch failed: ${r.status}`)
          return r.json()
        }),
        getSeasonId(yr),
      ])
      if (!sessionsRes.length) throw new Error('No sessions found on OpenF1')
      const { data: races, error } = await supabase.from('races').select('id, date, round').eq('season_id', seasonId)
      if (error) throw error
      let matched = 0
      const updates = races.flatMap(race => {
        const session = sessionsRes.find(s => s.date_start?.slice(0, 10) === new Date(race.date).toISOString().slice(0, 10))
          || sessionsRes.find(s => Math.abs(new Date(s.date_start) - new Date(race.date)) < 86400000 * 2)
        if (!session) return []
        matched++
        return [supabase.from('races').update({ openf1_session_key: session.session_key }).eq('id', race.id)]
      })
      await Promise.all(updates)
      setResult(id, { status: 'done', total: races.length, saved: matched })
      toast.success(`Session keys ${yr}: ${matched}/${races.length} matched`)
    } catch (err) {
      setResult(id, { status: 'error', error: err.message })
      toast.error(err.message)
    } finally {
      setRun(id, false)
    }
  }

  const syncPracticeResults = async (yr) => {
    const id = `practice-${yr}`
    setRun(id, true)
    setResult(id, { status: 'fetching' })
    try {
      const seasonId = await getSeasonId(yr)
      const [driverMap, teamsRes, racesRes, sessionsRes] = await Promise.all([
        getDriverMap(),
        supabase.from('teams').select('id, name, ergast_id'),
        supabase.from('races').select('id, date').eq('season_id', seasonId),
        fetch(`https://api.openf1.org/v1/sessions?year=${yr}`).then(r => {
          if (!r.ok) throw new Error(`OpenF1 fetch failed: ${r.status}`)
          return r.json()
        }),
      ])

      const teamMap = {}
      teamsRes.data?.forEach(t => {
        teamMap[canonicalizeName(t.name)] = t.id
        if (t.ergast_id) teamMap[canonicalizeName(t.ergast_id)] = t.id
      })

      const races = racesRes.data || []
      if (!races.length) throw new Error('No races found — sync races first')
      if (!sessionsRes.length) throw new Error('No OpenF1 sessions returned')

      const wanted = [
        { openf1: 'Practice 1', session: 'FP1' },
        { openf1: 'Practice 2', session: 'FP2' },
        { openf1: 'Practice 3', session: 'FP3' },
      ]

      const pickSessionKey = (raceDateMs, openf1Name) => {
        const candidates = sessionsRes
          .filter(s => s?.session_name === openf1Name && s?.date_start)
          .map(s => ({ session_key: s.session_key, ms: new Date(s.date_start).getTime() }))
          .filter(s => s.session_key && !Number.isNaN(s.ms))
          .filter(s => (raceDateMs - s.ms) >= -86400000 && (raceDateMs - s.ms) <= 86400000 * 7)
          .sort((a, b) => Math.abs(raceDateMs - a.ms) - Math.abs(raceDateMs - b.ms))
        return candidates[0]?.session_key ?? null
      }

      let totalSaved = 0
      for (const race of races) {
        if (!race.date) continue
        const raceDateMs = new Date(race.date).getTime()
        for (const w of wanted) {
          const sk = pickSessionKey(raceDateMs, w.openf1)
          if (!sk) continue

          const [of1Drivers, laps] = await Promise.all([
            fetch(`https://api.openf1.org/v1/drivers?session_key=${sk}`).then(r => {
              if (!r.ok) throw new Error(`OpenF1 drivers fetch failed: ${r.status}`)
              return r.json()
            }),
            fetch(`https://api.openf1.org/v1/laps?session_key=${sk}`).then(r => {
              if (!r.ok) throw new Error(`OpenF1 laps fetch failed: ${r.status}`)
              return r.json()
            }),
          ])

          const byNumber = {}
          of1Drivers.forEach(d => {
            const num = String(d.driver_number ?? '')
            if (!num) return
            byNumber[num] = {
              code: d.name_acronym || null,
              fullName: d.full_name || d.name || null,
              teamName: d.team_name || null,
            }
          })

          const best = {}
          const lapCount = {}
          laps.forEach(l => {
            const num = String(l.driver_number ?? '')
            const dur = typeof l.lap_duration === 'number' ? l.lap_duration : null
            if (!num || !dur || dur <= 0) return
            if (l.is_pit_out_lap || l.is_pit_in_lap) return
            lapCount[num] = (lapCount[num] || 0) + 1
            if (best[num] === undefined || dur < best[num]) best[num] = dur
          })

          const rows = Object.entries(byNumber).map(([num, d]) => {
            const driverId = driverMap[d.code] || (d.fullName ? driverMap[d.fullName] : null) || null
            const teamId = d.teamName ? (teamMap[canonicalizeName(d.teamName)] || null) : null
            return {
              race_id: race.id,
              session: w.session,
              driver_id: driverId,
              team_id: teamId,
              _best: best[num] ?? null,
              time: best[num] ? fmtLap(best[num]) : null,
              laps: lapCount[num] || 0,
            }
          }).filter(r => r.driver_id)

          rows.sort((a, b) => {
            if (a._best === null && b._best === null) return 0
            if (a._best === null) return 1
            if (b._best === null) return -1
            return a._best - b._best
          })

          const leader = rows.find(r => r._best !== null)?._best ?? null
          const upsertRows = rows.map((r, i) => ({
            race_id: r.race_id,
            session: r.session,
            driver_id: r.driver_id,
            team_id: r.team_id,
            position: r._best !== null ? i + 1 : null,
            time: r.time,
            gap: leader !== null && r._best !== null && r._best > leader ? `+${(r._best - leader).toFixed(3)}` : null,
            laps: r.laps,
          }))

          const { error } = await supabase.from('practice_results').upsert(upsertRows, { onConflict: 'race_id,session,driver_id' })
          if (error) throw error
          totalSaved += upsertRows.length
        }
      }

      setResult(id, { status: 'done', total: races.length, saved: totalSaved })
      toast.success(`Practice results ${yr}: ${totalSaved} upserted`)
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
    { key: 'session-keys', label: 'OpenF1 Session Keys', description: 'Link races to OpenF1 for live lap/pit/event data', fn: syncSessionKeys },
    { key: 'results', label: 'Race Results', description: 'Final positions, points, status', fn: syncRaceResults },
    { key: 'sprint', label: 'Sprint Results', description: 'Sprint race results + points (2021+)', fn: syncSprintResults },
    { key: 'qualifying', label: 'Qualifying Results', description: 'Q1/Q2/Q3 times per driver', fn: syncQualifying },
    { key: 'practice', label: 'Practice Results (OpenF1)', description: 'FP1/FP2/FP3 classification via best lap time', fn: syncPracticeResults },
    { key: 'driver-standings', label: 'Driver Standings', description: 'Championship standings (includes sprint points)', fn: syncDriverStandings },
    { key: 'constructor-standings', label: 'Constructor Standings', description: 'Team championship standings (includes sprint points)', fn: syncConstructorStandings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sync Tools</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Fetch data from Ergast API. All syncs are idempotent — re-running will upsert, not duplicate.
        </p>
      </div>

      {/* Add Season */}
      <Card>
        <h2 className="text-sm font-bold mb-3">Add Season</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Year</label>
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
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          Global Data
          <a href="https://api.jolpi.ca" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }} className="hover:text-f1red">
            <ExternalLink size={12} />
          </a>
        </h2>
        <div className="space-y-3">
          {GLOBAL_SYNC_ACTIONS.map(action => (
            <div key={action.id} className="glass p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{action.description}</div>
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
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Season Data</h2>
          <input type="number" value={syncYear} onChange={e => setSyncYear(parseInt(e.target.value))}
            className="input w-24 text-sm" min="1950" max="2030" />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sync races, results &amp; standings for this year</span>
        </div>
        <div className="space-y-3">
          {SEASON_ACTIONS.map(({ key, label, description, fn }) => {
            const id = `${key}-${syncYear}`
            return (
              <div key={key} className="glass p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
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
        <pre className="text-xs rounded-lg p-3 overflow-x-auto" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>{`supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy sync-ergast`}</pre>
      </Card>
    </div>
  )
}
