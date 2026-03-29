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

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
    }
  }

  const isActive = (path) => location.pathname === `/${path.toLowerCase()}`

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl"
      >
        <div
          className="rounded-2xl border px-4 h-12 flex items-center gap-3"
          style={{
            background: 'rgba(13,13,20,0.75)',
            borderColor: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0 mr-2">
            <span className="text-f1red font-black text-lg tracking-tight leading-none">F1</span>
            <span className="font-bold text-lg tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>Base</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_LINKS.map(item => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200"
                style={{
                  color: isActive(item) ? '#E10600' : 'var(--text-secondary)',
                  background: isActive(item) ? 'rgba(225,6,0,0.1)' : 'transparent',
                  letterSpacing: '-0.01em',
                }}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Search */}
            <AnimatePresence mode="wait">
              {searchOpen ? (
                <motion.form
                  key="search-open"
                  initial={{ width: 32, opacity: 0 }}
                  animate={{ width: 200, opacity: 1 }}
                  exit={{ width: 32, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  onSubmit={handleSearch}
                  className="relative overflow-hidden"
                >
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onBlur={() => { if (!query) setSearchOpen(false) }}
                    placeholder="Search F1Base..."
                    className="input pl-7 py-1.5 text-xs h-8"
                    style={{ borderRadius: '0.75rem' }}
                  />
                </motion.form>
              ) : (
                <motion.button
                  key="search-closed"
                  onClick={() => setSearchOpen(true)}
                  className="btn-icon w-8 h-8"
                >
                  <Search size={14} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Theme toggle */}
            <button onClick={toggle} className="btn-icon w-8 h-8 hidden md:flex">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Admin */}
            {isAdmin() && (
              <Link to="/admin" className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-f1red border border-f1red/25 hover:bg-f1red/10 transition-colors">
                <Shield size={11} /> Admin
              </Link>
            )}

            {/* Auth */}
            {user ? (
              <button onClick={signOut} className="hidden md:flex btn-ghost text-xs py-1.5 px-3 h-8">
                Sign Out
              </button>
            ) : (
              <Link to="/login" className="hidden md:flex btn-primary text-xs py-1.5 px-3 h-8">
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden btn-icon w-8 h-8"
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-2 rounded-2xl border p-3 grid grid-cols-3 gap-1"
              style={{
                background: 'rgba(13,13,20,0.92)',
                borderColor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {NAV_LINKS.map(item => (
                <Link
                  key={item}
                  to={`/${item.toLowerCase()}`}
                  className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    color: isActive(item) ? '#E10600' : 'var(--text-secondary)',
                    background: isActive(item) ? 'rgba(225,6,0,0.1)' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {item}
                </Link>
              ))}
              <div className="col-span-3 flex items-center gap-2 mt-1 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <button onClick={toggle} className="btn-icon w-8 h-8 flex-shrink-0">
                  {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                </button>
                {isAdmin() && (
                  <Link to="/admin" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-f1red border border-f1red/25">
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
      </motion.nav>

      {/* Spacer */}
      <div className="h-16" />
    </>
  )
}
