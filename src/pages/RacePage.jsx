import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { resolveImageSrc } from '../lib/resolveImageSrc'
import { supabase } from '../lib/supabase'
import { Spinner, Card, Badge, StatCard } from '../components/ui'
import { Flag, AlertTriangle, Clock, PlayCircle, ArrowUp, ArrowDown } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

function Icon({ settingKey, emoji }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={resolveImageSrc(url) || url} alt="" className="inline-block w-4 h-4 object-contain" />
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

function formatSessionDateTime(date, time) {
  if (!date) return '—'
  if (!time) return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const d = new Date(`${date}T${time}`)
  if (Number.isNaN(d.getTime())) return `${date} ${time}`
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RacePage() {
  const { id } = useParams()
  const { fetchRace, fetchRaceResults, fetchPracticeResults, fetchQualifying, fetchSprintResults, fetchHighlights } = useDataStore()
  const isAdmin = useAuthStore(s => s.isAdmin)

  const [race, setRace] = useState(null)
  const [results, setResults] = useState([])
  const [practiceResults, setPracticeResults] = useState([])
  const [qualifying, setQualifying] = useState([])
  const [sprintResults, setSprintResults] = useState([])
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('results')
  const [previousEdition, setPreviousEdition] = useState(null)

  // OpenF1 — only for pit stops + events (not replay)
  const [of1Drivers, setOf1Drivers] = useState({})
  const [pitStops, setPitStops] = useState([])
  const [events, setEvents] = useState([])
  const [of1Loading, setOf1Loading] = useState(false)
  const [of1Error, setOf1Error] = useState(null)

  useEffect(() => {
    Promise.all([fetchRace(id), fetchRaceResults(id), fetchPracticeResults(id), fetchQualifying(id), fetchSprintResults(id), fetchHighlights(id)])
      .then(([r, res, pr, q, sp, hl]) => {
        setRace(r)
        setResults(res || [])
        setPracticeResults(pr || [])
        setQualifying(q || [])
        setSprintResults(sp || [])
        setHighlights(hl || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!race?.date) { setPreviousEdition(null); return }
    let cancelled = false

    const load = async () => {
      setPreviousEdition(null)
      const baseSelect = 'id, name, date, round, season_id, seasons(year)'

      const byName = await supabase
        .from('races')
        .select(baseSelect)
        .eq('name', race.name)
        .lt('date', race.date)
        .order('date', { ascending: false })
        .limit(1)
      if (byName.error) throw byName.error

      let prevRace = byName.data?.[0] || null
      if (!prevRace && race.circuit_id) {
        const byCircuit = await supabase
          .from('races')
          .select(baseSelect)
          .eq('circuit_id', race.circuit_id)
          .lt('date', race.date)
          .order('date', { ascending: false })
          .limit(1)
        if (byCircuit.error) throw byCircuit.error
        prevRace = byCircuit.data?.[0] || null
      }

      if (!prevRace) {
        if (!cancelled) setPreviousEdition(null)
        return
      }

      const [winnerRes, poleRes] = await Promise.all([
        supabase
          .from('results')
          .select('race_id, driver_id, team_id, drivers(id, name, code, image_url), teams(id, name, logo_url)')
          .eq('race_id', prevRace.id)
          .eq('position', 1)
          .maybeSingle(),
        supabase
          .from('qualifying_results')
          .select('race_id, driver_id, team_id, drivers(id, name, code, image_url), teams(id, name, logo_url)')
          .eq('race_id', prevRace.id)
          .eq('position', 1)
          .maybeSingle(),
      ])

      if (winnerRes.error) throw winnerRes.error
      if (poleRes.error) throw poleRes.error

      if (!cancelled) {
        setPreviousEdition({
          race: prevRace,
          winner: winnerRes.data || null,
          pole: poleRes.data || null,
        })
      }
    }

    load().catch(console.error)
    return () => { cancelled = true }
  }, [race?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const shortName = (d) => {
    if (!d) return '—'
    if (d.code) return d.code
    const name = d.name || ''
    const parts = name.trim().split(' ').filter(Boolean)
    return parts.length ? parts[parts.length - 1] : '—'
  }

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

  const hlBySession = highlights.reduce((acc, h) => {
    const s = h.session || 'race'
    if (!acc[s]) acc[s] = []
    acc[s].push(h)
    return acc
  }, {})

  const WatchBtn = ({ session }) => {
    const items = hlBySession[session] || []
    if (!items.length) return null
    return (
      <div className="flex gap-2 flex-wrap mb-3">
        {items.map(h => {
          const vid = h.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1]
          if (!vid) return null
          return (
            <a key={h.id} href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'rgba(229,57,53,0.12)', color: '#E10600', border: '1px solid rgba(229,57,53,0.25)' }}>
              <PlayCircle size={13} /> {h.title || 'Watch Highlights'}
            </a>
          )
        })}
      </div>
    )
  }

  if (loading) return <Spinner />
  if (!race) return <div className="text-secondary text-center py-16">Race not found.</div>

  const tabs = [
    { id: 'results', label: 'Results', icon: Flag },
    { id: 'practice', label: 'Practice', icon: Clock },
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
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
          <div className="w-full md:w-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:justify-items-end">
            <StatCard label="Laps" value={totalLaps || '—'} />
            <StatCard label="Drivers" value={results.length || '—'} />
            {previousEdition?.winner ? (
              <Link to={`/driver/${previousEdition.winner.driver_id}`} className="block">
                <StatCard
                  label="Prev Winner"
                  value={(
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {previousEdition.winner.drivers?.image_url
                          ? <img src={previousEdition.winner.drivers.image_url} alt={previousEdition.winner.drivers?.name || 'Driver'} className="w-full h-full object-cover object-top" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{previousEdition.winner.drivers?.code || '?'}</div>
                        }
                      </div>
                      <div className="w-9 h-8 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        {previousEdition.winner.teams?.logo_url
                          ? <img src={previousEdition.winner.teams.logo_url} alt={previousEdition.winner.teams?.name || 'Team'} className="w-7 h-7 object-contain" loading="lazy" />
                          : <div className="w-full h-full" />
                        }
                      </div>
                    </div>
                  )}
                  sub={`${previousEdition.race?.seasons?.year || '--'} | ${previousEdition.winner.drivers?.name || '--'}`}
                />
              </Link>
            ) : (
              <StatCard label="Prev Winner" value="—" sub={previousEdition?.race?.seasons?.year || '—'} />
            )}

            {previousEdition?.pole ? (
              <Link to={`/driver/${previousEdition.pole.driver_id}`} className="block">
                <StatCard
                  label="Prev Pole"
                  value={(
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {previousEdition.pole.drivers?.image_url
                          ? <img src={previousEdition.pole.drivers.image_url} alt={previousEdition.pole.drivers?.name || 'Driver'} className="w-full h-full object-cover object-top" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{previousEdition.pole.drivers?.code || '?'}</div>
                        }
                      </div>
                      <div className="w-9 h-8 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        {previousEdition.pole.teams?.logo_url
                          ? <img src={previousEdition.pole.teams.logo_url} alt={previousEdition.pole.teams?.name || 'Team'} className="w-7 h-7 object-contain" loading="lazy" />
                          : <div className="w-full h-full" />
                        }
                      </div>
                    </div>
                  )}
                  sub={`${previousEdition.race?.seasons?.year || '--'} | ${previousEdition.pole.drivers?.name || '--'}`}
                />
              </Link>
            ) : (
              <StatCard label="Prev Pole" value="—" sub={previousEdition?.race?.seasons?.year || '—'} />
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Circuit */}
      {race.circuits && (
        <Card className="p-0 overflow-hidden">
          <Link to={`/circuit/${race.circuit_id}`} className="block">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-80 h-44 bg-muted shrink-0 overflow-hidden">
                {race.circuits.layout_image || race.circuits.hero_image_url ? (
                  <img
                    src={resolveImageSrc(race.circuits.layout_image || race.circuits.hero_image_url) || (race.circuits.layout_image || race.circuits.hero_image_url)}
                    alt={race.circuits.name}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Circuit image not available
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Circuit</div>
                <div className="text-lg font-black mt-1 truncate">{race.circuits.name}</div>
                {(race.circuits.location || race.circuits.country) && (
                  <div className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {race.circuits.location || 'â€”'}{race.circuits.country ? `, ${race.circuits.country}` : ''}
                  </div>
                )}
                {(race.circuits.track_length_km || race.circuits.turns || race.circuits.first_gp) && (
                  <div className="flex gap-2 mt-3 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                    {race.circuits.track_length_km && <span className="px-2 py-1 rounded-full" style={{ background: 'var(--bg-raised)' }}>{race.circuits.track_length_km} km</span>}
                    {race.circuits.turns && <span className="px-2 py-1 rounded-full" style={{ background: 'var(--bg-raised)' }}>{race.circuits.turns} turns</span>}
                    {race.circuits.first_gp && <span className="px-2 py-1 rounded-full" style={{ background: 'var(--bg-raised)' }}>First GP {race.circuits.first_gp}</span>}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </Card>
      )}

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
        <div className="space-y-3">
          <WatchBtn session="race" />
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
                      {(() => {
                        const grid = Number(r.grid)
                        const pos = Number(r.position)
                        const delta = (Number.isFinite(grid) && Number.isFinite(pos)) ? (grid - pos) : 0
                        return (
                          <div className="flex items-center gap-1">
                            <span className={`font-bold text-xs ${POSITION_COLORS[i] || 'text-secondary'}`}>{r.position ?? '—'}</span>
                            {delta > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-400">
                                <ArrowUp size={10} /> {delta}
                              </span>
                            )}
                            {delta < 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400">
                                <ArrowDown size={10} /> {Math.abs(delta)}
                              </span>
                            )}
                          </div>
                        )
                      })()}
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
        </div>
      )}

      {/* Qualifying */}
      {activeTab === 'qualifying' && (
        <div className="space-y-3">
          <WatchBtn session="qualifying" />
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
        </div>
      )}

      {/* Practice */}
      {activeTab === 'practice' && (
        <div className="space-y-4">
          <WatchBtn session="fp1" />
          <WatchBtn session="fp2" />
          <WatchBtn session="fp3" />
          {practiceResults.length === 0 ? (
            <>
            <Card className="p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left py-2 pl-3">Session</th>
                    <th className="text-right py-2 pr-3">Start</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'FP1', date: race.fp1_date, time: race.fp1_time },
                    { key: 'FP2', date: race.fp2_date, time: race.fp2_time },
                    { key: 'FP3', date: race.fp3_date, time: race.fp3_time },
                  ].map(s => (
                    <tr key={s.key} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2 pl-3 font-semibold">{s.key}</td>
                      <td className="py-2 pr-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {formatSessionDateTime(s.date, s.time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!race.fp1_date && !race.fp2_date && !race.fp3_date && (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  Practice schedule not available. Run "Sync Races" in Admin.
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>No FP classifications entered.</p>
              {isAdmin() && (
                <div className="flex justify-center mt-3">
                  <Link to={`/admin/practice?raceId=${race.id}&session=FP1`} className="btn-primary text-xs">Edit FP Classifications</Link>
                </div>
              )}
            </Card>
            </>
          ) : (
            ['FP1', 'FP2', 'FP3'].map(sess => {
              const rows = practiceResults.filter(r => r.session === sess)
              if (!rows.length) return null
              return (
                <Card key={sess} className="p-0 overflow-hidden">
                  <div className="px-4 py-2 text-xs font-bold border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {sess}
                    {isAdmin() && (
                      <Link to={`/admin/practice?raceId=${race.id}&session=${sess}`} className="ml-3 text-f1red hover:opacity-80">
                        Edit
                      </Link>
                    )}
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <th className="text-left py-2 pl-3 w-7">#</th>
                        <th className="text-left py-2">Driver</th>
                        <th className="text-left py-2 hidden sm:table-cell">Team</th>
                        <th className="text-right py-2">Time</th>
                        <th className="text-right py-2">Gap</th>
                        <th className="text-right py-2 pr-3">Laps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p, i) => (
                        <tr key={p.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-1.5 pl-3">
                            <span className={`font-bold text-xs ${POSITION_COLORS[i] || 'text-secondary'}`}>{p.position ?? '—'}</span>
                          </td>
                          <td className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              {p.teams?.logo_url
                                ? <img src={p.teams.logo_url} alt={p.teams.name} className="w-4 h-4 object-contain shrink-0 sm:hidden" />
                                : <div className="w-1 self-stretch rounded-full shrink-0 sm:hidden" style={{ backgroundColor: p.teams ? '#E10600' : 'transparent' }} />
                              }
                              <Link to={`/driver/${p.driver_id}`} className="hover:text-f1red transition-colors" style={{ fontSize: 12 }}>
                                <span className="hidden sm:inline">{p.drivers?.name || '—'}</span>
                                <span className="sm:hidden font-semibold">{p.drivers?.code || p.drivers?.name?.split(' ').pop() || '—'}</span>
                              </Link>
                            </div>
                          </td>
                          <td className="py-1.5 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              {p.teams?.logo_url && <img src={p.teams.logo_url} alt={p.teams.name} className="w-4 h-4 object-contain shrink-0" />}
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.teams?.name || '—'}</span>
                            </div>
                          </td>
                          <td className="py-1.5 text-right font-mono" style={{ fontSize: 11 }}>{p.time || '—'}</td>
                          <td className="py-1.5 text-right font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.position === 1 ? '—' : (p.gap || '—')}</td>
                          <td className="py-1.5 text-right pr-3 font-semibold" style={{ fontSize: 11 }}>{p.laps ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Sprint */}
      {activeTab === 'sprint' && (
        <Card className="p-0 overflow-hidden">
          <WatchBtn session="race" />
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
                    {(() => {
                      const grid = Number(r.grid)
                      const pos = Number(r.position)
                      const delta = (Number.isFinite(grid) && Number.isFinite(pos)) ? (grid - pos) : 0
                      return (
                        <div className="flex items-center gap-1">
                          <span className={`font-bold text-xs ${POSITION_COLORS[i] || 'text-secondary'}`}>{r.position ?? '—'}</span>
                          {delta > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-400">
                              <ArrowUp size={10} /> {delta}
                            </span>
                          )}
                          {delta < 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400">
                              <ArrowDown size={10} /> {Math.abs(delta)}
                            </span>
                          )}
                        </div>
                      )
                    })()}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {highlights.map(h => {
            const vid = h.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1]
            if (!vid) return null
            return (
              <a key={h.id} href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer"
                className="apple-card overflow-hidden hover:border-accent/40 transition-colors block">
                <div className="relative">
                  <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={h.title || 'Highlight'}
                    className="w-full object-cover" style={{ aspectRatio: '16/9' }} />
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
                {h.title && (
                  <div className="px-4 py-3 text-sm font-semibold">{h.title}</div>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
