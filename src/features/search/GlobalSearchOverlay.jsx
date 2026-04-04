import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useUIStore } from '../../store/uiStore'
import { useGlobalSearchQuery } from '../../services/queries'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui'

function isEditableTarget(target) {
  const el = target
  if (!el) return false
  const tag = (el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || el.isContentEditable
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--text-muted)' }}>
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function GlobalSearchOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const { searchOpen, openSearch, closeSearch } = useUIStore()

  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const { data, isFetching, error, refetch } = useGlobalSearchQuery(debounced)

  const sections = useMemo(() => {
    const d = data || { drivers: [], teams: [], races: [], circuits: [] }
    return [
      {
        key: 'drivers',
        title: 'Drivers',
        items: d.drivers.map((x) => ({
          id: `driver_${x.id}`,
          href: `/driver/${x.id}`,
          title: x.name,
          subtitle: [x.code, x.nationality].filter(Boolean).join(' · '),
          image: x.image_url,
          badge: 'DRI',
        })),
      },
      {
        key: 'teams',
        title: 'Teams',
        items: d.teams.map((x) => ({
          id: `team_${x.id}`,
          href: `/team/${x.id}`,
          title: x.name,
          subtitle: x.nationality || '',
          image: x.logo_url,
          badge: 'TEAM',
        })),
      },
      {
        key: 'races',
        title: 'Races',
        items: d.races.map((x) => ({
          id: `race_${x.id}`,
          href: `/race/${x.id}`,
          title: x.name,
          subtitle: x.seasons?.year ? `${x.seasons.year}` : '',
          image: null,
          badge: 'RACE',
        })),
      },
      {
        key: 'circuits',
        title: 'Circuits',
        items: d.circuits.map((x) => ({
          id: `circuit_${x.id}`,
          href: `/circuit/${x.id}`,
          title: x.name,
          subtitle: [x.location, x.country].filter(Boolean).join(' · '),
          image: x.layout_image,
          badge: 'CIR',
        })),
      },
    ].filter((s) => s.items.length > 0)
  }, [data])

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const [activeIndex, setActiveIndex] = useState(0)
  const active = flatItems[activeIndex]

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
        if (isEditableTarget(e.target)) return
        e.preventDefault()
        openSearch()
      }
      if (!searchOpen) return
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeSearch, openSearch, searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    setQuery('')
    setActiveIndex(0)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen) closeSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    const onDown = (e) => {
      if (!searchOpen) return
      if (!panelRef.current?.contains(e.target)) closeSearch()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [closeSearch, searchOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [debounced])

  const onSubmit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    closeSearch()
  }

  const go = (href) => {
    navigate(href)
    closeSearch()
  }

  const onKeyNav = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(flatItems.length - 1, i + 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    }
    if (e.key === 'Enter' && active) {
      e.preventDefault()
      go(active.href)
    }
  }

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] px-4 py-10 md:py-16"
          style={{
            background: 'radial-gradient(80% 60% at 50% 0%, rgba(225,6,0,0.12) 0%, rgba(0,0,0,0.88) 55%, rgba(0,0,0,0.92) 100%)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto w-full max-w-2xl rounded-3xl border shadow-[var(--shadow)] overflow-hidden"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(18px)' }}
          >
            <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <Search size={16} className="text-secondary" />
              </div>
              <form onSubmit={onSubmit} className="flex-1">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyNav}
                  placeholder="Search drivers, teams, races, circuits…"
                  className="input h-10 text-sm"
                  aria-autocomplete="list"
                />
              </form>
              <button onClick={closeSearch} className="btn-icon w-9 h-9" aria-label="Close search">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 md:p-5 max-h-[70vh] overflow-auto">
              {!query.trim() && (
                <div className="space-y-3">
                  <div className="apple-card p-5">
                    <div className="text-sm font-semibold">Quick tips</div>
                    <div className="mt-2 text-xs text-secondary space-y-1">
                      <div><span className="font-bold text-primary">/</span> open search anywhere</div>
                      <div><span className="font-bold text-primary">↑/↓</span> navigate results, <span className="font-bold text-primary">Enter</span> open</div>
                      <div><span className="font-bold text-primary">Esc</span> close</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Drivers', 'Teams', 'Races', 'Circuits'].map((x) => (
                      <div key={x} className="glass p-4">
                        <div className="text-xs font-semibold uppercase tracking-widest text-secondary">{x}</div>
                        <div className="mt-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-36 mt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!query.trim() && error && (
                <ErrorState message={error?.message || 'Search failed.'} onRetry={() => refetch()} />
              )}

              {!!query.trim() && !error && (
                <>
                  {isFetching && (
                    <div className="space-y-5">
                      {['Drivers', 'Teams', 'Races', 'Circuits'].map((t) => (
                        <Section key={t} title={t}>
                          <div className="apple-card p-3">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-56 mt-2" />
                          </div>
                          <div className="apple-card p-3">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-3 w-36 mt-2" />
                          </div>
                        </Section>
                      ))}
                    </div>
                  )}

                  {!isFetching && flatItems.length === 0 && (
                    <EmptyState message={`No results for "${query.trim()}"`} icon="⌕" />
                  )}

                  {!isFetching && flatItems.length > 0 && (
                    <div className="space-y-6">
                      {sections.map((section) => (
                        <Section key={section.key} title={section.title}>
                          {section.items.map((item) => {
                            const isActive = active?.id === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onMouseEnter={() => setActiveIndex(flatItems.findIndex((x) => x.id === item.id))}
                                onClick={() => go(item.href)}
                                className={[
                                  'w-full text-left apple-card px-3 py-2.5 transition-colors',
                                  isActive ? 'bg-muted' : 'hover:bg-muted',
                                ].join(' ')}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl border overflow-hidden shrink-0 flex items-center justify-center"
                                    style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
                                  >
                                    {item.image
                                      ? <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                      : <span className="text-[10px] font-black tracking-widest text-secondary">{item.badge}</span>
                                    }
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold truncate">{item.title}</div>
                                    {item.subtitle && <div className="text-xs text-secondary truncate mt-0.5">{item.subtitle}</div>}
                                  </div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary hidden sm:block">
                                    {item.badge}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </Section>
                      ))}

                      <div className="flex items-center justify-between pt-2">
                        <button onClick={() => { closeSearch(); navigate(`/search?q=${encodeURIComponent(query.trim())}`) }}
                          className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity"
                        >
                          View all results →
                        </button>
                        <div className="text-[10px] text-secondary">
                          Tip: press <span className="text-primary font-bold">/</span> anytime
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

