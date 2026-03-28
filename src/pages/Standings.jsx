import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card } from '../components/ui'
import { Trophy } from 'lucide-react'

const POS_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

export default function Standings() {
  const { fetchSeasons, seasons } = useDataStore()
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [driverRows, setDriverRows] = useState([])
  const [teamRows, setTeamRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [tab, setTab] = useState('drivers')

  useEffect(() => {
    fetchSeasons().catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!seasons.length) return
    setSelectedSeason(seasons[0])
  }, [seasons])

  useEffect(() => {
    if (!selectedSeason) return
    setStandingsLoading(true)
    Promise.all([
      supabase.from('driver_standings')
        .select('*, drivers(id, name, code, image_url), teams(id, name, logo_url)')
        .eq('season_id', selectedSeason.id)
        .order('position'),
      supabase.from('constructor_standings')
        .select('*, teams(id, name, logo_url)')
        .eq('season_id', selectedSeason.id)
        .order('position'),
    ]).then(([d, t]) => {
      setDriverRows(d.data || [])
      setTeamRows(t.data || [])
    }).catch(console.error).finally(() => setStandingsLoading(false))
  }, [selectedSeason])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" /> Championships
        </h1>
        <div className="flex gap-2 flex-wrap">
          {seasons.map(s => (
            <button key={s.id} onClick={() => setSelectedSeason(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedSeason?.id === s.id ? 'bg-f1red text-white' : 'glass text-white/50 hover:text-white'
              }`}>
              {s.year}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('drivers')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'drivers' ? 'bg-f1red text-white' : 'text-white/50 hover:text-white'}`}>
          Drivers
        </button>
        <button onClick={() => setTab('constructors')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'constructors' ? 'bg-f1red text-white' : 'text-white/50 hover:text-white'}`}>
          Constructors
        </button>
      </div>

      {standingsLoading ? <Spinner /> : (
        <Card>
          {tab === 'drivers' ? (
            driverRows.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No standings imported for this season. Use Sync Tools.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs border-b border-white/5">
                    <th className="text-left pb-3 w-10">Pos</th>
                    <th className="text-left pb-3">Driver</th>
                    <th className="text-left pb-3 hidden sm:table-cell">Team</th>
                    <th className="text-center pb-3">Wins</th>
                    <th className="text-right pb-3">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {driverRows.map((row, i) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-2">
                        <span className={`font-bold text-sm ${POS_COLORS[i] || 'text-white/50'}`}>
                          {i === 0 ? '🏆' : row.position}
                        </span>
                      </td>
                      <td className="py-2">
                        <Link to={`/driver/${row.driver_id}`} className="flex items-center gap-3 hover:text-f1red transition-colors">
                          {row.drivers?.image_url
                            ? <img src={row.drivers.image_url} alt={row.drivers.name} className="w-9 h-9 rounded-full object-cover object-top shrink-0 border border-white/10" />
                            : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>{row.drivers?.code?.slice(0,3)}</div>
                          }
                          <div>
                            <div className="font-semibold text-sm leading-tight">{row.drivers?.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{row.drivers?.code}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-2.5 hidden sm:table-cell">
                        <Link to={`/team/${row.team_id}`} className="text-xs hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
                          {row.teams?.name || '—'}
                        </Link>
                      </td>
                      <td className="py-2.5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{row.wins}</td>
                      <td className="py-2.5 text-right font-bold">{parseFloat(row.points).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            teamRows.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No standings imported for this season. Use Sync Tools.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs border-b border-white/5">
                    <th className="text-left pb-3 w-10">Pos</th>
                    <th className="text-left pb-3">Constructor</th>
                    <th className="text-center pb-3">Wins</th>
                    <th className="text-right pb-3">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((row, i) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-2.5">
                        <span className={`font-bold text-sm ${POS_COLORS[i] || 'text-white/50'}`}>
                          {i === 0 ? '🏆' : row.position}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Link to={`/team/${row.team_id}`} className="flex items-center gap-2 hover:text-f1red transition-colors">
                          {row.teams?.logo_url
                            ? <img src={row.teams.logo_url} alt={row.teams.name} className="w-6 h-6 object-contain shrink-0" />
                            : <div className="w-6 h-6 rounded bg-white/10 shrink-0" />
                          }
                          <span className="font-medium text-sm">{row.teams?.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{row.wins}</td>
                      <td className="py-2.5 text-right font-bold">{parseFloat(row.points).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </Card>
      )}
    </div>
  )
}
