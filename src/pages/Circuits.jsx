import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState } from '../components/ui'

export default function Circuits() {
  const { fetchCircuits, circuits } = useDataStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCircuits().catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = circuits.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.country || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.location || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <PageHeader title="Circuits" subtitle={`${circuits.length} circuits in database`}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search circuits..." className="input w-48" />
      </PageHeader>

      {filtered.length === 0 ? <EmptyState message="No circuits found." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(circuit => (
            <Link key={circuit.id} to={`/circuit/${circuit.id}`}>
              <div className="apple-card overflow-hidden group">
                <div className="h-36 relative flex items-center justify-center bg-muted">
                  {circuit.layout_image
                    ? <img src={circuit.layout_image} alt={circuit.name} loading="lazy"
                        className="h-full w-full object-contain p-6 opacity-50 group-hover:opacity-90 transition-opacity duration-300" />
                    : <div className="text-4xl font-black" style={{ color: 'var(--text-muted)', opacity: 0.2 }}>
                        {circuit.country?.slice(0, 2).toUpperCase() || '??'}
                      </div>
                  }
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.5) 0%, transparent 60%)' }} />
                </div>
                <div className="p-4">
                  <div className="font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>{circuit.name}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {circuit.location}{circuit.country ? `, ${circuit.country}` : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
