import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDriversQuery } from '../services/queries'
import { PageHeader, EmptyState, Card, Badge, ErrorState, SkeletonTable } from '../components/ui'

export default function Drivers() {
  const [search, setSearch] = useState('')
  const { data: drivers = [], isLoading, error, refetch } = useDriversQuery()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.code || '').toLowerCase().includes(q) ||
      (d.nationality || '').toLowerCase().includes(q)
    )
  }, [drivers, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [filtered])

  if (isLoading) return <SkeletonTable rows={9} cols={4} />
  if (error) return <ErrorState message={error?.message || 'Failed to load drivers.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-10">
      <PageHeader title="Drivers" subtitle={`${drivers.length} drivers in database`}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search drivers..."
          className="input w-48"
        />
      </PageHeader>

      {sorted.length === 0 ? <EmptyState message="No drivers found." /> : (
        <>
          <div className="sm:hidden space-y-2">
            {sorted.map(d => (
              <Link key={d.id} to={`/driver/${d.id}`} className="block">
                <div className="apple-card p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-muted shrink-0">
                    {d.image_url
                      ? <img src={d.image_url} alt={d.name} className="w-full h-full object-cover object-top" loading="lazy" decoding="async" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-black" style={{ color: 'var(--text-muted)' }}>{d.code || '?'}</div>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{d.name}</div>
                    <div className="text-xs font-bold text-f1red mt-0.5">{d.code || 'N/A'}</div>
                    <div className="text-xs text-secondary mt-1 truncate">
                      {[d.nationality, d.dob ? new Date(d.dob).getFullYear() : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {d.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Card className="p-0 overflow-hidden hidden sm:block">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left py-2 pl-3">Driver</th>
                <th className="text-left py-2 hidden sm:table-cell">Nationality</th>
                <th className="text-left py-2 hidden md:table-cell">DOB</th>
                <th className="text-right py-2 pr-3 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => (
                <tr key={d.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 pl-3 align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-muted shrink-0">
                        {d.image_url
                          ? <img src={d.image_url} alt={d.name} className="w-full h-full object-cover object-top" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-black" style={{ color: 'var(--text-muted)' }}>{d.code || '?'}</div>
                        }
                      </div>
                      <div className="min-w-0">
                        <Link to={`/driver/${d.id}`} className="text-sm font-semibold hover:text-f1red transition-colors truncate block">
                          {d.name}
                        </Link>
                        <div className="text-xs font-bold text-f1red">{d.code || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 hidden sm:table-cell align-middle truncate" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {d.flag_url && <img src={d.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm" loading="lazy" />}
                      <span className="truncate">{d.nationality || '—'}</span>
                    </div>
                  </td>
                  <td className="py-2 hidden md:table-cell align-middle truncate" style={{ color: 'var(--text-secondary)' }}>
                    {d.dob ? new Date(d.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right align-middle">
                    {d.is_active
                      ? <Badge color="green">Active</Badge>
                      : <Badge color="gray">Inactive</Badge>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </>
      )}
    </div>
  )
}
