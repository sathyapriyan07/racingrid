export function Card({ children, className = '' }) {
  return <div className={`glass p-4 ${className}`}>{children}</div>
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-white/10 text-white/70',
    red: 'bg-f1red/20 text-f1red',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
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
      <div className="text-2xl font-black text-white">{value ?? '—'}</div>
      <div className="text-xs text-white/50 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  )
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="text-center py-16 text-white/30 text-sm">{message}</div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
