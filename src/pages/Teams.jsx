import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState } from '../components/ui'

export default function Teams() {
  const { fetchTeams, teams } = useDataStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTeams().finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.nationality || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title="Teams" subtitle={`${teams.length} teams in database`}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..." className="input w-48" />
      </PageHeader>

      {filtered.length === 0 ? <EmptyState message="No teams found." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(team => (
            <Link key={team.id} to={`/team/${team.id}`}>
              <div className="glass-hover p-5 group flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-dark-600 overflow-hidden shrink-0 flex items-center justify-center">
                  {team.logo_url
                    ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-1" />
                    : <span className="text-xs font-black text-white/20">{team.name.slice(0, 2).toUpperCase()}</span>
                  }
                </div>
                <div>
                  <div className="font-semibold group-hover:text-f1red transition-colors">{team.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{team.nationality} {team.base ? `· ${team.base}` : ''}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
