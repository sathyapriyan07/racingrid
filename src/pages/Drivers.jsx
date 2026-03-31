import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState, Card, Badge } from '../components/ui'
import { ChevronDown, ExternalLink } from 'lucide-react'

export default function Drivers() {
  const { fetchDrivers, drivers } = useDataStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetchDrivers().catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.code || '').toLowerCase().includes(q) ||
      (d.nationality || '').toLowerCase().includes(q)
    )
  }, [drivers, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [filtered])

  if (loading) return <Spinner />

  return (
    <div className="space-y-10">
      <PageHeader title="Drivers" subtitle={`${drivers.length} drivers in database`}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search drivers..."
          className="input w-48"
        />
      </PageHeader>

      {sorted.length === 0 ? <EmptyState message="No drivers found." /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full table-fixed">
              <thead>
                <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pl-3 w-9" />
                  <th className="text-left py-2">Driver</th>
                  <th className="text-left py-2 hidden sm:table-cell">Nationality</th>
                  <th className="text-left py-2 hidden md:table-cell">DOB</th>
                  <th className="text-right py-2 pr-3 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => {
                  const open = expandedId === d.id
                  return (
                    <Fragment key={d.id}>
                      <tr
                        className="border-b hover:bg-muted transition-colors"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="py-2 pl-3 align-middle">
                          <button
                            onClick={() => setExpandedId(open ? null : d.id)}
                            className="btn-icon"
                            style={{ padding: 6 }}
                            title={open ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown
                              size={14}
                              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                          </button>
                        </td>
                        <td className="py-2 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-muted shrink-0">
                              {d.image_url
                                ? <img src={d.image_url} alt={d.name} className="w-full h-full object-cover object-top" loading="lazy" />
                                : <div className="w-full h-full flex items-center justify-center text-xs font-black" style={{ color: 'var(--text-muted)' }}>{d.code || '?'}</div>
                              }
                            </div>
                            <div className="min-w-0">
                              <Link to={`/driver/${d.id}`} className="text-sm font-semibold hover:text-f1red transition-colors truncate block">
                                {d.name}
                              </Link>
                              <div className="text-xs font-bold text-f1red">{d.code || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 hidden sm:table-cell align-middle" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-1.5">
                            {d.flag_url && <img src={d.flag_url} alt="" className="h-3 w-4 object-cover rounded-sm" loading="lazy" />}
                            <span className="truncate">{d.nationality || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 hidden md:table-cell align-middle" style={{ color: 'var(--text-secondary)' }}>
                          {d.dob ? new Date(d.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-2 pr-3 text-right align-middle">
                          {d.is_active
                            ? <Badge color="green">Active</Badge>
                            : <Badge color="gray">Inactive</Badge>
                          }
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                          <td className="pl-3 py-0 align-top" />
                          <td colSpan={4} className="py-4 pr-3">
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="w-full sm:w-48 shrink-0">
                                <div className="apple-card overflow-hidden">
                                  <div className="h-40 bg-muted overflow-hidden">
                                    {d.hero_image_url || d.image_url
                                      ? <img src={d.hero_image_url || d.image_url} alt={d.name} className="w-full h-full object-cover object-top" loading="lazy" />
                                      : <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ color: 'var(--text-muted)' }}>{d.code || '?'}</div>
                                    }
                                  </div>
                                  <div className="p-3">
                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Nationality</div>
                                    <div className="text-sm font-semibold">{d.nationality || '—'}</div>
                                    {d.dob && (
                                      <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                        Born {new Date(d.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {d.biography ? (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                                    {d.biography}
                                  </p>
                                ) : (
                                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No biography added yet.</p>
                                )}

                                {(d.website_url || d.instagram_url || d.twitter_url) && (
                                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                                    {d.website_url && (
                                      <a href={d.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-f1red hover:opacity-80 inline-flex items-center gap-1">
                                        <ExternalLink size={12} /> Website
                                      </a>
                                    )}
                                    {d.instagram_url && (
                                      <a href={d.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs text-f1red hover:opacity-80 inline-flex items-center gap-1">
                                        <ExternalLink size={12} /> Instagram
                                      </a>
                                    )}
                                    {d.twitter_url && (
                                      <a href={d.twitter_url} target="_blank" rel="noopener noreferrer" className="text-xs text-f1red hover:opacity-80 inline-flex items-center gap-1">
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
