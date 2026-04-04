import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState, Badge } from '../components/ui'
import { Search } from 'lucide-react'

function TeamCard({ team, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link to={`/team/${team.id}`} className="block h-full">
        <div className="card-premium h-full p-5 flex flex-col gap-4">
          {/* Logo + status */}
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center overflow-hidden p-1.5">
              {team.logo_url
                ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" loading="lazy" />
                : <span className="text-sm font-black text-secondary">{(team.name || '?').slice(0, 2).toUpperCase()}</span>
              }
            </div>
            {team.is_active
              ? <div className="live-dot mt-1" />
              : <div className="w-2 h-2 rounded-full bg-secondary/30 mt-1" />
            }
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>
              {team.name}
            </div>
            {team.full_name && team.full_name !== team.name && (
              <div className="text-[10px] text-secondary mt-0.5 truncate">{team.full_name}</div>
            )}
          </div>
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {team.nationality && (
              <div className="flex items-center gap-1">
                {team.flag_url && <img src={team.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm" loading="lazy" />}
                <span className="text-[10px] text-secondary">{team.nationality}</span>
              </div>
            )}
            {team.founded && (
              <span className="text-[10px] text-secondary">Est. {team.founded}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Teams() {
  const { fetchTeams, teams } = useDataStore()
  const [loading, setLoading] = useState(() => !useDataStore.getState().teams.length)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')

  useEffect(() => {
    fetchTeams().catch(console.error).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? teams.filter(t =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.full_name || '').toLowerCase().includes(q) ||
          (t.nationality || '').toLowerCase().includes(q) ||
          (t.base || '').toLowerCase().includes(q)
        )
      : teams
    return [...filtered].sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [teams, search])

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <PageHeader title="Teams" subtitle={`${teams.length} teams in database`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search teams..." className="input pl-8 w-44 h-9 text-xs" />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-border">
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === v ? 'bg-accent text-white' : 'bg-card text-secondary hover:text-primary'}`}>
                {v === 'grid' ? '⊞' : '≡'}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {sorted.length === 0 ? <EmptyState message="No teams found." /> : (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sorted.map((t, i) => <TeamCard key={t.id} team={t} index={i} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-border overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pl-4">Team</th>
                  <th className="text-left py-2 hidden sm:table-cell">Nationality</th>
                  <th className="text-left py-2 hidden md:table-cell">Base</th>
                  <th className="text-left py-2 hidden lg:table-cell w-20">Founded</th>
                  <th className="text-right py-2 pr-4 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => (
                  <tr key={t.id} className="border-b hover:bg-muted transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 pl-4 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center p-1">
                          {t.logo_url
                            ? <img src={t.logo_url} alt={t.name} className="w-full h-full object-contain" loading="lazy" />
                            : <span className="text-xs font-black text-secondary">{(t.name || '?').slice(0, 2).toUpperCase()}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <Link to={`/team/${t.id}`} className="text-sm font-semibold hover:text-accent transition-colors truncate block">
                            {t.name}
                          </Link>
                          <div className="text-[10px] text-secondary truncate">{t.full_name || t.base || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 hidden sm:table-cell align-middle" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1.5">
                        {t.flag_url && <img src={t.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm" loading="lazy" />}
                        <span className="text-xs truncate">{t.nationality || '—'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 hidden md:table-cell align-middle text-xs" style={{ color: 'var(--text-secondary)' }}>{t.base || '—'}</td>
                    <td className="py-2.5 hidden lg:table-cell align-middle text-xs" style={{ color: 'var(--text-secondary)' }}>{t.founded || '—'}</td>
                    <td className="py-2.5 pr-4 text-right align-middle">
                      {t.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
