import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState, useEffect } from 'react'
import { Search, Menu, X, Shield, Sun, Moon, Command } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'

const NAV_LINKS = ['Drivers', 'Teams', 'Circuits', 'Races', 'Standings', 'Championships', 'Compare']

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuthStore()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggle } = useTheme()
  const openSearch = useUIStore(s => s.openSearch)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSearch])

  const isActive = (path) => location.pathname === `/${path.toLowerCase()}`

  return (
    <>
      {/* ── Mobile navbar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border"
        style={{
          background: scrolled ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'background 300ms ease',
        }}>
        <div className="flex items-center gap-2 px-4 h-12">
          <Link to="/" className="flex items-center gap-0.5 shrink-0">
            <span className="font-black text-lg tracking-tight text-white">F1</span>
            <span className="font-black text-lg tracking-tight text-accent">Base</span>
          </Link>
          <div className="flex-1" />
          <button onClick={openSearch} className="btn-icon w-8 h-8" aria-label="Search">
            <Search size={14} />
          </button>
          <button onClick={toggle} className="btn-icon w-8 h-8">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setMenuOpen(o => !o)} className="btn-icon w-8 h-8">
            {menuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden border-t border-border"
              style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
            >
              <div className="px-3 py-3 grid grid-cols-3 gap-1.5">
                {NAV_LINKS.map(item => (
                  <Link key={item} to={`/${item.toLowerCase()}`}
                    className={[
                      'flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                      isActive(item)
                        ? 'bg-accent/15 text-accent border border-accent/25'
                        : 'bg-white/5 text-secondary hover:text-primary hover:bg-white/10 border border-transparent',
                    ].join(' ')}>
                    {item}
                  </Link>
                ))}
              </div>
              <div className="px-4 py-3 flex items-center gap-2 border-t border-border">
                {isAdmin() && (
                  <Link to="/admin"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-accent border border-accent/25 hover:bg-accent/10 transition-colors">
                    <Shield size={11} /> Admin
                  </Link>
                )}
                <div className="ml-auto">
                  {user
                    ? <button onClick={signOut} className="btn-ghost text-xs py-1.5 px-3">Sign Out</button>
                    : <Link to="/login" className="btn-primary text-xs py-1.5 px-3">Sign In</Link>
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop floating pill navbar ── */}
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden md:block fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl"
      >
        <div
          className="rounded-2xl border px-4 h-12 flex items-center gap-2 transition-all duration-300"
          style={{
            background: scrolled ? 'rgba(0,0,0,0.88)' : 'rgba(10,10,10,0.7)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: scrolled ? 'rgba(255,255,255,0.1)' : 'var(--border)',
            boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-0.5 shrink-0 mr-2">
            <span className="font-black text-lg tracking-tight text-white">F1</span>
            <span className="font-black text-lg tracking-tight text-accent">Base</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5 flex-1">
            {NAV_LINKS.map(item => {
              const active = isActive(item)
              return (
                <Link key={item} to={`/${item.toLowerCase()}`}
                  className={[
                    'relative px-2.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors duration-200',
                    active ? 'text-primary' : 'text-secondary hover:text-primary hover:bg-white/5',
                  ].join(' ')}>
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative z-10">{item}</span>
                </Link>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Search with shortcut hint */}
            <button onClick={openSearch}
              className="flex items-center gap-2 px-3 h-8 rounded-xl border border-border text-secondary hover:text-primary hover:bg-white/5 transition-all duration-200 text-xs"
              aria-label="Search">
              <Search size={13} />
              <span className="hidden lg:flex items-center gap-1 text-[10px] text-secondary/60">
                <Command size={10} />K
              </span>
            </button>

            <button onClick={toggle} className="btn-icon w-8 h-8">
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {isAdmin() && (
              <Link to="/admin"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-accent border border-accent/25 hover:bg-accent/10 whitespace-nowrap transition-colors">
                <Shield size={11} /> Admin
              </Link>
            )}

            {user
              ? <button onClick={signOut} className="btn-ghost text-xs py-1.5 px-3 h-8 whitespace-nowrap">Sign Out</button>
              : <Link to="/login" className="btn-primary text-xs py-1.5 px-3 h-8 whitespace-nowrap">Sign In</Link>
            }
          </div>
        </div>
      </motion.nav>

      <div className="h-14 md:h-16" />
    </>
  )
}
