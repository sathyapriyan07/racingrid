import { motion } from 'framer-motion'

export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`apple-card p-5 ${hover ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const styles = {
    gray:   'bg-white/8 text-white/60 border border-white/10',
    red:    'bg-f1red/15 text-f1red border border-f1red/25',
    green:  'bg-green-500/15 text-green-400 border border-green-500/25',
    yellow: 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/25',
    blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  }
  return (
    <span className={`badge ${styles[color] || styles.gray}`}>{children}</span>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-white/5" />
        <div className="absolute inset-0 rounded-full border-2 border-t-f1red border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="apple-card p-4 text-center">
      <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
        {value ?? '—'}
      </div>
      <div className="text-xs font-medium mt-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 text-xl">—</div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-8 flex items-start justify-between gap-4 flex-wrap"
    >
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  )
}

export function SectionHeader({ title, action, actionLabel = 'See all' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="section-title">{title}</h2>
      {action && (
        <button onClick={action} className="text-xs font-semibold text-f1red hover:text-red-400 transition-colors">
          {actionLabel} →
        </button>
      )}
    </div>
  )
}
