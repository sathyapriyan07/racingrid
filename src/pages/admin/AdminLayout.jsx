import { useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Database, Upload, Users, Car, MapPin, Flag, BarChart2, Home, Menu, X, Image } from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: BarChart2, exact: true },
  { to: '/admin/import', label: 'Import Data', icon: Upload },
  { to: '/admin/drivers', label: 'Drivers', icon: Users },
  { to: '/admin/teams', label: 'Teams', icon: Car },
  { to: '/admin/circuits', label: 'Circuits', icon: MapPin },
  { to: '/admin/races', label: 'Races', icon: Flag },
  { to: '/admin/media', label: 'Media & Icons', icon: Image },
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
    <div className="min-h-screen flex flex-col md:flex-row bg-base text-primary">
      {/* Mobile top bar */}
      <div className="md:hidden border-b border-border sticky top-0 z-40 bg-base/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-accent font-black">F1</span>
            <span className="font-bold text-primary">Base</span>
            <span className="text-xs ml-1 text-secondary">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            {currentItem && (
              <span className="text-xs font-semibold text-accent">{currentItem.label}</span>
            )}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-muted transition-colors"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {menuOpen && (
          <nav className="border-t border-border px-3 py-2 grid grid-cols-2 gap-1 bg-base">
            {navItems.map(item => {
              const active = isActive(item, location.pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active ? 'bg-accent/15 text-accent' : 'text-secondary hover:bg-muted hover:text-primary',
                  ].join(' ')}
                >
                  <item.icon size={14} />
                  {item.label}
                </Link>
              )
            })}
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors col-span-2 text-secondary hover:bg-muted hover:text-primary"
            >
              <Home size={14} /> Back to Site
            </Link>
          </nav>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-border flex-col sticky top-0 h-screen bg-surface">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-accent font-black">F1</span>
            <span className="font-bold text-primary">Base</span>
            <span className="text-xs ml-1 text-secondary">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item, location.pathname)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  active ? 'bg-accent/15 text-accent' : 'text-secondary hover:bg-muted hover:text-primary',
                ].join(' ')}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-secondary hover:bg-muted hover:text-primary"
          >
            <Home size={12} /> Back to Site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

