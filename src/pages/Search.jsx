import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { Card, EmptyState, ErrorState, Skeleton, Tabs } from '../components/ui'
import { useSearchAllQuery } from '../services/queries'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q') || ''
  const [input, setInput] = useState(q)
  const debounced = useDebouncedValue(input, 250)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    const next = (debounced || '').trim()
    if (!next) return
    if (next === (q || '').trim()) return
    navigate(`/search?q=${encodeURIComponent(next)}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, isFetching, error, refetch } = useSearchAllQuery(q, { limit: 18 })
  const results = data || { drivers: [], teams: [], races: [], circuits: [] }
  const total = results.drivers.length + results.teams.length + results.races.length + results.circuits.length

  const tabs = useMemo(() => ({
    all: { label: 'All', count: total },
    drivers: { label: 'Drivers', count: results.drivers.length },
    teams: { label: 'Teams', count: results.teams.length },
    races: { label: 'Races', count: results.races.length },
    circuits: { label: 'Circuits', count: results.circuits.length },
  }), [results, total])

  const showDrivers = tab === 'all' || tab === 'drivers'
  const showTeams = tab === 'all' || tab === 'teams'
  const showRaces = tab === 'all' || tab === 'races'
  const showCircuits = tab === 'all' || tab === 'circuits'

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3 pt-4">
        <Search size={20} style={{ color: 'var(--text-muted)' }} />
        <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>
          Results for <span className="text-f1red">"{q}"</span>
        </h1>
      </motion.div>

      <div className="apple-card p-4 flex items-center gap-3">
        <Search size={14} className="text-secondary" />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Search drivers, teams, races, circuits…"
          className="input h-10"
          aria-label="Search query"
        />
      </div>

      <Tabs
        id={`search-${q || 'empty'}`}
        value={tab}
        onChange={setTab}
        items={Object.entries(tabs).map(([key, t]) => ({ id: key, label: `${t.label} (${t.count})` }))}
      />

      {error && <ErrorState message={error?.message || 'Search failed.'} onRetry={() => refetch()} />}

      {!error && isFetching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="apple-card p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-2" />
            </div>
          ))}
        </div>
      )}

      {!error && !isFetching && q && total === 0 && (
        <Card className="p-0">
          <EmptyState message={`No results found for "${q}"`} icon="⌕" />
        </Card>
      )}

      {showDrivers && results.drivers.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Drivers</p>
          <div className="space-y-2">
            {results.drivers.map(d => (
              <Link key={d.id} to={`/driver/${d.id}`}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}
                  className="apple-card p-4 flex items-center gap-3">
                  {d.image_url
                    ? <img src={d.image_url} alt={d.name} className="w-9 h-9 rounded-full object-cover object-top shrink-0" loading="lazy" decoding="async" />
                    : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{d.code}</div>
                  }
                  <span className="text-xs font-bold text-f1red w-8 shrink-0">{d.code || '—'}</span>
                  <span className="font-semibold text-sm flex-1" style={{ letterSpacing: '-0.01em' }}>{d.name}</span>
                  <div className="flex items-center gap-1.5">
                    {d.flag_url && <img src={d.flag_url} alt="" className="h-3.5 w-auto rounded-sm" loading="lazy" decoding="async" />}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.nationality}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {showTeams && results.teams.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Teams</p>
          <div className="space-y-2">
            {results.teams.map(t => (
              <Link key={t.id} to={`/team/${t.id}`}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}
                  className="apple-card p-4 flex items-center gap-3">
                  {t.logo_url
                    ? <img src={t.logo_url} alt={t.name} className="w-8 h-8 object-contain shrink-0" loading="lazy" decoding="async" />
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

      {showRaces && results.races.length > 0 && (
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

      {showCircuits && results.circuits.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Circuits</p>
          <div className="space-y-2">
            {results.circuits.map(c => (
              <Link key={c.id} to={`/circuit/${c.id}`}>
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}
                  className="apple-card p-4 flex items-center gap-3">
                  {c.layout_image
                    ? <img src={c.layout_image} alt="" className="w-10 h-10 object-contain shrink-0 opacity-90" loading="lazy" decoding="async" />
                    : <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--bg-muted)' }} />
                  }
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate" style={{ letterSpacing: '-0.01em' }}>{c.name}</div>
                    <div className="text-xs text-secondary truncate mt-0.5">{[c.location, c.country].filter(Boolean).join(' · ')}</div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
