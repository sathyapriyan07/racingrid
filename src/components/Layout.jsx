import Navbar from './ui/Navbar'
import { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

const pageTransition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
}

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(225,6,0,0.07) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <Navbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="relative z-10 max-w-7xl mx-auto px-4 pb-16"
          style={{ paddingTop: '0.5rem' }}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(20,20,32,0.95)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.875rem',
            fontSize: 13,
            fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
        }}
      />
    </div>
  )
}
