import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, Badge, StatCard } from '../components/ui'
import { Flag, AlertTriangle, Clock, PlayCircle } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

function Icon({ settingKey, emoji }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={url} alt="" className="inline-block w-4 h-4 object-contain" />
    : <span>{emoji}</span>
}
const POSITION_COLORS = ['pos-1', 'pos-2', 'pos-3']

const FLAG_COLOR = {
  YELLOW: 'yellow', 'DOUBLE YELLOW': 'yellow', RED: 'red',
  GREEN: 'green', CHEQUERED: 'gray', BLUE: 'blue',
}

async function openf1Fetch(path) {
  const res = await fetch(`/api/openf1${path}`)
  if (!res.ok) throw new Error(`OpenF1 ${res.status}`)
  return res.json()
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function RacePage() {
  const { id } = useParams()
  const { fetchRace, fetchRaceResults, fetchQualifying, fetchSprintResults, fetchHighlights } = useDataStore()

  const [race, setRace] = useState(null)
  const [results, setResults] = useState([])
  const [qualifying, setQualifying] = useState([])
  const [sprintResults, setSprintResults] = useState([])
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('results')

  // OpenF1 — only for pit stops + events (not replay)
  const [of1Drivers, setOf1Drivers] = useState({})
  const [pitStops, setPitStops] = useState([])
  const [events, setEvents] = useState([])
  const [of1Loading, setOf1Loading] = useState(false)
  const [of1Error, setOf1Error] = useState(null)

  useEffect(() => {
    Promise.all([fetchRace(id), fetchRaceResults(id), fetchQualifying(id), fetchSprintResults(id), fetchHighlights(id)])
      .then(([r, res, q, sp, hl]) => {
        setRace(r)
        setResults(res || [])
        setQualifying(q || [])
        setSprintResults(sp || [])
        setHighlights(hl || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Load OpenF1 pit stops + events only when those tabs are opened
  useEffect(() => {
    if (!race?.openf1_session_key) return
    if (activeTab !== 'pits' && activeTab !== 'events') return
    if (of1Loading || pitStops.length || events.length) return

    const sk = race.openf1_session_key
    setOf1Loading(true)
    setOf1Error(null)

    const load = async () => {
      const driversData = await openf1Fetch(`/drivers?session_key=${sk}`)
      await delay(300)
      const pitsData = await openf1Fetch(`/pit?session_key=${sk}`)
      await delay(300)
      const rcData = await openf1Fetch(`/race_control?session_key=${sk}`)
      const dMap = {}
      driversData.forEach(d => { dMap[d.driver_number] = d })
      setOf1Drivers(dMap)
      setPitStops(pitsData)
      setEvents(rcData.filter(e =>
        (e.category === 'Flag' && e.flag && !['GREEN', 'CLEAR'].includes(e.flag) && e.scope === 'Track') ||
        e.category === 'SafetyCar' ||
        (e.category === 'SessionStatus' && ['Started', 'Finished', 'Aborted'].includes(e.message))
      ))
    }
    load().catch(err => setOf1Error(err.message)).finally(() => setOf1Loading(false))
  }, [race?.openf1_session_key, activeTab])

  const totalLaps = results[0]?.laps || 0
  const hasOf1 = !!race?.openf1_session_key

  if (loading) return <Spinner />
  if (!race) return <div className="text-secondary text-center py-16">Race not found.</div>

  const tabs = [
    { id: 'results', label: 'Results', icon: Flag },
    { id: 'qualifying', label: 'Qualifying', icon: Clock },
    ...(sprintResults.length ? [{ id: 'sprint', label: 'Sprint', icon: Flag }] : []),
    { id: 'pits', label: 'Pit Stops', icon: Clock },
    { id: 'events', label: 'Events', icon: AlertTriangle },
    ...(highlights.length ? [{ id: 'highlights', label: 'Highlights', icon: PlayCircle }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{race.seasons?.year} · Round {race.round}</div>
            <h1 className="text-3xl font-black">{race.name}</h1>
            <div className="flex gap-4 mt-2 text-sm flex-wrap" style={{ color: 'var(--text-secondary)' }}>
              {race.circuits && (
                <Link to={`/circuit/${race.circuit_id}`} className="hover:text-f1red transition-colors flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  <Icon settingKey="icon_location" emoji="📍" /> {race.circuits.name}
                </Link>
              )}
              {race.date && (
                <span className="flex items-center gap-1"><Icon settingKey="icon_calendar" emoji="📅" /> {new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <StatCard label="Laps" value={totalLaps || '—'} />
            <StatCard label="Drivers" value={results.length || '—'} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}>
            <tab.icon size={12} className="inline mr-1" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {activeTab === 'results' && (
        <Card className="p-0 overflow-hidden">
          {results.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No results imported.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pl-3 w-7">#</th>
                  <th className="text-left py-2">Driver</th>
                  <th className="text-left py-2 hidden sm:table-cell">Team</th>
                  <th className="text-center py-2 hidden sm:table-cell">Grid</th>
                  <th className="text-right py-2">Time</th>
                  <th className="text-right py-2 pr-3">Pts</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pl-3">
                      <span className={`font-bold text-xs ${POSITION_COLORS[i] || 'text-secondary'}`}>{r.position ?? '—'}</span>
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        {r.teams?.logo_url
                          ? <img src={r.teams.logo_url} alt={r.teams.name} className="w-4 h-4 object-contain shrink-0 sm:hidden" />
                          : <div className="w-1 self-stretch rounded-full shrink-0 sm:hidden" style={{ backgroundColor: r.teams ? '#E10600' : 'transparent' }} />
                        }
                        <Link to={`/driver/${r.driver_id}`} className="hover:text-f1red transition-colors" style={{ fontSize: 12 }}>
                          <span className="hidden sm:inline">{r.drivers?.name || '—'}</span>
                          <span className="sm:hidden font-semibold">{r.drivers?.code || r.drivers?.name?.split(' ').pop() || '—'}</span>
                        </Link>
                      </div>
                    </td>
                    <td className="py-1.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        {r.teams?.logo_url && <img src={r.teams.logo_url} alt={r.teams.name} className="w-4 h-4 object-contain shrink-0" />}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.teams?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-center hidden sm:table-cell" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                    <td className="py-1.5 text-right" style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {r.time || r.status || '—'}
                    </td>
                    <td className="py-1.5 text-right pr-3 font-semibold" style={{ fontSize: 11 }}>{r.points ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Qualifying */}
      {activeTab === 'qualifying' && (
        <Card className="p-0 overflow-hidden">
          {qualifying.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No qualifying data imported.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pl-3 w-7">#</th>
                  <th className="text-left py-2">Driver</th>
                  <th className="text-left py-2 hidden sm:table-cell">Team</th>
                  <th className="text-right py-2">Q1</th>
                  <th className="text-right py-2">Q2</th>
                  <th className="text-right py-2 pr-3">Q3</th>
                </tr>
              </thead>
              <tbody>
                {qualifying.map((q, i) => (
                  <tr key={q.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pl-3">
                      <span className={`font-bold text-xs ${POSITION_COLORS[i] || 'text-secondary'}`}>{q.position ?? '—'}</span>
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        {q.teams?.logo_url
                          ? <img src={q.teams.logo_url} alt={q.teams.name} className="w-4 h-4 object-contain shrink-0 sm:hidden" />
                          : <div className="w-1 self-stretch rounded-full shrink-0 sm:hidden" style={{ backgroundColor: q.teams ? '#E10600' : 'transparent' }} />
                        }
                        <Link to={`/driver/${q.driver_id}`} className="hover:text-f1red transition-colors" style={{ fontSize: 12 }}>
                          <span className="hidden sm:inline">{q.drivers?.name || '—'}</span>
                          <span className="sm:hidden font-semibold">{q.drivers?.code || q.drivers?.name?.split(' ').pop() || '—'}</span>
                        </Link>
                      </div>
                    </td>
                    <td className="py-1.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        {q.teams?.logo_url && <img src={q.teams.logo_url} alt={q.teams.name} className="w-4 h-4 object-contain shrink-0" />}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.teams?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.q1 || '—'}</td>
                    <td className="py-1.5 text-right font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.q2 || '—'}</td>
                    <td className="py-1.5 text-right font-mono pr-3" style={{ fontSize: 11 }}>
                      {q.q3 ? <span className="font-semibold">{q.q3}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Sprint */}
      {activeTab === 'sprint' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left py-2 pl-3 w-7">#</th>
                <th className="text-left py-2">Driver</th>
                <th className="text-left py-2 hidden sm:table-cell">Team</th>
                <th className="text-center py-2 hidden sm:table-cell">Grid</th>
                <th className="text-right py-2">Time</th>
                <th className="text-right py-2 pr-3">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sprintResults.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1.5 pl-3">
                    <span className={`font-bold text-xs ${POSITION_COLORS[i] || 'text-secondary'}`}>{r.position ?? '—'}</span>
                  </td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      {r.teams?.logo_url
                        ? <img src={r.teams.logo_url} alt={r.teams.name} className="w-4 h-4 object-contain shrink-0 sm:hidden" />
                        : <div className="w-1 self-stretch rounded-full shrink-0 sm:hidden" style={{ backgroundColor: r.teams ? '#E10600' : 'transparent' }} />
                      }
                      <Link to={`/driver/${r.driver_id}`} className="hover:text-f1red transition-colors" style={{ fontSize: 12 }}>
                        <span className="hidden sm:inline">{r.drivers?.name || '—'}</span>
                        <span className="sm:hidden font-semibold">{r.drivers?.code || r.drivers?.name?.split(' ').pop() || '—'}</span>
                      </Link>
                    </div>
                  </td>
                  <td className="py-1.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      {r.teams?.logo_url && <img src={r.teams.logo_url} alt={r.teams.name} className="w-4 h-4 object-contain shrink-0" />}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.teams?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-center hidden sm:table-cell" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                  <td className="py-1.5 text-right" style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.time || r.status || '—'}
                  </td>
                  <td className="py-1.5 text-right pr-3 font-semibold" style={{ fontSize: 11 }}>{r.points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pit Stops — OpenF1 */}
      {activeTab === 'pits' && (
        <Card>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Pit Stop Timeline</h2>
          {!hasOf1 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No OpenF1 session linked. Run "Sync Session Keys" in Admin.</p>
          ) : of1Loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: 'var(--text-muted)' }}><Spinner />Loading...</div>
          ) : of1Error ? (
            <p className="text-f1red text-sm text-center py-4">{of1Error}</p>
          ) : pitStops.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No pit stop data.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-16 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {[...pitStops].sort((a, b) => a.lap_number - b.lap_number).map((pit, i) => {
                  const d = of1Drivers[pit.driver_number]
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>Lap {pit.lap_number}</span>
                      <div className="w-2 h-2 rounded-full bg-f1red shrink-0 relative z-10" />
                      <div className="glass px-3 py-2 flex-1 flex items-center gap-3">
                        {d?.team_colour && <div className="w-1 h-4 rounded-full" style={{ backgroundColor: `#${d.team_colour}` }} />}
                        <span className="text-sm font-medium">{d?.name_acronym || `#${pit.driver_number}`}</span>
                        <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>{d?.full_name}</span>
                        {pit.pit_duration && <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{pit.pit_duration.toFixed(1)}s</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Events — OpenF1 */}
      {activeTab === 'events' && (
        <Card>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Race Control</h2>
          {!hasOf1 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No OpenF1 session linked. Run "Sync Session Keys" in Admin.</p>
          ) : of1Loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: 'var(--text-muted)' }}><Spinner />Loading...</div>
          ) : of1Error ? (
            <p className="text-f1red text-sm text-center py-4">{of1Error}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No events recorded.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev, i) => {
                const color = FLAG_COLOR[ev.flag] || (ev.category === 'SafetyCar' ? 'yellow' : 'gray')
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <Badge color={color}>{ev.flag || ev.category}</Badge>
                    <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{ev.message}</span>
                    {ev.lap_number && <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>Lap {ev.lap_number}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Highlights */}
      {activeTab === 'highlights' && (
        <div className="space-y-4">
          {highlights.map(h => {
            const vid = h.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1]
            if (!vid) return null
            return (
              <Card key={h.id} className="p-0 overflow-hidden">
                {h.title && (
                  <div className="px-4 pt-3 pb-2 text-sm font-semibold flex items-center gap-2">
                    <PlayCircle size={14} className="text-f1red" />{h.title}
                  </div>
                )}
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe src={`https://www.youtube.com/embed/${vid}`} title={h.title || 'Highlight'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen className="absolute inset-0 w-full h-full" />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
