import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-12">
        {children}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1a1a24', color: '#fff', border: '1px solid #ffffff15', fontSize: 13 },
        }}
      />
    </div>
  )
}
