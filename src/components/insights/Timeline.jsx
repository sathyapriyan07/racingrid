import { motion } from 'framer-motion'

export default function Timeline({ items = [] }) {
  if (!items.length) return <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No timeline data</div>

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="apple-card px-4 py-3 flex items-start gap-3"
        >
          <div className="w-10 shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Lap</div>
            <div className="text-sm font-black tabular-nums">{item.lap ?? '—'}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {item.badge}
              <div className="text-sm font-semibold truncate">{item.title}</div>
            </div>
            {item.description && <div className="text-xs mt-1 text-secondary">{item.description}</div>}
          </div>
          {item.right && <div className="text-xs text-secondary shrink-0">{item.right}</div>}
        </motion.div>
      ))}
    </div>
  )
}

