import { useEffect } from 'react'
import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'
import { useSettingsStore } from '../store/settingsStore'

export default function Layout({ children }) {
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <div className="min-h-screen relative bg-base text-primary">
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-16 pt-2">
        {children}
      </main>
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
