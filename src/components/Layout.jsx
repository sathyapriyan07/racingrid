import { useEffect } from 'react'
import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'
import { useSettingsStore } from '../store/settingsStore'
import { Link } from 'react-router-dom'
import GlobalSearchOverlay from '../features/search/GlobalSearchOverlay'

function Footer() {
  return (
    <footer className="border-t mt-16" style={{ borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="font-bold text-sm mb-3">
              <span style={{ color: 'var(--text-primary)' }}>F1</span>
              <span style={{ color: 'var(--accent)' }}>Base</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              The ultimate Formula 1 archive — races, drivers, teams and lap-by-lap replays.
            </p>
          </div>
          <div>
            <div className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Explore</div>
            <div className="space-y-2">
              {[['Races', '/races'], ['Drivers', '/drivers'], ['Teams', '/teams'], ['Circuits', '/circuits']].map(([label, to]) => (
                <Link key={to} to={to} className="block text-xs hover:text-f1red transition-colors" style={{ color: 'var(--text-secondary)' }}>{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Stats</div>
            <div className="space-y-2">
              {[['Standings', '/standings'], ['Championships', '/championships'], ['Compare', '/compare'], ['Search', '/search']].map(([label, to]) => (
                <Link key={to} to={to} className="block text-xs hover:text-f1red transition-colors" style={{ color: 'var(--text-secondary)' }}>{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>More</div>
            <div className="space-y-2">
              {[['Home', '/'], ['Login', '/login']].map(([label, to]) => (
                <Link key={to} to={to} className="block text-xs hover:text-f1red transition-colors" style={{ color: 'var(--text-secondary)' }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} F1Base. Not affiliated with Formula 1 or FOM.
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Built with love for F1 fans</span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout({ children }) {
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col">
      <Navbar />
      <GlobalSearchOverlay />
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-16 pt-2 flex-1 w-full">
        {children}
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '0.875rem',
            fontSize: 13,
            boxShadow: 'var(--shadow)',
          },
        }}
      />
    </div>
  )
}
