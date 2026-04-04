import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDriversQuery } from '../services/queries'
import { PageHeader, EmptyState, Badge, ErrorState, SkeletonTable } from '../components/ui'
import { Search } from 'lucide-react'

function DriverCard({ driver, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link to={`/driver/${driver.id}`} className="block h-full">
        <div className="driver-card h-full">
          {/* Image */}
          <div className="relative h-36 bg-muted overflow-hidden">
            {driver.image_url
              ? <img src={driver.image_url} alt={driver.name}
                  className="w-full h-full object-cover object-top" loading="lazy" decoding="async" />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-secondary">
                  {driver.code || '?'}
                </div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            {/* Code badge */}
            <div className="absolute bottom-2 left-3">
              <span className="text-[10px] font-black tracking-widest text-accent">{driver.code}</span>
            </div>
            {/* Status dot */}
            <div className="absolute top-2 right-2">
              {driver.is_active
                ? <div className="live-dot" />
                : <div className="w-2 h-2 rounded-full bg-secondary/40" />
              }
            </div>
          </div>
          {/* Info */}
          <div className="p-3">
            <div className="font-black text-sm leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>
              {driver.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {driver.flag_url && (
                <img src={driver.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm shrink-0" loading="lazy" />
              )}
              <span className="text-[10px] text-secondary truncate">{driver.nationality || '—'}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Drivers() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')
  const { data: drivers = [], isLoading, error, refetch } = useDriversQuery()

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? drivers.filter(d =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.code || '').toLowerCase().includes(q) ||
          (d.nationality || '').toLowerCase().includes(q)
        )
      : drivers
    return [...filtered].sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [drivers, search])

  if (isLoading) return <SkeletonTable rows={9} cols={4} />
  if (error) return <ErrorState message={error?.message || 'Failed to load drivers.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-8">
      <PageHeader title="Drivers" subtitle={`${drivers.length} drivers in database`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search drivers..." className="input pl-8 w-44 h-9 text-xs" />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-border">
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === v ? 'bg-accent text-white' : 'bg-card text-secondary hover:text-primary'}`}>
                {v === 'grid' ? '⊞' : '≡'}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {sorted.length === 0 ? <EmptyState message="No drivers found." /> : (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sorted.map((d, i) => <DriverCard key={d.id} driver={d} index={i} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-border overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pl-4">Driver</th>
                  <th className="text-left py-2 hidden sm:table-cell">Nationality</th>
                  <th className="text-left py-2 hidden md:table-cell">DOB</th>
                  <th className="text-right py-2 pr-4 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => (
                  <tr key={d.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 pl-4 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-muted shrink-0">
                          {d.image_url
                            ? <img src={d.image_url} alt={d.name} className="w-full h-full object-cover object-top" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center text-xs font-black text-secondary">{d.code || '?'}</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <Link to={`/driver/${d.id}`} className="text-sm font-semibold hover:text-accent transition-colors truncate block">
                            {d.name}
                          </Link>
                          <div className="text-[10px] font-black text-accent">{d.code || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 hidden sm:table-cell align-middle" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1.5">
                        {d.flag_url && <img src={d.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm" loading="lazy" />}
                        <span className="text-xs truncate">{d.nationality || '—'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 hidden md:table-cell align-middle text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {d.dob ? new Date(d.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right align-middle">
                      {d.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
