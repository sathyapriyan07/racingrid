import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'
import { Search, Menu, X, Shield, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggle } = useTheme()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-f1red font-black text-xl tracking-tight">F1</span>
          <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>Base</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 ml-4">
          {['Drivers', 'Teams', 'Circuits', 'Races', 'Standings'].map(item => (
            <Link key={item} to={`/${item.toLowerCase()}`}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              {item}
            </Link>
          ))}
          <Link to="/compare"
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            Compare
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-xs ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="input pl-8 py-1.5 text-xs"
            />
          </div>
        </form>

        <div className="hidden md:flex items-center gap-2">
          <button onClick={toggle} className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-muted)' }} title="Toggle theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {isAdmin() && (
            <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-f1red border border-f1red/30 rounded-lg hover:bg-f1red/10 transition-colors">
              <Shield size={12} /> Admin
            </Link>
          )}
          {user ? (
            <button onClick={signOut} className="btn-ghost text-xs py-1.5">Sign Out</button>
          ) : (
            <Link to="/login" className="btn-primary text-xs py-1.5">Sign In</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggle} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ color: 'var(--text-primary)' }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-2" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}>
          {['drivers', 'teams', 'circuits', 'races', 'standings', 'compare'].map(item => (
            <Link key={item} to={`/${item}`} onClick={() => setMenuOpen(false)}
              className="capitalize text-sm text-white/70 hover:text-white py-1">
              {item}
            </Link>
          ))}
          {isAdmin() && <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm text-f1red py-1">Admin Panel</Link>}
          {user
            ? <button onClick={() => { signOut(); setMenuOpen(false) }} className="text-sm text-white/70 text-left py-1">Sign Out</button>
            : <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm text-white py-1">Sign In</Link>
          }
        </div>
      )}
    </nav>
  )
}
