import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-base)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(225,6,0,0.06) 0%, transparent 70%)',
        zIndex: 0,
      }} />
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-16" style={{ paddingTop: '0.5rem' }}>
        {children}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '0.875rem',
            fontSize: 13,
          },
        }}
      />
    </div>
  )
}
