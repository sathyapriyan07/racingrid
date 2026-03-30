import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, SearchSelect } from '../components/ui'
import { Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Standings() {
  const { fetchSeasons, seasons } = useDataStore()
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [driverRows, setDriverRows] = useState([])
  const [teamRows, setTeamRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [tab, setTab] = useState('drivers')
  const [query, setQuery] = useState('')

  useEffect(() => { fetchSeasons().catch(console.error).finally(() => setLoading(false)) }, [])
  useEffect(() => { if (seasons.length) setSelectedSeason(seasons[0]) }, [seasons])

  useEffect(() => {
    if (!selectedSeason) return
    setStandingsLoading(true)
    Promise.all([
      supabase.from('driver_standings').select('*, drivers(id, name, code, image_url), teams(id, name, logo_url)').eq('season_id', selectedSeason.id).order('position'),
      supabase.from('constructor_standings').select('*, teams(id, name, logo_url)').eq('season_id', selectedSeason.id).order('position'),
    ]).then(([d, t]) => {
      setDriverRows(d.data || [])
      setTeamRows(t.data || [])
    }).catch(console.error).finally(() => setStandingsLoading(false))
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
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
                      <th className="text-center py-3">Wins</th>
                      <th className="text-right py-3 pr-5">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDriverRows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-muted transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-3 pl-5">
                          <span className={`font-black text-sm ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}
                            style={{ color: i > 2 ? 'var(--text-muted)' : undefined }}>
                            {i === 0 ? '🏆' : row.position}
                          </span>
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
                      <th className="text-center py-3">Wins</th>
                      <th className="text-right py-3 pr-5">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamRows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-muted transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-3 pl-5">
                          <span className={`font-black text-sm ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}
                            style={{ color: i > 2 ? 'var(--text-muted)' : undefined }}>
                            {i === 0 ? '🏆' : row.position}
                          </span>
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
