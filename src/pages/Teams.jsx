import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState, Card, Badge } from '../components/ui'

export default function Teams() {
  const { fetchTeams, teams } = useDataStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetchTeams().catch(console.error).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.full_name || '').toLowerCase().includes(q) ||
      (t.nationality || '').toLowerCase().includes(q) ||
      (t.base || '').toLowerCase().includes(q)
    )
  }, [teams, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [filtered])

  if (loading) return <Spinner />

  return (
    <div className="space-y-10">
      <PageHeader title="Teams" subtitle={`${teams.length} teams in database`}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..."
          className="input w-48"
        />
      </PageHeader>

      {sorted.length === 0 ? <EmptyState message="No teams found." /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left py-2 pl-3 w-9" />
                <th className="text-left py-2">Team</th>
                <th className="text-left py-2 hidden sm:table-cell">Nationality</th>
                <th className="text-left py-2 hidden md:table-cell">Base</th>
                <th className="text-left py-2 hidden lg:table-cell w-20">Founded</th>
                <th className="text-right py-2 pr-3 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => {
                const open = expandedId === t.id
                return (
                  <Fragment key={t.id}>
                    <tr className="border-b hover:bg-muted" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2 pl-3 align-middle">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpandedId(open ? null : t.id)}
                          className="btn-icon"
                          style={{ padding: 6 }}
                          title={open ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </button>
                      </td>

                      <td className="py-2 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                            {t.logo_url
                              ? <img src={t.logo_url} alt={t.name} className="w-7 h-7 object-contain" loading="lazy" />
                              : <div className="text-xs font-black" style={{ color: 'var(--text-muted)' }}>{(t.name || '?').slice(0, 2).toUpperCase()}</div>
                            }
                          </div>
                          <div className="min-w-0">
                            <Link to={`/team/${t.id}`} className="text-sm font-semibold hover:text-f1red truncate block">
                              {t.name}
                            </Link>
                            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {t.full_name || (t.base ? t.base : '—')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 hidden sm:table-cell align-middle truncate" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {t.flag_url && <img src={t.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm" loading="lazy" />}
                          <span className="truncate">{t.nationality || '—'}</span>
                        </div>
                      </td>

                      <td className="py-2 hidden md:table-cell align-middle truncate" style={{ color: 'var(--text-secondary)' }}>
                        {t.base || '—'}
                      </td>

                      <td className="py-2 hidden lg:table-cell align-middle truncate" style={{ color: 'var(--text-secondary)' }}>
                        {t.founded || '—'}
                      </td>

                      <td className="py-2 pr-3 text-right align-middle">
                        {t.is_active
                          ? <Badge color="green">Active</Badge>
                          : <Badge color="gray">Inactive</Badge>
                        }
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                        <td className="pl-3 py-0 align-top" />
                        <td colSpan={5} className="py-4 pr-3">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-56 shrink-0">
                              <div className="apple-card overflow-hidden">
                                <div className="h-36 bg-muted overflow-hidden">
                                  {t.hero_image_url || t.car_image || t.logo_url ? (
                                    <img
                                      src={t.hero_image_url || t.car_image || t.logo_url}
                                      alt={t.name}
                                      className="w-full h-full object-cover object-center"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ color: 'var(--text-muted)' }}>
                                      {(t.name || '?').slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="p-3">
                                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Base</div>
                                  <div className="text-sm font-semibold">{t.base || '—'}</div>
                                  <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                    {t.nationality || '—'}{t.founded ? ` · Founded ${t.founded}` : ''}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              {t.bio ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                                  {t.bio}
                                </p>
                              ) : (
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No team bio added yet.</p>
                              )}

                              {(t.website_url || t.instagram_url || t.twitter_url) && (
                                <div className="flex items-center gap-3 mt-4 flex-wrap">
                                  {t.website_url && (
                                    <a href={t.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-f1red hover:opacity-80 inline-flex items-center gap-1">
                                      <ExternalLink size={12} /> Website
                                    </a>
                                  )}
                                  {t.instagram_url && (
                                    <a href={t.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs text-f1red hover:opacity-80 inline-flex items-center gap-1">
                                      <ExternalLink size={12} /> Instagram
                                    </a>
                                  )}
                                  {t.twitter_url && (
                                    <a href={t.twitter_url} target="_blank" rel="noopener noreferrer" className="text-xs text-f1red hover:opacity-80 inline-flex items-center gap-1">
                                      <ExternalLink size={12} /> X/Twitter
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
