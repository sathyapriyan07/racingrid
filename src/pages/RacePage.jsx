import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { resolveImageSrc } from '../lib/resolveImageSrc'
import { Spinner, Card, Badge, StatCard } from '../components/ui'
import { Flag, AlertTriangle, Clock, PlayCircle } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

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

function canonicalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\b(f1|team|racing|scuderia|formula|one)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fmtLap(seconds) {
  if (!seconds || seconds <= 0) return null
  const totalMs = Math.round(seconds * 1000)
  const ms = totalMs % 1000
  const totalSeconds = Math.floor(totalMs / 1000)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60)
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export default function RacePage() {
  const { id } = useParams()
  const { fetchRace, fetchRaceResults, fetchQualifying, fetchSprintResults, fetchPracticeResults, fetchHighlights } = useDataStore()
  const isAdmin = useAuthStore(s => s.isAdmin)

  const [race, setRace] = useState(null)
  const [results, setResults] = useState([])
  const [practice, setPractice] = useState([])
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
    Promise.all([fetchRace(id), fetchRaceResults(id), fetchPracticeResults(id), fetchQualifying(id), fetchSprintResults(id), fetchHighlights(id)])
      .then(([r, res, pr, q, sp, hl]) => {
        setRace(r)
        setResults(res || [])
        setPractice(pr || [])
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
    { id: 'practice', label: 'Practice', icon: Clock },
    { id: 'qualifying', label: 'Qualifying', icon: Clock },
    ...(sprintResults.length ? [{ id: 'sprint', label: 'Sprint', icon: Flag }] : []),
    { id: 'pits', label: 'Pit Stops', icon: Clock },
    { id: 'events', label: 'Events', icon: AlertTriangle },
    ...(highlights.length ? [{ id: 'highlights', label: 'Highlights', icon: PlayCircle }] : []),
  ]

  const syncPractice = async () => {
    try {
      if (!race?.date) throw new Error('Race has no date')
      if (!race?.seasons?.year) throw new Error('Season year missing')
      toast.loading('Syncing practice (OpenF1)...', { id: 'sync-practice' })

      const yr = race.seasons.year
      const raceDate = new Date(race.date).getTime()
      const sessions = await openf1Fetch(`/sessions?year=${yr}`)
      const wanted = [
        { openf1: 'Practice 1', session: 'FP1' },
        { openf1: 'Practice 2', session: 'FP2' },
        { openf1: 'Practice 3', session: 'FP3' },
      ]

      const { data: dbDrivers } = await supabase.from('drivers').select('id, name, code')
      const { data: dbTeams } = await supabase.from('teams').select('id, name, ergast_id')
      const driverMap = {}
      dbDrivers?.forEach(d => { if (d.code) driverMap[d.code] = d.id; driverMap[d.name] = d.id })
      const teamMap = {}
      dbTeams?.forEach(t => {
        teamMap[canonicalizeName(t.name)] = t.id
        if (t.ergast_id) teamMap[canonicalizeName(t.ergast_id)] = t.id
      })

      const pickSessionKey = (openf1Name) => {
        const candidates = (Array.isArray(sessions) ? sessions : [])
          .filter(s => s?.session_name === openf1Name && s?.date_start)
          .map(s => ({ session_key: s.session_key, ms: new Date(s.date_start).getTime() }))
          .filter(s => s.session_key && !Number.isNaN(s.ms))
          .filter(s => (raceDate - s.ms) >= -86400000 && (raceDate - s.ms) <= 86400000 * 7)
          .sort((a, b) => Math.abs(raceDate - a.ms) - Math.abs(raceDate - b.ms))
        return candidates[0]?.session_key ?? null
      }

      let upserted = 0
      for (const w of wanted) {
        const sk = pickSessionKey(w.openf1)
        if (!sk) continue

        const [of1Drivers, laps] = await Promise.all([
          openf1Fetch(`/drivers?session_key=${sk}`),
          openf1Fetch(`/laps?session_key=${sk}`),
        ])

        const byNumber = {}
        of1Drivers.forEach(d => {
          const num = String(d.driver_number ?? '')
          if (!num) return
          byNumber[num] = {
            code: d.name_acronym || null,
            fullName: d.full_name || d.name || null,
            teamName: d.team_name || null,
          }
        })

        const best = {}
        const lapCount = {}
        laps.forEach(l => {
          const num = String(l.driver_number ?? '')
          const dur = typeof l.lap_duration === 'number' ? l.lap_duration : null
          if (!num || !dur || dur <= 0) return
          if (l.is_pit_out_lap || l.is_pit_in_lap) return
          lapCount[num] = (lapCount[num] || 0) + 1
          if (best[num] === undefined || dur < best[num]) best[num] = dur
        })

        const rows = Object.entries(byNumber).map(([num, d]) => {
          const driverId = driverMap[d.code] || (d.fullName ? driverMap[d.fullName] : null) || null
          const teamId = d.teamName ? (teamMap[canonicalizeName(d.teamName)] || null) : null
          return {
            race_id: race.id,
            session: w.session,
            driver_id: driverId,
            team_id: teamId,
            _best: best[num] ?? null,
            time: best[num] ? fmtLap(best[num]) : null,
            laps: lapCount[num] || 0,
          }
        }).filter(r => r.driver_id)

        rows.sort((a, b) => {
          if (a._best === null && b._best === null) return 0
          if (a._best === null) return 1
          if (b._best === null) return -1
          return a._best - b._best
        })

        const leader = rows.find(r => r._best !== null)?._best ?? null
        const upsertRows = rows.map((r, i) => ({
          race_id: r.race_id,
          session: r.session,
          driver_id: r.driver_id,
          team_id: r.team_id,
          position: r._best !== null ? i + 1 : null,
          time: r.time,
          gap: leader !== null && r._best !== null && r._best > leader ? `+${(r._best - leader).toFixed(3)}` : null,
          laps: r.laps,
        }))

        const { error } = await supabase.from('practice_results').upsert(upsertRows, { onConflict: 'race_id,session,driver_id' })
        if (error) throw error
        upserted += upsertRows.length
      }

      const pr = await fetchPracticeResults(race.id)
      setPractice(pr || [])
      toast.success(`Practice synced: ${upserted} upserted`, { id: 'sync-practice' })
    } catch (err) {
      toast.error(err.message || 'Practice sync failed', { id: 'sync-practice' })
    }
  }

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

      {/* Practice */}
      {activeTab === 'practice' && (
        <div className="space-y-4">
          {practice.length === 0 ? (
            <Card className="p-4">
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>No practice data imported.</p>
              {isAdmin() && (
                <div className="flex justify-center mt-3">
                  <button onClick={syncPractice} className="btn-primary text-xs">Sync Practice (OpenF1)</button>
                </div>
              )}
            </Card>
          ) : (
            ['FP1', 'FP2', 'FP3'].map(sess => {
              const rows = practice.filter(r => r.session === sess)
              if (!rows.length) return null
              return (
                <Card key={sess} className="p-0 overflow-hidden">
                  <div className="px-4 py-2 text-xs font-bold border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{sess}</div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <th className="text-left py-2 pl-3 w-7">#</th>
                        <th className="text-left py-2">Driver</th>
                        <th className="text-left py-2 hidden sm:table-cell">Team</th>
                        <th className="text-right py-2">Time</th>
                        <th className="text-right py-2 hidden sm:table-cell">Gap</th>
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
                          <td className="py-1.5 text-right font-mono hidden sm:table-cell" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.gap || (p.position === 1 ? '—' : '—')}</td>
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
