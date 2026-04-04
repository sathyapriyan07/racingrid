import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState, useEffect } from 'react'
import { Search, Menu, X, Shield, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'

const NAV_LINKS = ['Drivers', 'Teams', 'Circuits', 'Races', 'Standings', 'Championships', 'Compare']

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuthStore()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const openSearch = useUIStore(s => s.openSearch)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isActive = (path) => location.pathname === `/${path.toLowerCase()}`

  return (
    <>
      {/* Mobile navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border bg-base/70 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 h-12">
          <Link to="/" className="flex items-center gap-1 shrink-0">
            <span className="text-accent font-black text-lg tracking-tight">F1</span>
            <span className="font-bold text-lg tracking-tight text-primary">Base</span>
          </Link>
          <div className="flex-1" />
          <button onClick={openSearch} className="btn-icon w-8 h-8" aria-label="Search"><Search size={14} /></button>
          <button onClick={toggle} className="btn-icon w-8 h-8">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
          <button onClick={() => setMenuOpen(o => !o)} className="btn-icon w-8 h-8">{menuOpen ? <X size={15} /> : <Menu size={15} />}</button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border bg-base"
            >
              <div className="px-3 py-3 grid grid-cols-3 gap-1.5">
                {NAV_LINKS.map(item => (
                  <Link
                    key={item}
                    to={`/${item.toLowerCase()}`}
                    className={[
                      'flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-colors',
                      isActive(item) ? 'bg-accent/10 text-accent' : 'bg-muted text-secondary hover:text-primary hover:bg-card',
                    ].join(' ')}
                  >
                    {item}
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2.5 flex items-center gap-2 border-t border-border">
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-accent border border-accent/25 hover:bg-accent/10 transition-colors"
                  >
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

      {/* Desktop navbar (floating pill) */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden md:block fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl"
      >
        <div className="rounded-2xl border border-border px-4 h-12 flex items-center gap-2 bg-base/70 backdrop-blur-xl shadow-sm">
          <Link to="/" className="flex items-center gap-1 shrink-0 mr-1">
            <span className="text-accent font-black text-lg tracking-tight">F1</span>
            <span className="font-bold text-lg tracking-tight text-primary">Base</span>
          </Link>

          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map(item => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className={[
                  'px-2.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors',
                  'tracking-[-0.01em]',
                  isActive(item) ? 'bg-accent/10 text-accent' : 'text-secondary hover:text-primary hover:bg-muted',
                ].join(' ')}
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={openSearch} className="btn-icon w-8 h-8" aria-label="Search">
              <Search size={14} />
            </button>

            <button onClick={toggle} className="btn-icon w-8 h-8">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {isAdmin() && (
              <Link
                to="/admin"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-accent border border-accent/25 hover:bg-accent/10 whitespace-nowrap transition-colors"
              >
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
