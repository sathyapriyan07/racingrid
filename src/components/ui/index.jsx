export function Card({ children, className = '' }) {
  return <div className={`glass p-4 ${className}`}>{children}</div>
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/70',
    red:    'bg-f1red/20 text-f1red',
    green:  'bg-green-500/20 text-green-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    blue:   'bg-blue-500/20 text-blue-400',
  }
  return <span className={`badge ${colors[color] || colors.gray}`}>{children}</span>
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-f1red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="glass p-4 text-center">
      <div className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>{message}</div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
