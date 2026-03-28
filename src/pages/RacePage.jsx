import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, Badge, StatCard } from '../components/ui'
import { Flag, Activity, AlertTriangle, Clock } from 'lucide-react'

const LapChart = lazy(() => import('../components/charts/LapChart'))

const POSITION_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

const FLAG_COLOR = {
  YELLOW: 'yellow', 'DOUBLE YELLOW': 'yellow', RED: 'red',
  GREEN: 'green', CHEQUERED: 'gray', BLUE: 'blue',
}

async function openf1Fetch(path) {
  const base = import.meta.env.DEV ? '/api/openf1' : '/api/openf1'
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`OpenF1 ${res.status}`)
  return res.json()
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Convert lap_duration (seconds float) to mm:ss.mmm
function fmtLapTime(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(3).padStart(6, '0')
  return `${m}:${s}`
}

export default function RacePage() {
  const { id } = useParams()
  const { fetchRace, fetchRaceResults, fetchQualifying } = useDataStore()

  const [race, setRace] = useState(null)
  const [results, setResults] = useState([])
  const [qualifying, setQualifying] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('results')

  // OpenF1 state
  const [of1Drivers, setOf1Drivers] = useState({}) // driver_number → {name_acronym, full_name, team_colour}
  const [laps, setLaps] = useState([])             // all laps from OpenF1
  const [pitStops, setPitStops] = useState([])
  const [events, setEvents] = useState([])
  const [of1Loading, setOf1Loading] = useState(false)
  const [of1Error, setOf1Error] = useState(null)
  const [currentLap, setCurrentLap] = useState(1)

  // Load race + results + qualifying from Supabase
  useEffect(() => {
    Promise.all([fetchRace(id), fetchRaceResults(id), fetchQualifying(id)])
      .then(([r, res, q]) => {
        setRace(r)
        setResults(res || [])
        setQualifying(q || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  // Load OpenF1 data when race is ready and has a session key
  useEffect(() => {
    if (!race?.openf1_session_key) return
    const sk = race.openf1_session_key
    setOf1Loading(true)
    setOf1Error(null)

    const fetchAll = async () => {
      const drivers = await openf1Fetch(`/drivers?session_key=${sk}`)
      await delay(400)
      const lapsData = await openf1Fetch(`/laps?session_key=${sk}`)
      await delay(400)
      const pitsData = await openf1Fetch(`/pit?session_key=${sk}`)
      await delay(400)
      const rcData = await openf1Fetch(`/race_control?session_key=${sk}`)
      return [drivers, lapsData, pitsData, rcData]
    }

    fetchAll().then(([drivers, lapsData, pitsData, rcData]) => {
      // Build driver map: number → info
      const dMap = {}
      drivers.forEach(d => { dMap[d.driver_number] = d })
      setOf1Drivers(dMap)
      setLaps(lapsData)
      setPitStops(pitsData)
      // Filter meaningful events: flags + safety car + session status
      const meaningful = rcData.filter(e =>
        (e.category === 'Flag' && e.flag && !['GREEN', 'CLEAR'].includes(e.flag) && e.scope === 'Track') ||
        e.category === 'SafetyCar' ||
        (e.category === 'SessionStatus' && ['Started', 'Finished', 'Aborted'].includes(e.message))
      )
      setEvents(meaningful)
      const maxL = lapsData.length ? Math.max(...lapsData.map(l => l.lap_number)) : 1
      setCurrentLap(maxL)
    }).catch(err => setOf1Error(err.message))
      .finally(() => setOf1Loading(false))
  }, [race?.openf1_session_key])

  const maxLap = useMemo(() =>
    laps.length ? Math.max(...laps.map(l => l.lap_number)) : 0, [laps])

  // Derive positions at currentLap from cumulative lap times
  const replayPositions = useMemo(() => {
    if (!laps.length) return []
    // Sum lap durations up to currentLap per driver
    const totals = {}
    laps.filter(l => l.lap_number <= currentLap && l.lap_duration).forEach(l => {
      totals[l.driver_number] = (totals[l.driver_number] || 0) + l.lap_duration
    })
    return Object.entries(totals)
      .sort((a, b) => a[1] - b[1])
      .map(([num, total], i) => ({
        driver_number: parseInt(num),
        position: i + 1,
        total,
      }))
  }, [laps, currentLap])

  const pitsAtLap = useMemo(() =>
    pitStops.filter(p => p.lap_number <= currentLap), [pitStops, currentLap])

  if (loading) return <Spinner />
  if (!race) return <div className="text-white/40 text-center py-16">Race not found.</div>

  const hasOf1 = !!race.openf1_session_key

  const tabs = [
    { id: 'results', label: 'Results', icon: Flag },
    { id: 'qualifying', label: 'Qualifying', icon: Clock },
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
            <StatCard label="Laps" value={maxLap || results[0]?.laps || '—'} />
            <StatCard label="Drivers" value={results.length || '—'} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? 'bg-f1red text-white' : 'text-white/50 hover:text-white'
            }`}>
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

      {/* Qualifying Tab */}
      {activeTab === 'qualifying' && (
        <Card>
          {qualifying.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No qualifying data imported.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs border-b border-white/5">
                    <th className="text-left pb-3 w-10">Pos</th>
                    <th className="text-left pb-3">Driver</th>
                    <th className="text-left pb-3 hidden sm:table-cell">Team</th>
                    <th className="text-right pb-3">Q1</th>
                    <th className="text-right pb-3">Q2</th>
                    <th className="text-right pb-3">Q3</th>
                  </tr>
                </thead>
                <tbody>
                  {qualifying.map((q, i) => (
                    <tr key={q.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3">
                        <span className={`font-bold ${POSITION_COLORS[i] || 'text-white/60'}`}>
                          {q.position ?? '—'}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link to={`/driver/${q.driver_id}`} className="hover:text-f1red transition-colors font-medium">
                          {q.drivers?.name || '—'}
                        </Link>
                        {q.drivers?.code && <span className="text-xs text-white/30 ml-2">{q.drivers.code}</span>}
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <Link to={`/team/${q.team_id}`} className="text-white/50 hover:text-white transition-colors text-xs">
                          {q.teams?.name || '—'}
                        </Link>
                      </td>
                      <td className="py-3 text-right text-xs font-mono text-white/60">{q.q1 || '—'}</td>
                      <td className="py-3 text-right text-xs font-mono text-white/60">{q.q2 || '—'}</td>
                      <td className="py-3 text-right text-xs font-mono">
                        {q.q3 ? <span className="text-white font-semibold">{q.q3}</span> : '—'}
                      </td>
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
          {!hasOf1 ? (
            <Card><p className="text-white/30 text-sm text-center py-4">No OpenF1 session linked. Run "Sync Session Keys" in Admin.</p></Card>
          ) : of1Loading ? (
            <Card><div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm"><Spinner />Loading lap data...</div></Card>
          ) : of1Error ? (
            <Card><p className="text-f1red text-sm text-center py-4">{of1Error}</p></Card>
          ) : laps.length === 0 ? (
            <Card><p className="text-white/30 text-sm text-center py-4">No lap data available.</p></Card>
          ) : (
            <>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white/70">Lap Position Chart</h2>
                  <Badge color="red">Lap {currentLap} / {maxLap}</Badge>
                </div>
                <Suspense fallback={<Spinner />}>
                  <LapChart laps={laps} currentLap={currentLap} driverMap={of1Drivers} />
                </Suspense>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white/70">Replay Slider</h2>
                  <span className="text-xs text-white/40">Lap {currentLap}</span>
                </div>
                <input type="range" min={1} max={maxLap} value={currentLap}
                  onChange={e => setCurrentLap(Number(e.target.value))}
                  className="w-full accent-f1red" />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>Lap 1</span><span>Lap {maxLap}</span>
                </div>

                <div className="mt-4 space-y-1">
                  {replayPositions.map((item, i) => {
                    const d = of1Drivers[item.driver_number]
                    const hasPit = pitsAtLap.some(p => p.driver_number === item.driver_number && p.lap_number === currentLap)
                    return (
                      <div key={item.driver_number} className="flex items-center gap-3 py-1.5 border-b border-white/5">
                        <span className={`w-6 text-center text-xs font-bold ${POSITION_COLORS[i] || 'text-white/50'}`}>
                          {item.position}
                        </span>
                        {d?.team_colour && (
                          <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: `#${d.team_colour}` }} />
                        )}
                        <span className="text-sm flex-1">{d?.name_acronym || `#${item.driver_number}`}</span>
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
          {!hasOf1 ? (
            <p className="text-white/30 text-sm text-center py-4">No OpenF1 session linked. Run "Sync Session Keys" in Admin.</p>
          ) : of1Loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm"><Spinner />Loading...</div>
          ) : pitStops.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No pit stop data.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-16 top-0 bottom-0 w-px bg-white/10" />
              <div className="space-y-3">
                {[...pitStops].sort((a, b) => a.lap_number - b.lap_number).map((pit, i) => {
                  const d = of1Drivers[pit.driver_number]
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs text-white/40 w-14 text-right shrink-0">Lap {pit.lap_number}</span>
                      <div className="w-2 h-2 rounded-full bg-f1red shrink-0 relative z-10" />
                      <div className="glass px-3 py-2 flex-1 flex items-center gap-3">
                        {d?.team_colour && (
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: `#${d.team_colour}` }} />
                        )}
                        <span className="text-sm font-medium">{d?.name_acronym || `#${pit.driver_number}`}</span>
                        <span className="text-xs text-white/30 flex-1">{d?.full_name}</span>
                        {pit.pit_duration && (
                          <span className="text-xs font-mono text-white/60">{pit.pit_duration.toFixed(1)}s</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card>
          <h2 className="text-sm font-bold mb-4 text-white/70">Race Control</h2>
          {!hasOf1 ? (
            <p className="text-white/30 text-sm text-center py-4">No OpenF1 session linked. Run "Sync Session Keys" in Admin.</p>
          ) : of1Loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm"><Spinner />Loading...</div>
          ) : events.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No events recorded.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev, i) => {
                const color = FLAG_COLOR[ev.flag] || (ev.category === 'SafetyCar' ? 'yellow' : 'gray')
                const label = ev.flag || ev.category
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5">
                    <Badge color={color}>{label}</Badge>
                    <span className="text-sm flex-1 text-white/70">{ev.message}</span>
                    {ev.lap_number && <span className="text-xs text-white/30 shrink-0">Lap {ev.lap_number}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
