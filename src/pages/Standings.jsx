import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, SearchSelect } from '../components/ui'
import { Trophy, ArrowUp, ArrowDown } from 'lucide-react'
import { motion } from 'framer-motion'
import PressureMeter from '../components/visual/PressureMeter'

export default function Standings() {
  const { fetchSeasons, seasons } = useDataStore()
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [driverRows, setDriverRows] = useState([])
  const [teamRows, setTeamRows] = useState([])
  const [driverDeltaById, setDriverDeltaById] = useState({})
  const [teamDeltaById, setTeamDeltaById] = useState({})
  const [driverFormById, setDriverFormById] = useState({})
  const [teamFormById, setTeamFormById] = useState({})
  const [loading, setLoading] = useState(() => !useDataStore.getState().seasons.length)
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [tab, setTab] = useState('drivers')
  const [query, setQuery] = useState('')

  useEffect(() => { fetchSeasons().catch(console.error).finally(() => setLoading(false)) }, [])
  useEffect(() => { if (seasons.length) setSelectedSeason(seasons[0]) }, [seasons])

  useEffect(() => {
    if (!selectedSeason) return
    let cancelled = false
    setStandingsLoading(true)
    const load = async () => {
      setDriverDeltaById({})
      setTeamDeltaById({})
      setDriverFormById({})
      setTeamFormById({})

      const [d, t] = await Promise.all([
        supabase.from('driver_standings').select('*, drivers(id, name, code, image_url), teams(id, name, logo_url)').eq('season_id', selectedSeason.id).order('position'),
        supabase.from('constructor_standings').select('*, teams(id, name, logo_url)').eq('season_id', selectedSeason.id).order('position'),
      ])
      if (cancelled) return
      setDriverRows(d.data || [])
      setTeamRows(t.data || [])

      const { data: seasonResults, error } = await supabase
        .from('results')
        .select('driver_id, team_id, points, position, races!inner(id, round, season_id)')
        .eq('races.season_id', selectedSeason.id)
      if (error || !seasonResults?.length || cancelled) return

      const rounds = seasonResults.map(r => r?.races?.round).filter(n => typeof n === 'number')
      const maxRound = rounds.length ? Math.max(...rounds) : null
      if (!maxRound || maxRound <= 1) return

      const buildPosMap = (key, roundLimit) => {
        const map = {}
        for (const r of seasonResults) {
          const round = r?.races?.round
          if (typeof round !== 'number' || round > roundLimit) continue
          const id = r[key]
          if (!id) continue
          if (!map[id]) map[id] = { points: 0, wins: 0 }
          map[id].points += Number(r.points) || 0
          if (r.position === 1) map[id].wins += 1
        }
        const ordered = Object.entries(map)
          .sort(([, a], [, b]) => (b.points - a.points) || (b.wins - a.wins))
          .map(([id], idx) => [id, idx + 1])
        return Object.fromEntries(ordered)
      }

      const prevDriverPos = buildPosMap('driver_id', maxRound - 1)
      const prevTeamPos = buildPosMap('team_id', maxRound - 1)

      const driverDelta = {}
      for (const row of (d.data || [])) {
        const prev = prevDriverPos[row.driver_id]
        const cur = row.position
        if (typeof prev === 'number' && typeof cur === 'number') driverDelta[row.driver_id] = prev - cur
      }
      const teamDelta = {}
      for (const row of (t.data || [])) {
        const prev = prevTeamPos[row.team_id]
        const cur = row.position
        if (typeof prev === 'number' && typeof cur === 'number') teamDelta[row.team_id] = prev - cur
      }
      if (!cancelled) {
        setDriverDeltaById(driverDelta)
        setTeamDeltaById(teamDelta)
      }

      const uniqueRounds = [...new Set(rounds)].sort((a, b) => b - a)
      const recentRounds = uniqueRounds.slice(0, 5).sort((a, b) => a - b)
      const driverForm = {}
      const teamForm = {}

      for (const r of seasonResults) {
        const round = r?.races?.round
        if (typeof round !== 'number' || !recentRounds.includes(round)) continue
        const pos = Number(r.position)
        const entry = { round, position: Number.isFinite(pos) ? pos : null, raceId: r?.races?.id || null }
        if (r.driver_id) {
          if (!driverForm[r.driver_id]) driverForm[r.driver_id] = {}
          driverForm[r.driver_id][round] = entry
        }
        if (r.team_id) {
          if (!teamForm[r.team_id]) teamForm[r.team_id] = {}
          // team has two results per round; keep the better position for quick form.
          const prev = teamForm[r.team_id][round]
          if (!prev || (entry.position != null && (prev.position == null || entry.position < prev.position))) teamForm[r.team_id][round] = entry
        }
      }

      const toArray = (m) => recentRounds.map(rd => m?.[rd] || { round: rd, position: null, raceId: null })
      const driverFormById = Object.fromEntries(Object.entries(driverForm).map(([id, m]) => [id, toArray(m)]))
      const teamFormById = Object.fromEntries(Object.entries(teamForm).map(([id, m]) => [id, toArray(m)]))

      if (!cancelled) {
        setDriverFormById(driverFormById)
        setTeamFormById(teamFormById)
      }
    }

    load().catch(console.error).finally(() => { if (!cancelled) setStandingsLoading(false) })
    return () => { cancelled = true }
  }, [selectedSeason])

  if (loading) return <Spinner />

  const seasonOptions = seasons
    .slice()
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .map(s => ({ value: s.id, label: String(s.year), keywords: String(s.year) }))

  const filteredDriverRows = driverRows.filter(row => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${row.drivers?.name || ''} ${row.drivers?.code || ''} ${row.teams?.name || ''}`.toLowerCase()
    return hay.includes(q)
  })

  const filteredTeamRows = teamRows.filter(row => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${row.teams?.name || ''}`.toLowerCase()
    return hay.includes(q)
  })

  const FormPills = ({ items = [] }) => (
    <div className="flex items-center gap-1">
      {items.map((it, idx) => {
        const pos = typeof it.position === 'number' ? it.position : null
        const color =
          pos == null ? 'rgba(255,255,255,0.06)'
            : pos <= 3 ? 'rgba(234,179,8,0.16)'
              : pos <= 10 ? 'rgba(34,197,94,0.14)'
                : 'rgba(255,255,255,0.06)'

        const chip = (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border"
            style={{ background: color, borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            title={pos != null ? `P${pos}` : '—'}
          >
            {pos != null ? `P${pos}` : '\u2014'}
          </span>
        )

        return it.raceId ? (
          <Link key={`${it.round}_${idx}`} to={`/race/${it.raceId}`} className="hover:opacity-90 transition-opacity">
            {chip}
          </Link>
        ) : (
          <span key={`${it.round}_${idx}`}>{chip}</span>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-black flex items-center gap-2" style={{ letterSpacing: '-0.04em' }}>
          <Trophy size={24} className="text-yellow-400" /> Championships
        </h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="w-36">
            <SearchSelect
              value={selectedSeason?.id || ''}
              onChange={(val) => setSelectedSeason(seasons.find(s => s.id === val) || null)}
              options={seasonOptions}
              placeholder="Season..."
              disabled={seasons.length === 0}
            />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'drivers' ? 'Search drivers...' : 'Search teams...'}
            className="input w-48"
          />
        </div>
      </motion.div>

      <div className="flex gap-1 p-1 rounded-2xl w-fit bg-muted border border-border">
        <button onClick={() => setTab('drivers')} className={`tab-pill ${tab === 'drivers' ? 'active' : ''}`}>Drivers</button>
        <button onClick={() => setTab('constructors')} className={`tab-pill ${tab === 'constructors' ? 'active' : ''}`}>Constructors</button>
      </div>

      {standingsLoading ? <Spinner /> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-3">
          {tab === 'drivers' && driverRows.length > 1 && (
            <PressureMeter
              title="Championship Pressure"
              rows={driverRows.map(r => ({ id: r.driver_id, name: r.drivers?.name || '—', points: r.points }))}
            />
          )}
          {tab === 'constructors' && teamRows.length > 1 && (
            <PressureMeter
              title="Constructors Pressure"
              rows={teamRows.map(r => ({ id: r.team_id, name: r.teams?.name || '—', points: r.points }))}
            />
          )}
          <Card className="p-0 overflow-hidden">
            {tab === 'drivers' ? (
              driverRows.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No standings imported. Use Sync Tools.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-3 pl-5 w-10">Pos</th>
                      <th className="text-left py-3">Driver</th>
                      <th className="text-left py-3 hidden sm:table-cell">Team</th>
                      <th className="text-left py-3 hidden lg:table-cell">Form</th>
                      <th className="text-center py-3">Wins</th>
                      <th className="text-right py-3 pr-5">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDriverRows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-muted transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-3 pl-5">
                          <div className="flex items-center gap-1">
                            <span className={`font-black text-sm ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}
                              style={{ color: i > 2 ? 'var(--text-muted)' : undefined }}>
                              {i === 0 ? '🏆' : row.position}
                            </span>
                            {driverDeltaById[row.driver_id] > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-400">
                                <ArrowUp size={10} /> {driverDeltaById[row.driver_id]}
                              </span>
                            )}
                            {driverDeltaById[row.driver_id] < 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400">
                                <ArrowDown size={10} /> {Math.abs(driverDeltaById[row.driver_id])}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Link to={`/driver/${row.driver_id}`} className="flex items-center gap-3 group">
                            {row.drivers?.image_url
                              ? <img src={row.drivers.image_url} alt={row.drivers.name} className="w-9 h-9 rounded-full object-cover object-top shrink-0" />
                              : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{row.drivers?.code?.slice(0,3)}</div>
                            }
                            <div>
                              <div className="font-semibold text-sm group-hover:text-f1red transition-colors" style={{ letterSpacing: '-0.02em' }}>{row.drivers?.name}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.drivers?.code}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          <Link to={`/team/${row.team_id}`} className="text-xs hover:text-f1red transition-colors" style={{ color: 'var(--text-muted)' }}>
                            {row.teams?.name || '—'}
                          </Link>
                        </td>
                        <td className="py-3 hidden lg:table-cell">
                          <FormPills items={driverFormById[row.driver_id] || []} />
                        </td>
                        <td className="py-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{row.wins}</td>
                        <td className="py-3 text-right pr-5 font-bold tabular-nums">{parseFloat(row.points).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              teamRows.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No standings imported. Use Sync Tools.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-3 pl-5 w-10">Pos</th>
                      <th className="text-left py-3">Constructor</th>
                      <th className="text-left py-3 hidden lg:table-cell">Form</th>
                      <th className="text-center py-3">Wins</th>
                      <th className="text-right py-3 pr-5">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamRows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-muted transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-3 pl-5">
                          <div className="flex items-center gap-1">
                            <span className={`font-black text-sm ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}
                              style={{ color: i > 2 ? 'var(--text-muted)' : undefined }}>
                              {i === 0 ? '🏆' : row.position}
                            </span>
                            {teamDeltaById[row.team_id] > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-400">
                                <ArrowUp size={10} /> {teamDeltaById[row.team_id]}
                              </span>
                            )}
                            {teamDeltaById[row.team_id] < 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400">
                                <ArrowDown size={10} /> {Math.abs(teamDeltaById[row.team_id])}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Link to={`/team/${row.team_id}`} className="flex items-center gap-3 group">
                            {row.teams?.logo_url
                              ? <img src={row.teams.logo_url} alt={row.teams.name} className="w-7 h-7 object-contain shrink-0" />
                              : <div className="w-7 h-7 rounded shrink-0" style={{ background: 'var(--bg-muted)' }} />
                            }
                            <span className="font-semibold text-sm group-hover:text-f1red transition-colors" style={{ letterSpacing: '-0.02em' }}>{row.teams?.name}</span>
                          </Link>
                        </td>
                        <td className="py-3 hidden lg:table-cell">
                          <FormPills items={teamFormById[row.team_id] || []} />
                        </td>
                        <td className="py-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{row.wins}</td>
                        <td className="py-3 text-right pr-5 font-bold tabular-nums">{parseFloat(row.points).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}
