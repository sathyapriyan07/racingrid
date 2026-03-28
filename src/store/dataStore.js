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

  fetchDrivers: async () => {
    if (get().drivers.length) return
    const data = await fetchTable('drivers')
    set({ drivers: data })
  },

  fetchTeams: async () => {
    if (get().teams.length) return
    const data = await fetchTable('teams')
    set({ teams: data })
  },

  fetchCircuits: async () => {
    if (get().circuits.length) return
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

  fetchDriver: async (id) => {
    const key = `driver_${id}`
    if (get().cache[key]) return get().cache[key]
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

  fetchCircuit: async (id) => {
    const key = `circuit_${id}`
    if (get().cache[key]) return get().cache[key]
    const { data, error } = await supabase.from('circuits').select('*').eq('id', id).single()
    if (error) throw error
    set(s => ({ cache: { ...s.cache, [key]: data } }))
    return data
  },

  invalidateCache: () => set({ cache: {}, drivers: [], teams: [], circuits: [], seasons: [], races: [] }),
}))
