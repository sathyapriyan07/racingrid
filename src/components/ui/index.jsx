import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

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

export function Select({ className = '', wrapperClassName = '', children, ...props }) {
  return (
    <div className={['relative', wrapperClassName].join(' ')}>
      <select
        {...props}
        className={[
          'input pr-10 appearance-none cursor-pointer',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          className,
        ].join(' ')}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
      />
    </div>
  )
}

export function SearchSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Search...',
  emptyLabel = 'No results',
  className = '',
  disabled = false,
}) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(() => options.find(o => o.value === value) || null, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => {
      const hay = `${o.label || ''} ${o.keywords || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const showValue = open ? query : (selected?.label || '')

  return (
    <div ref={containerRef} className={['relative', className].join(' ')}>
      <input
        ref={inputRef}
        value={showValue}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); setQuery('') }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur?.() }
          if (e.key === 'Enter') {
            const first = filtered[0]
            if (first) {
              onChange?.(first.value)
              setOpen(false)
              setQuery('')
            }
          }
        }}
        placeholder={selected?.label ? '' : placeholder}
        disabled={disabled}
        className={[
          'input pr-10',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        ].join(' ')}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
      />

      {open && (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border shadow-[var(--shadow)]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="max-h-72 overflow-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{emptyLabel}</div>
            ) : (
              filtered.slice(0, 40).map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange?.(o.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-raised)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="font-medium">{o.label}</div>
                  {o.subLabel && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.subLabel}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
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
