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
    <div>
      <PageHeader title="Circuits" subtitle={`${circuits.length} circuits in database`}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search circuits..." className="input w-48" />
      </PageHeader>

      {filtered.length === 0 ? <EmptyState message="No circuits found." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(circuit => (
            <Link key={circuit.id} to={`/circuit/${circuit.id}`}>
              <div className="glass-hover group overflow-hidden">
                {circuit.layout_image && (
                  <div className="h-32 bg-dark-700 overflow-hidden">
                    <img src={circuit.layout_image} alt={circuit.name} className="w-full h-full object-contain p-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <div className="p-4">
                  <div className="font-semibold group-hover:text-f1red transition-colors">{circuit.name}</div>
                  <div className="text-xs text-white/40 mt-1">{circuit.location}{circuit.country ? `, ${circuit.country}` : ''}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
