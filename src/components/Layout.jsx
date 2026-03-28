import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-12">
        {children}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    </div>
  )
}
