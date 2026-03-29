import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState } from '../components/ui'

function TeamCard({ team, featured = false }) {
  return (
    <Link to={`/team/${team.id}`}>
      <div className="apple-card overflow-hidden" style={{ width: featured ? 200 : '100%' }}>
        {featured ? (
          <>
            <div className="h-28 flex items-center justify-center p-4 bg-muted">
              {team.logo_url
                ? <img src={team.logo_url} alt={team.name} className="h-16 w-auto object-contain" loading="lazy" />
                : <span className="text-2xl font-black" style={{ color: 'var(--text-muted)' }}>{team.name.slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div className="p-3">
              <div className="font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>{team.name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                {team.flag_url && <img src={team.flag_url} alt="" className="h-3.5 w-auto rounded-sm" loading="lazy" />}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.nationality || '—'}</span>
              </div>
              {team.base && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>📍 {team.base}</div>}
            </div>
          </>
        ) : (
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted">
              {team.logo_url
                ? <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" loading="lazy" />
                : <span className="text-xs font-black" style={{ color: 'var(--text-muted)' }}>{team.name.slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate" style={{ letterSpacing: '-0.01em' }}>{team.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {team.flag_url && <img src={team.flag_url} alt="" className="h-3 w-auto rounded-sm" loading="lazy" />}
                <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {team.nationality}{team.base ? ` · ${team.base}` : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function Teams() {
  const { fetchTeams, teams } = useDataStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTeams().catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.nationality || '').toLowerCase().includes(search.toLowerCase())
  )

  const current = filtered.filter(t => t.is_active)
  const others = filtered.filter(t => !t.is_active)

  if (loading) return <Spinner />

  return (
    <div className="space-y-10">
      <PageHeader title="Teams" subtitle={`${teams.length} teams in database`}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..." className="input w-48" />
      </PageHeader>

      {filtered.length === 0 ? <EmptyState message="No teams found." /> : (
        <>
          {current.length > 0 && (
            <section>
              <h2 className="section-title mb-5">Current Season</h2>
              <div className="scroll-row pb-4">
                {current.map(team => <TeamCard key={team.id} team={team} featured />)}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              {current.length > 0 && <h2 className="section-title mb-5">All Teams</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {others.map(team => <TeamCard key={team.id} team={team} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
