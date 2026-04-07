import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../lib/withTimeout'
import { useAuthStore } from '../store/authStore'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function useAuthMosaicTiles() {
  const [tiles, setTiles] = useState([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [dRes, tRes] = await Promise.all([
          withTimeout(
            supabase
              .from('drivers')
              .select('id, name, hero_image_url')
              .not('hero_image_url', 'is', null)
              .limit(18),
            20_000,
            'Driver hero fetch timed out',
          ),
          withTimeout(
            supabase
              .from('teams')
              .select('id, name, hero_image_url')
              .not('hero_image_url', 'is', null)
              .limit(18),
            20_000,
            'Team hero fetch timed out',
          ),
        ])

        const drivers = (dRes?.data || []).map(d => ({ src: d.hero_image_url, alt: d.name || 'Driver' }))
        const teams = (tRes?.data || []).map(t => ({ src: t.hero_image_url, alt: t.name || 'Team' }))

        const combined = shuffle([...drivers, ...teams]).filter(t => !!t.src).slice(0, 12)
        if (!cancelled) setTiles(combined)
      } catch (e) {
        console.warn('Auth mosaic fetch failed:', e)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return tiles
}

function MobileAuthShell({ title, subtitle, children }) {
  const tiles = useAuthMosaicTiles()
  const grid = useMemo(() => {
    if (tiles.length) return tiles
    return Array.from({ length: 12 }).map((_, i) => ({ src: null, alt: `Tile ${i + 1}` }))
  }, [tiles])

  return (
    <div className="md:hidden min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Mosaic */}
      <div className="absolute inset-x-0 top-0 h-[64vh] pointer-events-none">
        <div className="absolute inset-0 px-4 pt-4">
          <div className="grid grid-cols-3 gap-3">
            {grid.map((t, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-muted/30"
                style={{ aspectRatio: '3 / 4', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}>
                {t.src ? (
                  <img
                    src={t.src}
                    alt={t.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/40" />
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Fade to black */}
        <div className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.92) 72%, rgba(0,0,0,1) 100%)',
          }}
        />
        {/* Side vignette */}
        <div className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 35%, transparent 0%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.92) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end">
        <Link to="/" className="absolute top-5 left-5 flex items-center gap-0.5">
          <span className="font-black text-lg tracking-tight text-white">Racin</span>
          <span className="font-black text-lg tracking-tight text-accent">Grid</span>
        </Link>

        <div
          className="px-5 pb-10 pt-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.96) 18%, rgba(0,0,0,1) 100%)',
          }}
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-black" style={{ letterSpacing: '-0.05em' }}>{title}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>

          <div className="mt-7">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopShell({ title, subtitle, children }) {
  return (
    <div className="hidden md:flex min-h-screen items-center justify-center px-4 relative" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(225,6,0,0.08) 0%, transparent 70%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="apple-card p-8 w-full max-w-sm relative z-10"
      >
        <Link to="/" className="flex items-center gap-0.5 mb-8">
          <span className="font-black text-2xl tracking-tight text-white">Racin</span>
          <span className="font-black text-2xl tracking-tight text-accent">Grid</span>
        </Link>

        <h1 className="text-2xl font-black mb-1" style={{ letterSpacing: '-0.04em' }}>{title}</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        {children}
      </motion.div>
    </div>
  )
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      toast.success('Account created')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="input" placeholder="you@example.com" required />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="input" placeholder="••••••••" required />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          className="input" placeholder="••••••••" required />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2" style={{ borderRadius: '0.875rem' }}>
        {loading ? 'Creating...' : 'Create Account'}
      </button>

      <div className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" className="text-accent font-semibold">Sign in</Link>
      </div>
    </form>
  )

  return (
    <>
      <MobileAuthShell title="Create account" subtitle="Join RacinGrid to access admin tools and more.">
        {form}
      </MobileAuthShell>
      <DesktopShell title="Create Account" subtitle="Create your RacinGrid account">
        {form}
      </DesktopShell>
    </>
  )
}
