import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const fetchTable = async (table, query = null) => {
  let q = supabase.from(table).select(query || '*')
  const { data, error } = await q
  if (error) throw error
  return data
}

export const useDataStore = create((set, get) => ({
  drivers: [], teams: [], circuits: [], seasons: [], races: [],
  cache: {},

  fetchDrivers: async (force = false) => {
    if (!force && get().drivers.length) return
    const data = await fetchTable('drivers')
    set({ drivers: data })
  },

  fetchTeams: async (force = false) => {
    if (!force && get().teams.length) return
    const data = await fetchTable('teams')
    set({ teams: data })
  },

  fetchCircuits: async (force = false) => {
    if (!force && get().circuits.length) return
    const data = await fetchTable('circuits')
    set({ circuits: data })
  },

  fetchSeasons: async () => {
    if (get().seasons.length) return
    const data = await fetchTable('seasons', '*')
    set({ seasons: data.sort((a, b) => b.year - a.year) })
  },

  fetchRaces: async (seasonId = null) => {
    let q = supabase.from('races').select('*, circuits(*), seasons(*)')
    if (seasonId) q = q.eq('season_id', seasonId)
    const { data, error } = await q.order('date', { ascending: false })
    if (error) throw error
    set({ races: data })
    return data
  },

  fetchRace: async (id) => {
    const cached = get().cache[`race_${id}`]
    if (cached) return cached
    const { data, error } = await supabase
      .from('races')
      .select('*, circuits(*), seasons(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [`race_${id}`]: data } }))
    return data
  },

  fetchRaceResults: async (raceId) => {
    const key = `results_${raceId}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase
      .from('results')
      .select('*, drivers(*), teams(*)')
      .eq('race_id', raceId)
      .order('position')
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchLaps: async (raceId) => {
    const key = `laps_${raceId}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase
      .from('laps')
      .select('*, drivers(name, code)')
      .eq('race_id', raceId)
      .order('lap_number')
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchPitStops: async (raceId) => {
    const key = `pits_${raceId}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase
      .from('pit_stops')
      .select('*, drivers(name, code)')
      .eq('race_id', raceId)
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchRaceEvents: async (raceId) => {
    const key = `events_${raceId}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase
      .from('race_events')
      .select('*')
      .eq('race_id', raceId)
      .order('lap')
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchQualifying: async (raceId) => {
    const key = `qualifying_${raceId}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase
      .from('qualifying_results')
      .select('*, drivers(*), teams(*)')
      .eq('race_id', raceId)
      .order('position')
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchDriver: async (id, force = false) => {
    const key = `driver_${id}`
    if (!force && get().cache[key]) return get().cache[key]
    const { data, error } = await supabase.from('drivers').select('*').eq('id', id).single()
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchDriverStats: async (driverId) => {
    const { data, error } = await supabase
      .from('results')
      .select('*, races(name, date, seasons(year)), teams(name)')
      .eq('driver_id', driverId)
      .order('races(date)', { ascending: true })
    if (error) throw error
    return data
  },

  fetchTeam: async (id) => {
    const key = `team_${id}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase.from('teams').select('*').eq('id', id).single()
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchCircuit: async (id, force = false) => {
    const key = `circuit_${id}`
    if (!force && get().cache[key]) return get().cache[key]
    const { data, error } = await supabase.from('circuits').select('*').eq('id', id).single()
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  fetchStandings: async (seasonId) => {
    const key = `standings_${seasonId}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase
      .from('results')
      .select('driver_id, team_id, points, position, drivers(id, name, code, image_url, nationality), teams(id, name, logo_url)')
      .eq('races.season_id', seasonId)
      .not('points', 'is', null)
    // join via races
    const { data: raceResults, error: e2 } = await supabase
      .from('results')
      .select('driver_id, team_id, points, position, drivers(id, name, code, image_url, nationality), teams(id, name, logo_url), races!inner(season_id)')
      .eq('races.season_id', seasonId)
    if (e2) throw e2

    // Driver standings
    const driverMap = {}
    const teamMap = {}
    for (const r of raceResults) {
      const pts = parseFloat(r.points) || 0
      const pos = r.position
      if (r.driver_id) {
        if (!driverMap[r.driver_id]) driverMap[r.driver_id] = { driver: r.drivers, points: 0, wins: 0, team: r.teams }
        driverMap[r.driver_id].points += pts
        if (pos === 1) driverMap[r.driver_id].wins++
        if (r.teams) driverMap[r.driver_id].team = r.teams // last team
      }
      if (r.team_id) {
        if (!teamMap[r.team_id]) teamMap[r.team_id] = { team: r.teams, points: 0, wins: 0 }
        teamMap[r.team_id].points += pts
        if (pos === 1) teamMap[r.team_id].wins++
      }
    }

    const drivers = Object.values(driverMap).sort((a, b) => b.points - a.points).map((d, i) => ({ ...d, position: i + 1 }))
    const teams = Object.values(teamMap).sort((a, b) => b.points - a.points).map((t, i) => ({ ...t, position: i + 1 }))
    const result = { drivers, teams }
    set(s => ({ cache: { ...s.cache, [key]: result } }))
    return result
  },

  fetchAllChampionships: async () => {
    const key = 'all_championships'
    if (get().cache[key]) return get().cache[key]
    // Get all seasons
    const { data: seasons } = await supabase.from('seasons').select('id, year').order('year')
    if (!seasons?.length) return { driverChamps: {}, teamChamps: {} }
    // For each season get the top driver and team by points
    const { data: raceResults } = await supabase
      .from('results')
      .select('driver_id, team_id, points, position, races!inner(season_id, seasons(year))')
    if (!raceResults) return { driverChamps: {}, teamChamps: {} }

    const bySeasonDriver = {}
    const bySeasonTeam = {}
    for (const r of raceResults) {
      const year = r.races?.seasons?.year
      if (!year) continue
      const pts = parseFloat(r.points) || 0
      if (r.driver_id) {
        if (!bySeasonDriver[year]) bySeasonDriver[year] = {}
        bySeasonDriver[year][r.driver_id] = (bySeasonDriver[year][r.driver_id] || 0) + pts
      }
      if (r.team_id) {
        if (!bySeasonTeam[year]) bySeasonTeam[year] = {}
        bySeasonTeam[year][r.team_id] = (bySeasonTeam[year][r.team_id] || 0) + pts
      }
    }

    const driverChamps = {} // driver_id → [years]
    const teamChamps = {}   // team_id → [years]
    for (const [year, map] of Object.entries(bySeasonDriver)) {
      const winner = Object.entries(map).sort((a, b) => b[1] - a[1])[0]
      if (winner) {
        if (!driverChamps[winner[0]]) driverChamps[winner[0]] = []
        driverChamps[winner[0]].push(parseInt(year))
      }
    }
    for (const [year, map] of Object.entries(bySeasonTeam)) {
      const winner = Object.entries(map).sort((a, b) => b[1] - a[1])[0]
      if (winner) {
        if (!teamChamps[winner[0]]) teamChamps[winner[0]] = []
        teamChamps[winner[0]].push(parseInt(year))
      }
    }
    const result = { driverChamps, teamChamps }
    set(s => ({ cache: { ...s.cache, [key]: result } }))
    return result
  },

  invalidateCache: () => set({ cache: {}, drivers: [], teams: [], circuits: [], seasons: [], races: [] }),
}))
