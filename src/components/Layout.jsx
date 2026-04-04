import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import GlobalSearchOverlay from '../features/search/GlobalSearchOverlay'
import { useUIStore } from '../store/uiStore'

const FOOTER_LINKS = {
  Explore: [['Races', '/races'], ['Drivers', '/drivers'], ['Teams', '/teams'], ['Circuits', '/circuits']],
  Stats:   [['Standings', '/standings'], ['Championships', '/championships'], ['Compare', '/compare'], ['Search', '/search']],
  More:    [['Home', '/'], ['Login', '/login']],
}

function Footer() {
  return (
    <footer className="relative border-t border-border mt-20">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-0.5 mb-3">
              <span className="font-black text-base text-primary">Racin</span>
              <span className="font-black text-base text-accent">Grid</span>
            </div>
            <p className="text-xs leading-relaxed text-secondary">
              The ultimate Formula 1 archive — races, drivers, teams and lap-by-lap replays.
            </p>
            {/* Social placeholder */}
            <div className="flex gap-2 mt-4">
              {['🏎️', '🏁', '⚡'].map((e, i) => (
                <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                  {e}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3 text-secondary">{heading}</div>
              <div className="space-y-2">
                {links.map(([label, to]) => (
                  <Link key={to} to={to}
                    className="block text-xs text-secondary hover:text-accent transition-colors duration-200">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-secondary">
            © {new Date().getFullYear()} RacinGrid. Not affiliated with Formula 1 or FOM.
          </span>
          <span className="text-xs text-secondary">Built for racing fans, by racing fans ❤️</span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout({ children }) {
  const accent = useUIStore(s => s.accent)

  useEffect(() => {
    const root = document.documentElement
    if (accent) root.style.setProperty('--accent', accent)
    else root.style.removeProperty('--accent')
  }, [accent])

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col">
      <Navbar />
      <GlobalSearchOverlay />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 max-w-7xl mx-auto px-4 pb-16 pt-2 flex-1 w-full"
      >
        {children}
      </motion.main>
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
