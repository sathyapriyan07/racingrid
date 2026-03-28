import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, Card } from '../components/ui'

export default function CircuitPage() {
  const { id } = useParams()
  const { fetchCircuit } = useDataStore()
  const [circuit, setCircuit] = useState(null)
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const c = await fetchCircuit(id)
        setCircuit(c)

        const { data: racesData } = await supabase
          .from('races')
          .select('*, seasons(*)')
          .eq('circuit_id', id)
          .order('date', { ascending: false })

        if (!racesData?.length) { setRaces([]); return }

        const raceIds = racesData.map(r => r.id)

        // Fetch race winners and sprint winners in parallel
        const [{ data: winners }, { data: sprintWinners }] = await Promise.all([
          supabase.from('results')
            .select('race_id, drivers(id, name, code, image_url)')
            .in('race_id', raceIds)
            .eq('position', 1),
          supabase.from('sprint_results')
            .select('race_id, drivers(id, name, code, image_url)')
            .in('race_id', raceIds)
            .eq('position', 1),
        ])

        const winnerMap = {}
        winners?.forEach(w => { winnerMap[w.race_id] = w.drivers })
        const sprintMap = {}
        sprintWinners?.forEach(w => { sprintMap[w.race_id] = w.drivers })

        setRaces(racesData.map(r => ({
          ...r,
          winner: winnerMap[r.id] || null,
          sprintWinner: sprintMap[r.id] || null,
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <Spinner />
  if (!circuit) return <div className="text-white/40 text-center py-16">Circuit not found.</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6 flex gap-6 items-center flex-wrap">
        <div className="flex-1">
          <h1 className="text-3xl font-black">{circuit.name}</h1>
          <div className="flex gap-4 mt-2 text-sm flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            {circuit.location && <span>📍 {circuit.location}</span>}
            {circuit.country && <span>🌍 {circuit.country}</span>}
          </div>
        </div>
        {circuit.layout_image && (
          <div className="w-48 h-32 shrink-0">
            <img src={circuit.layout_image} alt={circuit.name} className="w-full h-full object-contain opacity-80" />
          </div>
        )}
      </div>

      {circuit.layout_image && (
        <Card>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Circuit Layout</h2>
          <img src={circuit.layout_image} alt={circuit.name} className="max-h-72 mx-auto object-contain" />
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
          Races Hosted ({races.length})
        </div>
        {races.length === 0 ? (
          <p className="text-sm px-4 pb-4" style={{ color: 'var(--text-muted)' }}>No races recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left py-2 pl-4">Race</th>
                <th className="text-left py-2 hidden sm:table-cell">Winner</th>
                <th className="text-left py-2 hidden md:table-cell">Sprint Winner</th>
                <th className="text-right py-2 pr-4">Season</th>
              </tr>
            </thead>
            <tbody>
              {races.map(race => (
                <tr key={race.id} className="border-b hover:bg-white/3 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2.5 pl-4">
                    <Link to={`/race/${race.id}`} className="hover:text-f1red transition-colors font-medium" style={{ fontSize: 13 }}>
                      {race.name}
                    </Link>
                  </td>
                  <td className="py-2.5 hidden sm:table-cell">
                    {race.winner ? (
                      <Link to={`/driver/${race.winner.id}`} className="flex items-center gap-2 hover:text-f1red transition-colors">
                        {race.winner.image_url
                          ? <img src={race.winner.image_url} alt={race.winner.name} className="w-6 h-6 object-cover object-top shrink-0" />
                          : <div className="w-6 h-6 shrink-0 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{race.winner.code}</div>
                        }
                        <span style={{ fontSize: 12 }}>{race.winner.name}</span>
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td className="py-2.5 hidden md:table-cell">
                    {race.sprintWinner ? (
                      <Link to={`/driver/${race.sprintWinner.id}`} className="flex items-center gap-2 hover:text-f1red transition-colors">
                        {race.sprintWinner.image_url
                          ? <img src={race.sprintWinner.image_url} alt={race.sprintWinner.name} className="w-6 h-6 object-cover object-top shrink-0" />
                          : <div className="w-6 h-6 shrink-0 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{race.sprintWinner.code}</div>
                        }
                        <span style={{ fontSize: 12 }}>{race.sprintWinner.name}</span>
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {race.seasons?.year} · R{race.round}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
