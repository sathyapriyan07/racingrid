import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'

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
      supabase.from('drivers').select('id, name, code, nationality, image_url, flag_url').ilike('name', term).limit(5),
      supabase.from('teams').select('id, name, nationality, logo_url').ilike('name', term).limit(5),
      supabase.from('races').select('id, name, date, seasons(year)').ilike('name', term).limit(5),
    ]).then(([d, t, r]) => {
      setResults({ drivers: d.data || [], teams: t.data || [], races: r.data || [] })
    }).catch(console.error).finally(() => setLoading(false))
  }, [q])

  const total = results.drivers.length + results.teams.length + results.races.length

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3 pt-4">
        <Search size={20} style={{ color: 'var(--text-muted)' }} />
        <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>
          Results for <span className="text-f1red">"{q}"</span>
        </h1>
      </motion.div>

      {loading && <Spinner />}

      {!loading && q && total === 0 && (
        <div className="apple-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No results found for "{q}"</p>
        </div>
      )}

      {results.drivers.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Drivers</p>
          <div className="space-y-2">
            {results.drivers.map(d => (
              <Link key={d.id} to={`/driver/${d.id}`}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}
                  className="apple-card p-4 flex items-center gap-3">
                  {d.image_url
                    ? <img src={d.image_url} alt={d.name} className="w-9 h-9 rounded-full object-cover object-top shrink-0" />
                    : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{d.code}</div>
                  }
                  <span className="text-xs font-bold text-f1red w-8 shrink-0">{d.code || '—'}</span>
                  <span className="font-semibold text-sm flex-1" style={{ letterSpacing: '-0.01em' }}>{d.name}</span>
                  <div className="flex items-center gap-1.5">
                    {d.flag_url && <img src={d.flag_url} alt="" className="h-3.5 w-auto rounded-sm" />}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.nationality}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {results.teams.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Teams</p>
          <div className="space-y-2">
            {results.teams.map(t => (
              <Link key={t.id} to={`/team/${t.id}`}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}
                  className="apple-card p-4 flex items-center gap-3">
                  {t.logo_url
                    ? <img src={t.logo_url} alt={t.name} className="w-8 h-8 object-contain shrink-0" />
                    : <div className="w-8 h-8 rounded shrink-0" style={{ background: 'var(--bg-muted)' }} />
                  }
                  <span className="font-semibold text-sm flex-1" style={{ letterSpacing: '-0.01em' }}>{t.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.nationality}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {results.races.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Races</p>
          <div className="space-y-2">
            {results.races.map(r => (
              <Link key={r.id} to={`/race/${r.id}`}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}
                  className="apple-card p-4 flex items-center gap-3">
                  <span className="font-semibold text-sm flex-1" style={{ letterSpacing: '-0.01em' }}>{r.name}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{r.seasons?.year}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
