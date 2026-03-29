import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState } from '../components/ui'

function DriverCard({ driver }) {
  return (
    <Link to={`/driver/${driver.id}`}>
      <div className="glass-hover p-4 group text-center">
        <div className="w-16 h-16 rounded-full bg-dark-600 mx-auto mb-3 overflow-hidden">
          {driver.image_url
            ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-lg font-black text-white/20">{driver.code || '?'}</div>
          }
        </div>
        <div className="text-sm font-bold text-f1red">{driver.code || '—'}</div>
        <div className="text-sm font-semibold text-white group-hover:text-f1red transition-colors mt-0.5">{driver.name}</div>
        <div className="text-xs text-white/40 mt-1">{driver.nationality || '—'}</div>
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
    <div>
      <PageHeader title="Drivers" subtitle={`${drivers.length} drivers in database`}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search drivers..." className="input w-48" />
      </PageHeader>

      {filtered.length === 0 ? <EmptyState message="No drivers found." /> : (
        <>
          {current.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-white mb-3">Current Drivers</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {current.map(driver => <DriverCard key={driver.id} driver={driver} />)}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              {current.length > 0 && <h2 className="text-lg font-bold text-white mb-3">All Drivers</h2>}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {others.map(driver => <DriverCard key={driver.id} driver={driver} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
