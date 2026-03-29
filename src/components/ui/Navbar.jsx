import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState, useRef, useEffect } from 'react'
import { Search, Menu, X, Shield, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_LINKS = ['Drivers', 'Teams', 'Circuits', 'Races', 'Standings', 'Compare']

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const searchRef = useRef(null)

  useEffect(() => { setMenuOpen(false); setSearchOpen(false) }, [location.pathname])
  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50) }, [searchOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
    setSearchOpen(false)
  }

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
          <button onClick={() => setSearchOpen(o => !o)} className="btn-icon w-8 h-8"><Search size={14} /></button>
          <button onClick={toggle} className="btn-icon w-8 h-8">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
          <button onClick={() => setMenuOpen(o => !o)} className="btn-icon w-8 h-8">{menuOpen ? <X size={15} /> : <Menu size={15} />}</button>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-4 pb-3"
            >
              <form onSubmit={handleSearch} className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search drivers, teams, races..."
                  className="input pl-8 py-2 text-sm"
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

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
            <div className="flex items-center">
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="open"
                    initial={{ width: 32, opacity: 0 }}
                    animate={{ width: 180, opacity: 1 }}
                    exit={{ width: 32, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSearch}
                    className="relative overflow-hidden"
                  >
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onBlur={() => { if (!query) setSearchOpen(false) }}
                      placeholder="Search..."
                      className="input pl-7 py-1 text-xs h-8 w-full rounded-xl"
                    />
                  </motion.form>
                ) : (
                  <motion.button key="closed" onClick={() => setSearchOpen(true)} className="btn-icon w-8 h-8">
                    <Search size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

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

