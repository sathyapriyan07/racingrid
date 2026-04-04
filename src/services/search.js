import { supabase } from '../lib/supabase'

function throwIfError(result) {
  if (result?.error) throw result.error
  return result?.data || []
}

export async function searchAll(query, { limit = 6 } = {}) {
  const q = (query || '').trim()
  if (!q) return { drivers: [], teams: [], races: [], circuits: [] }

  const term = `%${q}%`

  const [driversRes, teamsRes, racesRes, circuitsRes] = await Promise.all([
    supabase
      .from('drivers')
      .select('id, name, code, nationality, image_url, flag_url')
      .or(`name.ilike.${term},code.ilike.${term}`)
      .limit(limit),
    supabase
      .from('teams')
      .select('id, name, nationality, logo_url')
      .ilike('name', term)
      .limit(limit),
    supabase
      .from('races')
      .select('id, name, date, seasons(year)')
      .ilike('name', term)
      .limit(limit),
    supabase
      .from('circuits')
      .select('id, name, location, country, layout_image')
      .or(`name.ilike.${term},location.ilike.${term},country.ilike.${term}`)
      .limit(limit),
  ])

  return {
    drivers: throwIfError(driversRes),
    teams: throwIfError(teamsRes),
    races: throwIfError(racesRes),
    circuits: throwIfError(circuitsRes),
  }
}

