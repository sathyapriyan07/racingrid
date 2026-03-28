import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, Card, PageHeader } from '../components/ui'

export default function CircuitPage() {
  const { id } = useParams()
  const { fetchCircuit } = useDataStore()
  const [circuit, setCircuit] = useState(null)
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const c = await fetchCircuit(id)
      setCircuit(c)
      const { data } = await supabase
        .from('races')
        .select('*, seasons(*)')
        .eq('circuit_id', id)
        .order('date', { ascending: false })
      setRaces(data || [])
    }
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (!circuit) return <div className="text-white/40 text-center py-16">Circuit not found.</div>

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h1 className="text-3xl font-black">{circuit.name}</h1>
        <div className="flex gap-4 mt-2 text-sm text-white/50">
          {circuit.location && <span>📍 {circuit.location}</span>}
          {circuit.country && <span>🌍 {circuit.country}</span>}
        </div>
      </div>

      {circuit.layout_image && (
        <Card>
          <img src={circuit.layout_image} alt={circuit.name} className="max-h-64 mx-auto object-contain opacity-80" />
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-bold mb-3 text-white/70">Races Hosted ({races.length})</h2>
        {races.length === 0 ? (
          <p className="text-white/30 text-sm">No races recorded.</p>
        ) : (
          <div className="space-y-2">
            {races.map(race => (
              <Link key={race.id} to={`/race/${race.id}`}>
                <div className="flex items-center justify-between py-2 border-b border-white/5 hover:text-f1red transition-colors">
                  <span className="text-sm">{race.name}</span>
                  <span className="text-xs text-white/40">{race.seasons?.year} · Round {race.round}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
