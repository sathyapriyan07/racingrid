import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const ALLOWED_ORIGINS = [
  'https://api.jolpi.ca',
  'http://api.jolpi.ca',
  'https://api.openf1.org',
]

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...init.headers,
    },
  })
}

function requireEnv(name: string) {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function assertAdmin(req: Request) {
  const url = requireEnv('SUPABASE_URL')
  const anonKey = requireEnv('SUPABASE_ANON_KEY')
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader) return { ok: false as const, status: 401, error: 'Missing Authorization header' }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data, error } = await supabase.rpc('is_admin')
  if (error) return { ok: false as const, status: 500, error: error.message }
  if (!data) return { ok: false as const, status: 403, error: 'Admin only' }
  return { ok: true as const, supabase }
}

async function upsertChunked(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string,
  chunkSize = 1000,
) {
  let saved = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase.from(table).upsert(chunk, { onConflict })
    if (error) throw new Error(error.message)
    saved += chunk.length
  }
  return saved
}

async function syncQualifyingByYear(req: Request, year: number) {
  const admin = await assertAdmin(req)
  if (!admin.ok) return json({ error: admin.error }, { status: admin.status })
  const supabase = admin.supabase

  const { data: season, error: seasonErr } = await supabase.from('seasons').select('id').eq('year', year).single()
  if (seasonErr) return json({ error: `Season ${year} not found — sync seasons/races first` }, { status: 400 })

  const [{ data: drivers }, { data: teams }, { data: races }] = await Promise.all([
    supabase.from('drivers').select('id, name, code'),
    supabase.from('teams').select('id, name, ergast_id'),
    supabase.from('races').select('id, round').eq('season_id', season.id),
  ])

  const driverMap: Record<string, string> = {}
  drivers?.forEach(d => {
    if (d.code) driverMap[d.code] = d.id
    if (d.name) driverMap[d.name] = d.id
  })
  const teamMap: Record<string, string> = {}
  teams?.forEach(t => {
    if (t.name) teamMap[t.name] = t.id
    if (t.ergast_id) teamMap[t.ergast_id] = t.id
  })
  const raceMap: Record<number, string> = {}
  races?.forEach(r => {
    if (typeof r.round === 'number') raceMap[r.round] = r.id
  })

  const firstEndpoint = `https://api.jolpi.ca/ergast/f1/${year}/qualifying/?limit=100&format=json`
  const firstRes = await fetch(firstEndpoint, { headers: { 'Accept': 'application/json' } })
  if (!firstRes.ok) return json({ error: `Upstream error: ${firstRes.status}` }, { status: 502 })
  const firstPage = await firstRes.json()
  const total = parseInt(firstPage?.MRData?.total || '0')
  const offsets = Array.from({ length: Math.max(0, Math.ceil(total / 100) - 1) }, (_, i) => (i + 1) * 100)

  const restPages = await Promise.all(offsets.map(async (offset) => {
    const endpoint = `https://api.jolpi.ca/ergast/f1/${year}/qualifying/?limit=100&offset=${offset}&format=json`
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) throw new Error(`Upstream error: ${res.status}`)
    return res.json()
  }))

  const allRaces = [firstPage, ...restPages].flatMap(p => p?.MRData?.RaceTable?.Races || [])
  const rows = allRaces.flatMap((race) => {
    const round = parseInt(race.round)
    const raceId = raceMap[round]
    if (!raceId) return []
    return (race.QualifyingResults || []).map((r) => ({
      race_id: raceId,
      driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
      team_id: teamMap[r.Constructor?.constructorId] || teamMap[r.Constructor?.name] || null,
      position: parseInt(r.position) || null,
      q1: r.Q1 || null,
      q2: r.Q2 || null,
      q3: r.Q3 || null,
    }))
  })

  const clean = rows
    .filter(r => r.race_id && r.driver_id)
    .map(r => r as Record<string, unknown>)

  if (!clean.length) return json({ error: 'No qualifying rows to upsert' }, { status: 400 })

  const saved = await upsertChunked(supabase, 'qualifying_results', clean, 'race_id,driver_id')
  return json({ ok: true, year, attempted: clean.length, upserted: saved })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const payload = await req.json().catch(() => ({}))
    const { endpoint, action, year } = payload ?? {}

    if (action === 'sync_qualifying') {
      const yr = typeof year === 'string' ? parseInt(year) : year
      if (!yr || Number.isNaN(yr)) return json({ error: 'year required' }, { status: 400 })
      return await syncQualifyingByYear(req, yr)
    }

    if (!endpoint) {
      return json({ error: 'endpoint required' }, { status: 400 })
    }

    const isAllowed = ALLOWED_ORIGINS.some(origin => endpoint.startsWith(origin))
    if (!isAllowed) {
      return json({ error: 'Endpoint not in allowlist' }, { status: 403 })
    }

    const response = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status}`)
    }

    const data = await response.json()
    return json(data)
  } catch (err) {
    return json({ error: err.message }, { status: 500 })
  }
})
