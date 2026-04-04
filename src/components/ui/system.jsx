import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './index.jsx'

export function Section({ title, subtitle, action, actionLabel = 'Action', children }) {
  return (
    <section className="space-y-3">
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {title && <h2 className="text-xl font-bold tracking-tight">{title}</h2>}
            {subtitle && <p className="text-sm mt-1 text-secondary">{subtitle}</p>}
          </div>
          {action && (
            <Button variant="ghost" size="sm" onClick={action}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] px-4 py-10"
          style={{ background: 'var(--overlay-dark)' }}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Modal'}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto w-full max-w-xl rounded-3xl border shadow-[var(--shadow)] overflow-hidden"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(18px)' }}
          >
            {title && (
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="text-sm font-bold">{title}</div>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] px-4 pb-6 pt-20"
          style={{ background: 'var(--overlay-dark)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto w-full max-w-xl rounded-3xl border shadow-[var(--shadow)] overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="text-sm font-bold">{title || 'Menu'}</div>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

