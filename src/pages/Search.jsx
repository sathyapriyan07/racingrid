import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner, Card } from '../components/ui'
import { Search } from 'lucide-react'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState({ drivers: [], teams: [], races: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) return
    setLoading(true)
    const term = `%${q}%`
    Promise.all([
      supabase.from('drivers').select('id, name, code, nationality').ilike('name', term).limit(5),
      supabase.from('teams').select('id, name, nationality').ilike('name', term).limit(5),
      supabase.from('races').select('id, name, date, seasons(year)').ilike('name', term).limit(5),
    ]).then(([d, t, r]) => {
      setResults({ drivers: d.data || [], teams: t.data || [], races: r.data || [] })
    }).finally(() => setLoading(false))
  }, [q])

  const total = results.drivers.length + results.teams.length + results.races.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Search size={20} className="text-white/40" />
        <h1 className="text-xl font-bold">Search results for <span className="text-f1red">"{q}"</span></h1>
      </div>

      {loading && <Spinner />}

      {!loading && q && total === 0 && (
        <Card><p className="text-white/30 text-sm text-center py-4">No results found.</p></Card>
      )}

      {results.drivers.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-wider">Drivers</h2>
          <div className="space-y-2">
            {results.drivers.map(d => (
              <Link key={d.id} to={`/driver/${d.id}`}>
                <div className="glass-hover p-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-f1red w-8">{d.code || '—'}</span>
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-white/40 ml-auto">{d.nationality}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results.teams.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-wider">Teams</h2>
          <div className="space-y-2">
            {results.teams.map(t => (
              <Link key={t.id} to={`/team/${t.id}`}>
                <div className="glass-hover p-3 flex items-center gap-3">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-white/40 ml-auto">{t.nationality}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results.races.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-wider">Races</h2>
          <div className="space-y-2">
            {results.races.map(r => (
              <Link key={r.id} to={`/race/${r.id}`}>
                <div className="glass-hover p-3 flex items-center gap-3">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-white/40 ml-auto">{r.seasons?.year}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
