import { motion } from 'framer-motion'

export function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={[
        'bg-card border border-border shadow-[var(--shadow)] rounded-3xl',
        'hover:bg-muted transition-colors',
        hover ? 'cursor-pointer' : '',
        'p-5',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const styles = {
    gray: { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    red: { background: 'rgba(225,6,0,0.1)', color: '#E10600', border: '1px solid rgba(225,6,0,0.25)' },
    green: { background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' },
    yellow: { background: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.25)' },
    blue: { background: 'rgba(59,130,246,0.1)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.25)' },
  }
  return (
    <span className="badge" style={styles[color] || styles.gray}>{children}</span>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />
        <div className="absolute inset-0 rounded-full border-2 border-t-f1red border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="bg-card border border-border shadow-[var(--shadow)] rounded-3xl p-4 text-center hover:bg-muted transition-colors">
      <div className="text-2xl font-black text-primary" style={{ letterSpacing: '-0.04em' }}>
        {value ?? '—'}
      </div>
      <div className="text-xs font-medium mt-1 uppercase tracking-widest text-secondary">
        {label}
      </div>
      {sub && <div className="text-xs mt-0.5 text-secondary">{sub}</div>}
    </div>
  )
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-muted text-secondary">—</div>
      <p className="text-sm text-secondary">{message}</p>
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
        <h1 className="text-3xl font-black tracking-tight text-primary" style={{ letterSpacing: '-0.04em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1.5 font-medium text-secondary">{subtitle}</p>
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
        <button onClick={action} className="text-xs font-semibold text-accent hover:opacity-70">
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

