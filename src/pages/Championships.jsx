import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui'
import { Trophy } from 'lucide-react'

export default function Championships() {
  const { fetchAllChampionships } = useDataStore()
  const [drivers, setDrivers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('drivers')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { driverChamps, teamChamps } = await fetchAllChampionships()
        const driverIds = Object.keys(driverChamps)
        const teamIds = Object.keys(teamChamps)
        const [{ data: driverRows }, { data: teamRows }] = await Promise.all([
          driverIds.length
            ? supabase.from('drivers').select('id, name, nationality, flag_url, image_url').in('id', driverIds)
            : { data: [] },
          teamIds.length
            ? supabase.from('teams').select('id, name, nationality, flag_url, logo_url').in('id', teamIds)
            : { data: [] },
        ])
        if (cancelled) return
        const driverList = (driverRows || [])
          .map(d => ({ ...d, years: (driverChamps[d.id] || []).sort((a, b) => a - b), count: (driverChamps[d.id] || []).length }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        const teamList = (teamRows || [])
          .map(t => ({ ...t, years: (teamChamps[t.id] || []).sort((a, b) => a - b), count: (teamChamps[t.id] || []).length }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        setDrivers(driverList)
        setTeams(teamList)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const rows = tab === 'drivers' ? drivers : teams
  const linkBase = tab === 'drivers' ? '/driver' : '/team'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(234,179,8,0.12)' }}>
          <Trophy size={18} style={{ color: '#F59E0B' }} />
        </div>
        <h1 className="text-3xl font-black" style={{ letterSpacing: '-0.04em' }}>Championships</h1>
      </div>

      <div className="tab-bar">
        <button onClick={() => setTab('drivers')} className={`tab-pill ${tab === 'drivers' ? 'active' : ''}`}>Drivers</button>
        <button onClick={() => setTab('teams')} className={`tab-pill ${tab === 'teams' ? 'active' : ''}`}>Constructors</button>
      </div>

      {loading ? <Spinner /> : (
        <div className="apple-card p-0 overflow-hidden">
          {rows.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No championship data found.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2.5 pl-5 w-8">#</th>
                  <th className="text-left py-2.5">{tab === 'drivers' ? 'Driver' : 'Constructor'}</th>
                  <th className="text-right py-2.5">Titles</th>
                  <th className="text-right py-2.5 pr-5 hidden sm:table-cell">Years</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-b hover-row" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 pl-5 text-sm font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="py-3">
                      <Link to={`${linkBase}/${row.id}`} className="flex items-center gap-3 hover:text-f1red transition-colors">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          {(tab === 'drivers' ? row.image_url : row.logo_url)
                            ? <img
                                src={tab === 'drivers' ? row.image_url : row.logo_url}
                                alt={row.name}
                                className={`w-full h-full ${tab === 'drivers' ? 'object-cover object-top' : 'object-contain p-1'}`}
                              />
                            : <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{row.name.slice(0, 2).toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{row.name}</div>
                          {row.nationality && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {row.flag_url && <img src={row.flag_url} alt="" className="h-3 w-auto rounded-sm" />}
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.nationality}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-black text-base tabular-nums" style={{ color: '#F59E0B', letterSpacing: '-0.03em' }}>
                        <Trophy size={13} />
                        {row.count}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right hidden sm:table-cell">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {row.years.join(', ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
