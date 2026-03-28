import { Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Database, Upload, Users, Car, MapPin, Flag, BarChart2, Settings, Home } from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: BarChart2, exact: true },
  { to: '/admin/import', label: 'Import Data', icon: Upload },
  { to: '/admin/drivers', label: 'Drivers', icon: Users },
  { to: '/admin/teams', label: 'Teams', icon: Car },
  { to: '/admin/circuits', label: 'Circuits', icon: MapPin },
  { to: '/admin/races', label: 'Races', icon: Flag },
  { to: '/admin/sync', label: 'Sync Tools', icon: Database },
]

export default function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuthStore()
  const location = useLocation()

  if (loading) return null
  if (!user || !isAdmin()) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r flex flex-col" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-f1red font-black">F1</span>
            <span className="font-bold text-white">Base</span>
            <span className="text-xs text-white/30 ml-1">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== '/admin'
                ? true
                : location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-f1red/15 text-f1red' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-white transition-colors">
            <Home size={12} /> Back to Site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
