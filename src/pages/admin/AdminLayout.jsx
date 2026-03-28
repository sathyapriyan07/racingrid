import { useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Database, Upload, Users, Car, MapPin, Flag, BarChart2, Home, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: BarChart2, exact: true },
  { to: '/admin/import', label: 'Import Data', icon: Upload },
  { to: '/admin/drivers', label: 'Drivers', icon: Users },
  { to: '/admin/teams', label: 'Teams', icon: Car },
  { to: '/admin/circuits', label: 'Circuits', icon: MapPin },
  { to: '/admin/races', label: 'Races', icon: Flag },
  { to: '/admin/sync', label: 'Sync Tools', icon: Database },
]

function isActive(item, pathname) {
  if (item.exact) return pathname === item.to
  return pathname.startsWith(item.to) && item.to !== '/admin' || pathname === item.to
}

export default function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuthStore()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) return null
  if (!user || !isAdmin()) return <Navigate to="/login" replace />

  const currentItem = navItems.find(i => isActive(i, location.pathname))

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg-base)' }}>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden border-b sticky top-0 z-40"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-f1red font-black">F1</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Base</span>
            <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            {currentItem && (
              <span className="text-xs font-semibold text-f1red">{currentItem.label}</span>
            )}
            <button onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {menuOpen && (
          <nav className="border-t px-3 py-2 grid grid-cols-2 gap-1"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
            {navItems.map(item => {
              const active = isActive(item, location.pathname)
              return (
                <Link key={item.to} to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-f1red/15 text-f1red' : 'hover:bg-white/5'
                  }`}
                  style={{ color: active ? undefined : 'var(--text-secondary)' }}>
                  <item.icon size={14} />
                  {item.label}
                </Link>
              )
            })}
            <Link to="/" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors col-span-2"
              style={{ color: 'var(--text-muted)' }}>
              <Home size={14} /> Back to Site
            </Link>
          </nav>
        )}
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-52 shrink-0 border-r flex-col sticky top-0 h-screen"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-f1red font-black">F1</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Base</span>
            <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item, location.pathname)
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-f1red/15 text-f1red' : 'hover:bg-white/5'
                }`}
                style={{ color: active ? undefined : 'var(--text-secondary)' }}>
                <item.icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Home size={12} /> Back to Site
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
