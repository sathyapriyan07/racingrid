import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Card } from '../../components/ui'
import {
  normalizeDrivers, normalizeTeams, normalizeCircuits
} from '../../utils/normalizers'

// These fetch via Supabase Edge Function proxy (not direct frontend calls)
// The edge function URL pattern: /functions/v1/sync-ergast
// Falls back to direct fetch for development if edge function not deployed

async function callEdgeFunction(name, payload) {
  const { data, error } = await supabase.functions.invoke(name, { body: payload })
  if (error) throw error
  return data
}

function SyncStatus({ result }) {
  if (result.status === 'fetching') {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
        <Loader size={11} className="animate-spin" /> Fetching from API...
      </div>
    )
  }
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
  if (result.status === 'done') {
    return (
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-400">
          <CheckCircle size={11} /> {result.saved} inserted
        </span>
        {result.skipped > 0 && (
          <span className="text-white/40">{result.skipped} already existed</span>
        )}
        <span className="text-white/30">Total: {result.total}</span>
      </div>
    )
  }
  if (result.status === 'error') {
    return (
      <div className="flex items-center gap-1 mt-2 text-xs text-f1red">
        <XCircle size={11} /> {result.error}
      </div>
    )
  }
  return null
}

// Dev: proxied via Vite (/api/ergast → https://api.jolpi.ca/ergast/f1)
// Prod: routed through Supabase Edge Function
const SYNC_ACTIONS = [
  {
    id: 'ergast-drivers',
    label: 'Sync Drivers from Ergast',
    description: 'Fetch all F1 drivers (879 total via api.jolpi.ca)',
    edgeEndpoint: 'https://api.jolpi.ca/ergast/f1/drivers/?limit=1000&format=json',
    devPath: '/api/ergast/drivers/?limit=1000&format=json',
    table: 'drivers',
    normalize: (data) => normalizeDrivers(data, 'ergast'),
  },
  {
    id: 'ergast-constructors',
    label: 'Sync Teams from Ergast',
    description: 'Fetch all F1 constructors (214 total via api.jolpi.ca)',
    edgeEndpoint: 'https://api.jolpi.ca/ergast/f1/constructors/?limit=300&format=json',
    devPath: '/api/ergast/constructors/?limit=300&format=json',
    table: 'teams',
    normalize: (data) => normalizeTeams(data, 'ergast'),
  },
  {
    id: 'ergast-circuits',
    label: 'Sync Circuits from Ergast',
    description: 'Fetch all F1 circuits (78 total via api.jolpi.ca)',
    edgeEndpoint: 'https://api.jolpi.ca/ergast/f1/circuits/?limit=100&format=json',
    devPath: '/api/ergast/circuits/?limit=100&format=json',
    table: 'circuits',
    normalize: (data) => normalizeCircuits(data, 'ergast'),
  },
]

export default function AdminSync() {
  const [running, setRunning] = useState({})
  const [results, setResults] = useState({})
  const [year, setYear] = useState(new Date().getFullYear())
  const [seasonResult, setSeasonResult] = useState(null)

  const runSync = async (action) => {
    setRunning(r => ({ ...r, [action.id]: true }))
    setResults(r => ({ ...r, [action.id]: { status: 'fetching' } }))
    try {
      // Step 1: fetch data
      let rawData
      try {
        rawData = await callEdgeFunction('sync-ergast', { endpoint: action.edgeEndpoint })
      } catch {
        const res = await fetch(action.devPath)
        if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
        rawData = await res.json()
      }

      // Step 2: normalize
      const normalized = action.normalize(rawData)
      if (!normalized.length) throw new Error('No data returned after normalization')
      const clean = normalized.map(r => { const x = { ...r }; delete x.id; return x })

      setResults(r => ({ ...r, [action.id]: { status: 'saving', total: clean.length, saved: 0 } }))

      // Step 3: insert in chunks, track progress
      const CHUNK = 200
      let saved = 0
      let skipped = 0
      for (let i = 0; i < clean.length; i += CHUNK) {
        const chunk = clean.slice(i, i + CHUNK)
        const { error } = await supabase.from(action.table).insert(chunk)
        if (error) {
          if (error.code === '23505') {
            // All duplicates — insert one by one to count new vs skipped
            for (const row of chunk) {
              const { error: e2 } = await supabase.from(action.table).insert(row)
              if (e2 && e2.code === '23505') skipped++
              else if (!e2) saved++
              else throw e2
            }
          } else {
            throw error
          }
        } else {
          saved += chunk.length
        }
        setResults(r => ({ ...r, [action.id]: { status: 'saving', total: clean.length, saved: saved + skipped, skipped } }))
      }

      setResults(r => ({ ...r, [action.id]: { status: 'done', total: clean.length, saved, skipped } }))
      toast.success(`${action.table}: ${saved} inserted, ${skipped} already existed`)
    } catch (err) {
      setResults(r => ({ ...r, [action.id]: { status: 'error', error: err.message } }))
      toast.error(err.message)
    } finally {
      setRunning(r => ({ ...r, [action.id]: false }))
    }
  }

  const syncSeason = async () => {
    setRunning(r => ({ ...r, season: true }))
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
      setRunning(r => ({ ...r, season: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sync Tools</h1>
        <p className="text-white/40 text-sm mt-1">
          Fetch data from external APIs via server-side actions. Deploy the Edge Function for production use.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">⚠ Edge Function Required</span>
        </div>
        <p className="text-xs text-white/40">
          For production, deploy <code className="text-white/60">supabase/functions/sync-ergast/index.ts</code>.
          In development, sync buttons will attempt a direct fetch as fallback.
        </p>
      </Card>

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
            {running.season
              ? <><Loader size={12} className="animate-spin" /> Adding...</>
              : 'Add Season'
            }
          </button>
        </div>
        {seasonResult && (
          <div className={`flex items-center gap-1.5 mt-3 text-xs ${seasonResult.ok ? 'text-green-400' : 'text-f1red'}`}>
            {seasonResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {seasonResult.msg}
          </div>
        )}
      </Card>

      {/* Ergast Sync */}
      <div>
        <h2 className="text-sm font-bold mb-3 text-white/70 flex items-center gap-2">
          Ergast API
          <a href="http://ergast.com/mrd/" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white">
            <ExternalLink size={12} />
          </a>
        </h2>
        <div className="space-y-3">
          {SYNC_ACTIONS.map(action => (
            <div key={action.id} className="glass p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{action.description}</div>
                {results[action.id] && <SyncStatus result={results[action.id]} />}
              </div>
              <button
                onClick={() => runSync(action)}
                disabled={running[action.id]}
                className="btn-ghost flex items-center gap-2 shrink-0"
              >
                <RefreshCw size={12} className={running[action.id] ? 'animate-spin' : ''} />
                {running[action.id] ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edge Function instructions */}
      <Card>
        <h2 className="text-sm font-bold mb-3">Deploy Edge Function</h2>
        <pre className="text-xs text-white/50 bg-dark-900 rounded-lg p-3 overflow-x-auto">{`# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the sync function
supabase functions deploy sync-ergast`}</pre>
      </Card>
    </div>
  )
}
