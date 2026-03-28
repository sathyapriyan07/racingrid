import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, Badge, StatCard } from '../components/ui'
import { Flag, Activity, AlertTriangle, Clock } from 'lucide-react'

const LapChart = lazy(() => import('../components/charts/LapChart'))

const EVENT_COLORS = {
  safety_car: 'yellow',
  yellow_flag: 'yellow',
  crash: 'red',
  overtake: 'green',
  vsc: 'yellow',
  red_flag: 'red',
}

const POSITION_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

export default function RacePage() {
  const { id } = useParams()
  const { fetchRace, fetchRaceResults, fetchLaps, fetchPitStops, fetchRaceEvents } = useDataStore()
  const [race, setRace] = useState(null)
  const [results, setResults] = useState([])
  const [laps, setLaps] = useState([])
  const [pitStops, setPitStops] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentLap, setCurrentLap] = useState(null)
  const [activeTab, setActiveTab] = useState('results')

  useEffect(() => {
    const load = async () => {
      const [r, res, l, p, e] = await Promise.all([
        fetchRace(id),
        fetchRaceResults(id),
        fetchLaps(id),
        fetchPitStops(id),
        fetchRaceEvents(id),
      ])
      setRace(r)
      setResults(res || [])
      setLaps(l || [])
      setPitStops(p || [])
      setEvents(e || [])
      const maxLap = l?.length ? Math.max(...l.map(x => x.lap_number)) : 0
      setCurrentLap(maxLap || null)
    }
    load().finally(() => setLoading(false))
  }, [id])

  const maxLap = useMemo(() => laps.length ? Math.max(...laps.map(l => l.lap_number)) : 0, [laps])

  const replayPositions = useMemo(() => {
    if (!currentLap || !laps.length) return results
    const lapData = laps.filter(l => l.lap_number === currentLap)
    return lapData.sort((a, b) => (a.position || 99) - (b.position || 99))
  }, [currentLap, laps, results])

  const currentPitStops = useMemo(() =>
    pitStops.filter(p => p.lap <= (currentLap || maxLap)),
    [pitStops, currentLap, maxLap]
  )

  const currentEvents = useMemo(() =>
    events.filter(e => e.lap <= (currentLap || maxLap)),
    [events, currentLap, maxLap]
  )

  if (loading) return <Spinner />
  if (!race) return <div className="text-white/40 text-center py-16">Race not found.</div>

  const tabs = [
    { id: 'results', label: 'Results', icon: Flag },
    { id: 'replay', label: 'Lap Replay', icon: Activity },
    { id: 'pits', label: 'Pit Stops', icon: Clock },
    { id: 'events', label: 'Events', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-white/40 mb-1">
              {race.seasons?.year} · Round {race.round}
            </div>
            <h1 className="text-3xl font-black">{race.name}</h1>
            <div className="flex gap-4 mt-2 text-sm text-white/50 flex-wrap">
              {race.circuits && (
                <Link to={`/circuit/${race.circuit_id}`} className="hover:text-white transition-colors">
                  📍 {race.circuits.name}
                </Link>
              )}
              {race.date && (
                <span>📅 {new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <StatCard label="Laps" value={maxLap || '—'} />
            <StatCard label="Drivers" value={results.length || '—'} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? 'bg-f1red text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Results Tab */}
      {activeTab === 'results' && (
        <Card>
          {results.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No results imported.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs border-b border-white/5">
                    <th className="text-left pb-3 w-10">Pos</th>
                    <th className="text-left pb-3">Driver</th>
                    <th className="text-left pb-3 hidden sm:table-cell">Team</th>
                    <th className="text-center pb-3 hidden md:table-cell">Grid</th>
                    <th className="text-center pb-3 hidden md:table-cell">Laps</th>
                    <th className="text-right pb-3">Time / Status</th>
                    <th className="text-right pb-3">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3">
                        <span className={`font-bold ${POSITION_COLORS[i] || 'text-white/60'}`}>
                          {r.position ?? '—'}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link to={`/driver/${r.driver_id}`} className="hover:text-f1red transition-colors font-medium">
                          {r.drivers?.name || '—'}
                        </Link>
                        {r.drivers?.code && <span className="text-xs text-white/30 ml-2">{r.drivers.code}</span>}
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <Link to={`/team/${r.team_id}`} className="text-white/50 hover:text-white transition-colors text-xs">
                          {r.teams?.name || '—'}
                        </Link>
                      </td>
                      <td className="py-3 text-center text-white/40 text-xs hidden md:table-cell">{r.grid ?? '—'}</td>
                      <td className="py-3 text-center text-white/40 text-xs hidden md:table-cell">{r.laps ?? '—'}</td>
                      <td className="py-3 text-right text-xs text-white/50">{r.time || r.status || '—'}</td>
                      <td className="py-3 text-right font-semibold text-xs">{r.points ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Replay Tab */}
      {activeTab === 'replay' && (
        <div className="space-y-4">
          {laps.length === 0 ? (
            <Card><p className="text-white/30 text-sm text-center py-4">No lap data imported.</p></Card>
          ) : (
            <>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white/70">Lap Position Chart</h2>
                  <Badge color="red">Lap {currentLap} / {maxLap}</Badge>
                </div>
                <Suspense fallback={<Spinner />}>
                  <LapChart laps={laps} currentLap={currentLap} />
                </Suspense>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white/70">Replay Slider</h2>
                  <span className="text-xs text-white/40">Lap {currentLap}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={maxLap}
                  value={currentLap || maxLap}
                  onChange={e => setCurrentLap(Number(e.target.value))}
                  className="w-full accent-f1red"
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>Lap 1</span>
                  <span>Lap {maxLap}</span>
                </div>

                {/* Live positions at current lap */}
                <div className="mt-4 space-y-1">
                  {replayPositions.slice(0, 10).map((item, i) => {
                    const hasPit = currentPitStops.some(p =>
                      p.driver_id === (item.driver_id || item.id) && p.lap === currentLap
                    )
                    const driverName = item.drivers?.name || item.drivers?.code || `P${i + 1}`
                    return (
                      <div key={item.id || i} className="flex items-center gap-3 py-1.5 border-b border-white/5">
                        <span className={`w-6 text-center text-xs font-bold ${POSITION_COLORS[i] || 'text-white/50'}`}>
                          {item.position || i + 1}
                        </span>
                        <span className="text-sm flex-1">{driverName}</span>
                        {hasPit && <Badge color="yellow">PIT</Badge>}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Pit Stops Tab */}
      {activeTab === 'pits' && (
        <Card>
          <h2 className="text-sm font-bold mb-4 text-white/70">Pit Stop Timeline</h2>
          {pitStops.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No pit stop data.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-16 top-0 bottom-0 w-px bg-white/10" />
              <div className="space-y-3">
                {pitStops
                  .sort((a, b) => a.lap - b.lap)
                  .map(pit => (
                    <div key={pit.id} className="flex items-center gap-4">
                      <span className="text-xs text-white/40 w-14 text-right shrink-0">Lap {pit.lap}</span>
                      <div className="w-2 h-2 rounded-full bg-f1red shrink-0 relative z-10" />
                      <div className="glass px-3 py-2 flex-1">
                        <span className="text-sm font-medium">{pit.drivers?.name || pit.drivers?.code || '—'}</span>
                        {pit.duration && <span className="text-xs text-white/40 ml-2">{pit.duration}s</span>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card>
          <h2 className="text-sm font-bold mb-4 text-white/70">Race Events</h2>
          {events.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No events recorded.</p>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-white/5">
                  <Badge color={EVENT_COLORS[ev.type] || 'gray'}>
                    {ev.type?.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <span className="text-sm">{ev.description || '—'}</span>
                  </div>
                  <span className="text-xs text-white/30 shrink-0">Lap {ev.lap}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
