import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl skeleton ${className}`}
      style={{ ...style }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="apple-card p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="apple-card p-0 overflow-hidden">
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            {Array.from({ length: cols - 1 }).map((_, j) => (
              <Skeleton key={j} className="h-3 flex-1" style={{ maxWidth: `${60 + j * 20}px` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl animate-pulse" style={{ minHeight: 380, background: 'var(--bg-muted)' }}>
      <div className="absolute bottom-0 left-0 right-0 p-8 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  )
}

// ── Page transition wrapper ───────────────────────────────────────────────────
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={[
        'bg-card border border-border shadow-[var(--shadow)] rounded-3xl',
        hover
          ? 'cursor-pointer transition-all duration-200 ease-out will-change-transform hover:scale-[1.05] hover:shadow-glow-sm hover:border-accent/25'
          : 'transition-colors duration-200 hover:bg-muted',
        'p-5',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const styles = {
    gray:   { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    red:    { background: 'rgba(225,6,0,0.1)', color: '#E10600', border: '1px solid rgba(225,6,0,0.25)' },
    green:  { background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' },
    yellow: { background: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.25)' },
    blue:   { background: 'rgba(59,130,246,0.1)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.25)' },
  }
  return <span className="badge" style={styles[color] || styles.gray}>{children}</span>
}

// ── Spinner ───────────────────────────────────────────────────────────────────
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

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }) {
  return (
    <div className="bg-card border border-border shadow-[var(--shadow)] rounded-3xl p-4 text-center hover:bg-muted transition-colors">
      <div className="text-2xl font-black text-primary" style={{ letterSpacing: '-0.04em' }}>{value ?? '—'}</div>
      <div className="text-xs font-semibold mt-1 uppercase tracking-widest text-secondary">{label}</div>
      {sub && <div className="text-xs mt-0.5 text-secondary">{sub}</div>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No data available', icon = '—' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-3"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-muted text-secondary">{icon}</div>
      <p className="text-sm text-secondary">{message}</p>
    </motion.div>
  )
}

// ── ErrorState ────────────────────────────────────────────────────────────────
export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-red-500/10 text-f1red">!</div>
      <p className="text-sm text-secondary">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-xs">Retry</button>
      )}
    </motion.div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ className = '', wrapperClassName = '', children, ...props }) {
  return (
    <div className={['relative', wrapperClassName].join(' ')}>
      <select
        {...props}
        className={['input pr-10 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed', className].join(' ')}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
    </div>
  )
}

// ── SearchSelect ──────────────────────────────────────────────────────────────
export function SearchSelect({ value, onChange, options = [], placeholder = 'Search...', emptyLabel = 'No results', className = '', disabled = false }) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(() => options.find(o => o.value === value) || null, [options, value])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => `${o.label || ''} ${o.keywords || ''}`.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    const onDown = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={containerRef} className={['relative', className].join(' ')}>
      <input
        ref={inputRef}
        value={open ? query : (selected?.label || '')}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); setQuery('') }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
          if (e.key === 'Enter') { const f = filtered[0]; if (f) { onChange?.(f.value); setOpen(false); setQuery('') } }
        }}
        placeholder={selected?.label ? '' : placeholder}
        disabled={disabled}
        className="input pr-10 disabled:opacity-60 disabled:cursor-not-allowed"
        role="combobox"
        aria-expanded={open}
      />
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border shadow-[var(--shadow)]"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="max-h-72 overflow-auto py-1">
              {filtered.length === 0
                ? <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{emptyLabel}</div>
                : filtered.slice(0, 40).map(o => (
                  <button key={o.value} type="button"
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { onChange?.(o.value); setOpen(false); setQuery('') }}
                  >
                    <div className="font-semibold">{o.label}</div>
                    {o.subLabel && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.subLabel}</div>}
                  </button>
                ))
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-8 flex items-start justify-between gap-4 flex-wrap"
    >
      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary" style={{ letterSpacing: '-0.04em' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1.5 font-semibold text-secondary">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, actionLabel = 'See all' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="section-title">{title}</h2>
      {action && <button onClick={action} className="text-xs font-semibold text-accent hover:opacity-70 transition-opacity">{actionLabel} →</button>}
    </div>
  )
}
