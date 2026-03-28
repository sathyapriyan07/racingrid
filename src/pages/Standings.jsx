import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card } from '../components/ui'
import { Trophy } from 'lucide-react'

const POS_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

export default function Standings() {
  const { fetchSeasons, fetchStandings, seasons } = useDataStore()
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [standings, setStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('drivers')

  useEffect(() => {
    fetchSeasons().then(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!seasons.length) return
    const latest = seasons[0] // already sorted desc
    setSelectedSeason(latest)
  }, [seasons])

  useEffect(() => {
    if (!selectedSeason) return
    setStandings(null)
    fetchStandings(selectedSeason.id).then(setStandings)
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

      {/* Tab toggle */}
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

      {!standings ? <Spinner /> : (
        <Card>
          {tab === 'drivers' ? (
            standings.drivers.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No results for this season.</p>
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
                  {standings.drivers.map((row, i) => (
                    <tr key={row.driver?.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3">
                        <span className={`font-bold text-sm ${POS_COLORS[i] || 'text-white/50'}`}>
                          {i === 0 ? '🏆' : row.position}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link to={`/driver/${row.driver?.id}`} className="flex items-center gap-2 hover:text-f1red transition-colors">
                          {row.driver?.image_url
                            ? <img src={row.driver.image_url} alt={row.driver.name} className="w-7 h-7 rounded-full object-cover object-top bg-white/10" />
                            : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/30">{row.driver?.code?.slice(0,2)}</div>
                          }
                          <span className="font-medium">{row.driver?.name}</span>
                          {row.driver?.code && <span className="text-xs text-white/30">{row.driver.code}</span>}
                        </Link>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <Link to={`/team/${row.team?.id}`} className="text-white/40 hover:text-white text-xs transition-colors">
                          {row.team?.name || '—'}
                        </Link>
                      </td>
                      <td className="py-3 text-center text-white/50 text-xs">{row.wins}</td>
                      <td className="py-3 text-right font-bold">{row.points.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            standings.teams.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No results for this season.</p>
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
                  {standings.teams.map((row, i) => (
                    <tr key={row.team?.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3">
                        <span className={`font-bold text-sm ${POS_COLORS[i] || 'text-white/50'}`}>
                          {i === 0 ? '🏆' : row.position}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link to={`/team/${row.team?.id}`} className="flex items-center gap-2 hover:text-f1red transition-colors">
                          {row.team?.logo_url
                            ? <img src={row.team.logo_url} alt={row.team.name} className="w-7 h-7 object-contain bg-white/5 rounded p-0.5" />
                            : <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-white/30">{row.team?.name?.slice(0,2)}</div>
                          }
                          <span className="font-medium">{row.team?.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 text-center text-white/50 text-xs">{row.wins}</td>
                      <td className="py-3 text-right font-bold">{row.points.toFixed(0)}</td>
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
