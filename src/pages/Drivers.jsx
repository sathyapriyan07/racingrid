import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState } from '../components/ui'

function DriverCard({ driver, size = 'md' }) {
  const isLg = size === 'lg'
  return (
    <Link to={`/driver/${driver.id}`}>
      <div className="apple-card overflow-hidden flex flex-col" style={{ width: isLg ? 160 : 130 }}>
        <div className={`${isLg ? 'h-44' : 'h-32'} bg-white/4 overflow-hidden relative`}>
          {driver.image_url
            ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover object-top" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: 'var(--text-muted)' }}>{driver.code || '?'}</div>
          }
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.7) 0%, transparent 50%)' }} />
          {driver.flag_url && <img src={driver.flag_url} alt="" className="absolute bottom-2 right-2 h-4 w-auto rounded-sm" loading="lazy" />}
        </div>
        <div className="p-3">
          <div className="text-xs font-bold text-f1red">{driver.code || '—'}</div>
          <div className="text-xs font-semibold mt-0.5 leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{driver.name}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{driver.nationality || '—'}</div>
        </div>
      </div>
    </Link>
  )
}

export default function Drivers() {
  const { fetchDrivers, drivers } = useDataStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchDrivers().catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.nationality || '').toLowerCase().includes(search.toLowerCase())
  )

  const current = filtered.filter(d => d.is_active)
  const others = filtered.filter(d => !d.is_active)

  if (loading) return <Spinner />

  return (
    <div className="space-y-10">
      <PageHeader title="Drivers" subtitle={`${drivers.length} drivers in database`}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search drivers..." className="input w-48" />
      </PageHeader>

      {filtered.length === 0 ? <EmptyState message="No drivers found." /> : (
        <>
          {current.length > 0 && (
            <section>
              <h2 className="section-title mb-5">Current Season</h2>
              <div className="scroll-row pb-4">
                {current.map(driver => <DriverCard key={driver.id} driver={driver} size="lg" />)}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              {current.length > 0 && <h2 className="section-title mb-5">All Drivers</h2>}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {others.map(driver => (
                  <Link key={driver.id} to={`/driver/${driver.id}`}>
                    <div className="apple-card overflow-hidden">
                      <div className="h-24 bg-white/4 overflow-hidden relative">
                        {driver.image_url
                          ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover object-top" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center font-black text-lg" style={{ color: 'var(--text-muted)' }}>{driver.code || '?'}</div>
                        }
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.6) 0%, transparent 50%)' }} />
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-f1red">{driver.code || '—'}</div>
                        <div className="text-xs font-semibold mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{driver.name}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {driver.flag_url && <img src={driver.flag_url} alt="" className="h-3 w-auto rounded-sm" loading="lazy" />}
                          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{driver.nationality || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
