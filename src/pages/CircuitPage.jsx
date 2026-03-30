import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, Card } from '../components/ui'
import { MapPin, Trophy } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

function Icon({ settingKey, LucideIcon, size = 14 }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={url} alt="" className="inline-block w-4 h-4 object-contain" />
    : <LucideIcon size={size} />
}

export default function CircuitPage() {
  const { id } = useParams()
  const { fetchCircuit } = useDataStore()
  const [circuit, setCircuit] = useState(null)
  const [races, setRaces] = useState([])
  const [winnerRows, setWinnerRows] = useState([])
  const [poleRows, setPoleRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

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

        if (!racesData?.length) { setRaces([]); setWinnerRows([]); setPoleRows([]); return }

        const raceIds = racesData.map(r => r.id)
        const [{ data: winners }, { data: sprintWinners }, { data: poles }] = await Promise.all([
          supabase.from('results').select('race_id, driver_id, team_id, drivers(id, name, code, image_url), teams(id, name, logo_url)').in('race_id', raceIds).eq('position', 1),
          supabase.from('sprint_results').select('race_id, drivers(id, name, code, image_url)').in('race_id', raceIds).eq('position', 1),
          supabase.from('qualifying_results').select('race_id, driver_id, drivers(id, name, code, image_url)').in('race_id', raceIds).eq('position', 1),
        ])

        let polesFinal = poles || []
        if (!polesFinal.length) {
          const { data: polesFallback } = await supabase
            .from('results')
            .select('race_id, driver_id, drivers(id, name, code, image_url)')
            .in('race_id', raceIds)
            .eq('grid', 1)
          polesFinal = polesFallback || []
        }

        const winnerMap = {}
        winners?.forEach(w => { winnerMap[w.race_id] = w.drivers })
        const sprintMap = {}
        sprintWinners?.forEach(w => { sprintMap[w.race_id] = w.drivers })

        setWinnerRows(winners || [])
        setPoleRows(polesFinal)

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

  const records = useMemo(() => {
    const winsByDriver = new Map()
    const winsByTeam = new Map()
    const driverInfo = new Map()
    const teamInfo = new Map()

    for (const row of (winnerRows || [])) {
      if (row?.driver_id && row?.drivers) {
        winsByDriver.set(row.driver_id, (winsByDriver.get(row.driver_id) || 0) + 1)
        driverInfo.set(row.driver_id, row.drivers)
      }
      if (row?.team_id && row?.teams) {
        winsByTeam.set(row.team_id, (winsByTeam.get(row.team_id) || 0) + 1)
        teamInfo.set(row.team_id, row.teams)
      }
    }

    const polesByDriver = new Map()
    for (const row of (poleRows || [])) {
      if (!row?.driver_id || !row?.drivers) continue
      polesByDriver.set(row.driver_id, (polesByDriver.get(row.driver_id) || 0) + 1)
      driverInfo.set(row.driver_id, row.drivers)
    }

    const topWinsDrivers = [...winsByDriver.entries()]
      .map(([driverId, count]) => ({ driverId, count, driver: driverInfo.get(driverId) }))
      .filter(x => x.driver)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const topWinsTeams = [...winsByTeam.entries()]
      .map(([teamId, count]) => ({ teamId, count, team: teamInfo.get(teamId) }))
      .filter(x => x.team)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const topPolesDrivers = [...polesByDriver.entries()]
      .map(([driverId, count]) => ({ driverId, count, driver: driverInfo.get(driverId) }))
      .filter(x => x.driver)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const winnerByRaceId = new Map((winnerRows || []).map(r => [r.race_id, r]))
    const orderedRaces = [...(races || [])].sort((a, b) => {
      const da = a?.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY
      const db = b?.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY
      if (da !== db) return da - db
      const ya = a?.seasons?.year ?? 0
      const yb = b?.seasons?.year ?? 0
      if (ya !== yb) return ya - yb
      return (a?.round ?? 0) - (b?.round ?? 0)
    })

    const bestStreakByDriver = new Map()
    let current = null

    const commit = () => {
      if (!current) return
      const prev = bestStreakByDriver.get(current.driverId)
      if (!prev || current.length > prev.length) bestStreakByDriver.set(current.driverId, current)
    }

    for (const race of orderedRaces) {
      const winRow = winnerByRaceId.get(race.id)
      const driverId = winRow?.driver_id
      if (!driverId) continue

      const year = race?.seasons?.year ?? null
      if (!current || current.driverId !== driverId) {
        commit()
        current = { driverId, length: 1, startYear: year, endYear: year }
      } else {
        current.length += 1
        current.endYear = year
      }
    }
    commit()

    const topConsecutiveWinsDrivers = [...bestStreakByDriver.entries()]
      .map(([driverId, streak]) => ({ driverId, ...streak, driver: driverInfo.get(driverId) }))
      .filter(x => x.driver)
      .sort((a, b) => b.length - a.length)
      .slice(0, 8)

    return { topWinsDrivers, topWinsTeams, topPolesDrivers, topConsecutiveWinsDrivers }
  }, [poleRows, races, winnerRows])

  if (loading) return <Spinner />
  if (!circuit) return <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Circuit not found.</div>

  return (
    <div className="space-y-6">
      {/* ── Cinematic Banner ── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 280 }}>
        {circuit.hero_image_url
          ? <img src={circuit.hero_image_url} alt={circuit.name} className="absolute inset-0 w-full h-full object-cover object-center" />
          : <div className="absolute inset-0 bg-surface" />
        }
        {circuit.hero_image_url
          ? <div className="absolute inset-0 bg-gradient-to-t from-base/90 to-transparent" />
          : <div className="absolute inset-0 bg-radial-glow from-accent/10 via-transparent to-transparent" />
        }

        {/* Layout image overlay — bottom right */}
        {circuit.layout_image && (
          <div className="absolute right-6 bottom-6 w-36 h-24 pointer-events-none hidden sm:block">
            <img src={circuit.layout_image} alt={circuit.name}
              className="w-full h-full object-contain opacity-40"
              style={{ filter: 'invert(1) brightness(2)' }}
            />
          </div>
        )}
      </div>

      {/* ── Circuit Info (below hero) ── */}
      <div className="apple-card p-6">
        <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ letterSpacing: '-0.04em' }}>{circuit.name}</h1>
        <div className="flex gap-4 text-sm flex-wrap items-center" style={{ color: 'var(--text-secondary)' }}>
          {circuit.location && (
            <span className="flex items-center gap-1.5 font-medium">
              <Icon settingKey="icon_location" LucideIcon={MapPin} /> {circuit.location}
            </span>
          )}
          {circuit.country && (
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin size={14} /> {circuit.country}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'records', label: 'Records' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Circuit Layout */}
          {circuit.layout_image && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Circuit Layout</p>
              <img src={circuit.layout_image} alt={circuit.name} className="max-h-72 mx-auto object-contain" />
            </Card>
          )}

          {/* Races table */}
          <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Races Hosted ({races.length})</span>
        </div>
        {races.length === 0 ? (
          <p className="text-sm px-5 py-6" style={{ color: 'var(--text-muted)' }}>No races recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left py-2 pl-5">Race</th>
                <th className="text-left py-2 hidden sm:table-cell">Winner</th>
                <th className="text-left py-2 hidden md:table-cell">Sprint Winner</th>
                <th className="text-right py-2 pr-5">Season</th>
              </tr>
            </thead>
            <tbody>
              {races.map(race => (
                <tr key={race.id} className="border-b transition-colors" style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td className="py-2.5 pl-5">
                    <Link to={`/race/${race.id}`} className="hover:text-f1red transition-colors font-medium" style={{ fontSize: 13 }}>
                      {race.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 sm:hidden">
                      {race.winner && (
                        <Link to={`/driver/${race.winner.id}`} className="hover:text-f1red transition-colors">
                          <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            <Trophy size={10} /> {race.winner.name}
                          </span>
                        </Link>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 hidden sm:table-cell">
                    {race.winner
                      ? <Link to={`/driver/${race.winner.id}`} className="hover:text-f1red transition-colors" style={{ fontSize: 12 }}>{race.winner.name}</Link>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td className="py-2.5 hidden md:table-cell">
                    {race.sprintWinner
                      ? <Link to={`/driver/${race.sprintWinner.id}`} className="hover:text-f1red transition-colors" style={{ fontSize: 12 }}>{race.sprintWinner.name}</Link>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td className="py-2.5 pr-5 text-right" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {race.seasons?.year} · R{race.round}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
          </Card>
        </>
      )}

      {tab === 'records' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Most Wins — Drivers</p>
              {records.topWinsDrivers.length ? (
                <div className="space-y-2">
                  {records.topWinsDrivers.map((row, i) => (
                    <div key={row.driverId} className="flex items-center gap-3">
                      <span className="text-xs font-black w-6 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      {row.driver.image_url
                        ? <img src={row.driver.image_url} alt={row.driver.name} className="w-7 h-7 rounded-full object-cover object-top shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                      }
                      <Link to={`/driver/${row.driverId}`} className="text-sm font-medium hover:text-f1red transition-colors flex-1">
                        {row.driver.name}
                      </Link>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No wins data.</p>
              )}
            </Card>

            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Most Wins — Teams</p>
              {records.topWinsTeams.length ? (
                <div className="space-y-2">
                  {records.topWinsTeams.map((row, i) => (
                    <div key={row.teamId} className="flex items-center gap-3">
                      <span className="text-xs font-black w-6 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      {row.team.logo_url
                        ? <img src={row.team.logo_url} alt={row.team.name} className="w-7 h-7 object-contain shrink-0" />
                        : <div className="w-7 h-7 rounded bg-muted shrink-0" />
                      }
                      <Link to={`/team/${row.teamId}`} className="text-sm font-medium hover:text-f1red transition-colors flex-1">
                        {row.team.name}
                      </Link>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No wins data.</p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Most Poles — Drivers</p>
              {records.topPolesDrivers.length ? (
                <div className="space-y-2">
                  {records.topPolesDrivers.map((row, i) => (
                    <div key={row.driverId} className="flex items-center gap-3">
                      <span className="text-xs font-black w-6 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      {row.driver.image_url
                        ? <img src={row.driver.image_url} alt={row.driver.name} className="w-7 h-7 rounded-full object-cover object-top shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                      }
                      <Link to={`/driver/${row.driverId}`} className="text-sm font-medium hover:text-f1red transition-colors flex-1">
                        {row.driver.name}
                      </Link>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pole data.</p>
              )}
            </Card>

            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Consecutive Wins — Drivers</p>
              {records.topConsecutiveWinsDrivers.length ? (
                <div className="space-y-2">
                  {records.topConsecutiveWinsDrivers.map((row, i) => (
                    <div key={row.driverId} className="flex items-center gap-3">
                      <span className="text-xs font-black w-6 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      {row.driver.image_url
                        ? <img src={row.driver.image_url} alt={row.driver.name} className="w-7 h-7 rounded-full object-cover object-top shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                      }
                      <Link to={`/driver/${row.driverId}`} className="text-sm font-medium hover:text-f1red transition-colors flex-1">
                        {row.driver.name}
                      </Link>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {row.length}
                        {row.startYear && row.endYear && (
                          <span className="ml-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                            {row.startYear === row.endYear ? row.startYear : `${row.startYear}–${row.endYear}`}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No win-streak data.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
