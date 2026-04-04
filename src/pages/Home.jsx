import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/ui'
import {
  Calendar, Trophy, ChevronRight, ChevronLeft,
  PlayCircle, TrendingUp, Zap, Star, Flag, ArrowRight
} from 'lucide-react'

/* ── Stagger animation helpers ── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

/* ── Next Race Countdown ── */
function NextRaceBar({ races }) {
  const [idx, setIdx] = useState(0)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!races.length) return null
  const race = races[idx]
  const raceDate = race.date ? new Date(race.date) : null
  const diff = raceDate ? raceDate - now : null
  const days = diff > 0 ? Math.floor(diff / 86400000) : null
  const hrs  = diff > 0 ? Math.floor((diff % 86400000) / 3600000) : null
  const mins = diff > 0 ? Math.floor((diff % 3600000) / 60000) : null
  const city = race.circuits?.location || race.name?.replace(' Grand Prix', '').replace(' GP', '')

  return (
    <motion.div {...fadeUp(0.1)}
      className="relative overflow-hidden rounded-2xl border border-border"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Red accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="live-dot" />
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">Next Race</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-black uppercase tracking-wide truncate block" style={{ letterSpacing: '-0.01em' }}>
            {city?.toUpperCase()} · Round {race.round}
          </span>
          <span className="text-[10px] text-secondary">{race.name}</span>
        </div>
        {days !== null && (
          <div className="flex items-center gap-3 shrink-0">
            {[{ v: days, l: 'D' }, { v: hrs, l: 'H' }, { v: mins, l: 'M' }].map(({ v, l }) => (
              <div key={l} className="text-center">
                <div className="text-lg font-black tabular-nums leading-none" style={{ letterSpacing: '-0.04em' }}>
                  {String(v).padStart(2, '0')}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-secondary">{l}</div>
              </div>
            ))}
          </div>
        )}
        {race.circuits?.layout_image && (
          <img src={race.circuits.layout_image} alt="" className="h-10 w-auto object-contain opacity-60 shrink-0 hidden sm:block" />
        )}
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-30">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => setIdx(i => Math.min(races.length - 1, i + 1))} disabled={idx === races.length - 1}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-30">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Insight Card ── */
function InsightTile({ icon: Icon, label, value, sub, tone = 'neutral', to, delay = 0 }) {
  const tones = {
    neutral: { border: 'var(--border)', bg: 'var(--bg-card)', icon: 'var(--text-secondary)' },
    gold:    { border: 'rgba(234,179,8,0.3)',  bg: 'rgba(234,179,8,0.05)',  icon: '#F59E0B' },
    green:   { border: 'rgba(34,197,94,0.3)',  bg: 'rgba(34,197,94,0.05)',  icon: '#22C55E' },
    red:     { border: 'rgba(225,6,0,0.3)',    bg: 'rgba(225,6,0,0.05)',    icon: '#E10600' },
    blue:    { border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.05)', icon: '#3B82F6' },
  }
  const t = tones[tone] || tones.neutral
  const inner = (
    <motion.div {...fadeUp(delay)}
      className="rounded-2xl border p-4 flex flex-col gap-3 h-full transition-all duration-300 hover:-translate-y-1"
      style={{ background: t.bg, borderColor: t.border, boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Icon size={15} style={{ color: t.icon }} />
        </div>
        {to && <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="text-xl font-black leading-tight" style={{ letterSpacing: '-0.03em' }}>{value || '—'}</div>
        {sub && <div className="text-xs mt-1 text-secondary truncate">{sub}</div>}
      </div>
    </motion.div>
  )
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner
}

/* ── Driver Card (carousel) ── */
function DriverCard({ driver }) {
  return (
    <Link to={`/driver/${driver.id}`}>
      <div className="driver-card" style={{ width: 140 }}>
        <div className="relative h-28 bg-muted overflow-hidden">
          {driver.image_url
            ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover object-top" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-secondary">{driver.code || '?'}</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-black text-accent tracking-widest">{driver.code}</span>
          </div>
        </div>
        <div className="p-3">
          <div className="text-xs font-bold leading-tight truncate">{driver.name.split(' ').pop()}</div>
          {driver.teams?.name && (
            <div className="text-[10px] text-secondary mt-0.5 truncate">{driver.teams.name}</div>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ── Race Card (carousel) ── */
function RaceCard({ race }) {
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
  return (
    <Link to={`/race/${race.id}`}>
      <div className="race-card p-4 flex flex-col gap-3" style={{ width: 200 }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(225,6,0,0.1)', color: '#E10600', border: '1px solid rgba(225,6,0,0.2)' }}>
            R{race.round}
          </span>
          <span className="text-[10px] text-secondary">{race.seasons?.year}</span>
        </div>
        <div>
          <div className="font-black text-sm leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {race.name?.replace(' Grand Prix', '')}
          </div>
          <div className="text-[11px] text-secondary mt-0.5 truncate">{race.circuits?.name}</div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] text-secondary">{fmtDate(race.date)}</span>
          <ChevronRight size={12} className="text-secondary" />
        </div>
      </div>
    </Link>
  )
}

/* ── Highlight Card ── */
function HighlightCard({ h }) {
  const vid = h.youtube_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1]
  if (!vid) return null
  return (
    <a href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer"
      className="race-card overflow-hidden block" style={{ width: 260 }}>
      <div className="relative">
        <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={h.title || 'Highlight'}
          className="w-full object-cover" style={{ aspectRatio: '16/9' }} loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      </div>
      <div className="p-3">
        {h.title && <div className="text-xs font-semibold leading-snug line-clamp-2">{h.title}</div>}
        <div className="text-[10px] mt-1 text-secondary truncate">
          {h.races?.name?.replace(' Grand Prix', ' GP')}{h.races?.seasons?.year ? ` · ${h.races.seasons.year}` : ''}
        </div>
      </div>
    </a>
  )
}

/* ── Section Header ── */
function SectionHead({ icon: Icon, title, to, delay = 0 }) {
  return (
    <motion.div {...fadeUp(delay)} className="flex items-center justify-between mb-5">
      <h2 className="flex items-center gap-2 text-xl font-black" style={{ letterSpacing: '-0.03em' }}>
        <Icon size={18} className="text-accent" />
        {title}
      </h2>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-xs font-semibold text-accent hover:opacity-70 transition-opacity">
          See all <ChevronRight size={13} />
        </Link>
      )}
    </motion.div>
  )
}

/* ── Standings Row ── */
function StandingRow({ row, i, type }) {
  const to = type === 'driver' ? `/driver/${row.driver?.id}` : `/team/${row.team?.id}`
  const img = type === 'driver' ? row.driver?.image_url : row.team?.logo_url
  const name = type === 'driver' ? row.driver?.name : row.team?.name
  const posClass = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-secondary'
  return (
    <Link to={to} className="flex items-center gap-3 group py-2 px-1 rounded-xl hover:bg-muted transition-colors">
      <span className={`w-5 text-xs font-black shrink-0 ${posClass}`}>{i + 1}</span>
      <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {img
          ? <img src={img} alt={name} className="w-full h-full object-cover object-top" loading="lazy" />
          : <span className="text-[9px] font-black text-secondary">{name?.slice(0, 2)}</span>
        }
      </div>
      <span className="text-sm flex-1 font-medium group-hover:text-accent transition-colors truncate" style={{ letterSpacing: '-0.01em' }}>
        {name}
      </span>
      <span className="text-xs font-black tabular-nums text-secondary">{row.points?.toFixed(0)}</span>
    </Link>
  )
}

/* ── Skeleton loaders ── */
function HeroSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ minHeight: 480, background: 'var(--bg-muted)' }}>
      <div className="h-full flex flex-col justify-end p-10 gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-4 w-56" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function CarouselSkeleton({ count = 5, w = 200, h = 120 }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="rounded-2xl shrink-0" style={{ width: w, height: h }} />
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN HOME PAGE
══════════════════════════════════════════════════════════════════ */
export default function Home() {
  const { fetchRaces, fetchDrivers, fetchSeasons, fetchStandings, drivers, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [upcomingRaces, setUpcomingRaces] = useState([])
  const [highlights, setHighlights] = useState([])
  const [standings, setStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const heroRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [racesData] = await Promise.all([fetchRaces(), fetchDrivers(), fetchSeasons()])
        if (cancelled) return
        setRaces(racesData || [])

        const today = new Date().toISOString().slice(0, 10)
        const [{ data: upcoming }, { data: hl }] = await Promise.all([
          supabase.from('races')
            .select('*, circuits(name, location, country, layout_image), seasons(year)')
            .gte('date', today).order('date', { ascending: true }).limit(5),
          supabase.from('race_highlights')
            .select('*, races(id, name, seasons(year))')
            .order('created_at', { ascending: false }).limit(12),
        ])
        if (cancelled) return
        setUpcomingRaces(upcoming || [])
        setHighlights(hl || [])

        const allSeasons = useDataStore.getState().seasons
        if (allSeasons.length) {
          const s = await fetchStandings(allSeasons[0].id).catch(() => null)
          if (!cancelled) setStandings(s)
        }
      } catch (err) { console.error(err) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const currentDrivers = drivers.filter(d => d.is_active)
  const displayDrivers = (currentDrivers.length ? currentDrivers : drivers).slice(0, 16)
  const latestRaces = races.slice(0, 12)

  /* ── Hero data: latest race with a winner ── */
  const heroRace = races.find(r => r.date && new Date(r.date) <= new Date()) || races[0]

  /* ── Insight data ── */
  const topDriver = standings?.drivers?.[0]
  const biggestMover = standings?.drivers?.reduce((best, row) => {
    const pts = parseFloat(row.points) || 0
    return pts > (parseFloat(best?.points) || 0) ? row : best
  }, null)

  return (
    <div className="space-y-14">

      {/* ══ CINEMATIC HERO ══ */}
      {loading ? <HeroSkeleton /> : (
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="hero-cinematic noise-overlay"
          style={{ minHeight: 480 }}
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/assets/hero.png"
              alt="F1 Hero"
              className="w-full h-full object-cover object-center"
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>

          {/* Layered gradients */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(225,6,0,0.18) 0%, transparent 40%)',
          }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
          }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 60%)',
          }} />

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-14" style={{ minHeight: 480 }}>
            {/* Season badge */}
            <motion.div {...fadeUp(0.1)} className="flex items-center gap-2 mb-5">
              <div className="live-dot" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                {seasons[0]?.year || 'Formula 1'} Season
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1 {...fadeUp(0.2)}
              className="text-6xl md:text-8xl font-black leading-none mb-4"
              style={{ letterSpacing: '-0.05em' }}
            >
              <span className="text-white">Racin</span>
              <span className="text-gradient-red">Grid</span>
            </motion.h1>

            <motion.p {...fadeUp(0.3)} className="text-base md:text-lg mb-8 max-w-lg font-medium text-secondary leading-relaxed">
              The ultimate Formula 1 archive — races, drivers, teams, lap-by-lap replays and deep analytics.
            </motion.p>

            {/* CTAs */}
            <motion.div {...fadeUp(0.4)} className="flex gap-3 flex-wrap">
              {heroRace && (
                <Link to={`/race/${heroRace.id}`}
                  className="btn-primary text-sm px-6 py-3 flex items-center gap-2">
                  <Flag size={14} /> View Latest Race
                </Link>
              )}
              <Link to="/drivers" className="btn-ghost text-sm px-6 py-3 flex items-center gap-2">
                <Star size={14} /> Explore Drivers
              </Link>
              <Link to="/standings" className="btn-ghost text-sm px-6 py-3 flex items-center gap-2">
                <Trophy size={14} /> Standings
              </Link>
            </motion.div>

            {/* Hero race info pill */}
            {heroRace && (
              <motion.div {...fadeUp(0.5)} className="mt-6 inline-flex items-center gap-3 self-start">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Flag size={11} className="text-accent" />
                  <span className="text-xs font-semibold text-white/80">
                    {heroRace.name?.replace(' Grand Prix', ' GP')} · {heroRace.seasons?.year}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ══ NEXT RACE BAR ══ */}
      {upcomingRaces.length > 0 && <NextRaceBar races={upcomingRaces} />}

      {/* ══ INSIGHTS STRIP ══ */}
      {!loading && (topDriver || biggestMover) && (
        <section>
          <SectionHead icon={Zap} title="Season Insights" delay={0} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InsightTile
              icon={Trophy} label="Championship Leader" tone="gold" delay={0.05}
              value={topDriver?.driver?.code || topDriver?.driver?.name?.split(' ').pop() || '—'}
              sub={topDriver ? `${topDriver.points?.toFixed(0)} pts` : ''}
              to={topDriver?.driver?.id ? `/driver/${topDriver.driver.id}` : undefined}
            />
            <InsightTile
              icon={TrendingUp} label="Top Constructor" tone="blue" delay={0.1}
              value={standings?.teams?.[0]?.team?.name?.split(' ').pop() || '—'}
              sub={standings?.teams?.[0] ? `${standings.teams[0].points?.toFixed(0)} pts` : ''}
              to={standings?.teams?.[0]?.team?.id ? `/team/${standings.teams[0].team.id}` : undefined}
            />
            <InsightTile
              icon={Star} label="Latest Race" tone="red" delay={0.15}
              value={heroRace?.name?.replace(' Grand Prix', '')?.replace(' GP', '') || '—'}
              sub={heroRace ? `Round ${heroRace.round} · ${heroRace.seasons?.year}` : ''}
              to={heroRace ? `/race/${heroRace.id}` : undefined}
            />
            <InsightTile
              icon={Zap} label="Active Drivers" tone="green" delay={0.2}
              value={displayDrivers.length || '—'}
              sub="On the grid"
              to="/drivers"
            />
          </div>
        </section>
      )}

      {/* ══ HIGHLIGHTS ══ */}
      {loading ? (
        <section>
          <SectionHead icon={PlayCircle} title="Latest Highlights" />
          <CarouselSkeleton count={4} w={260} h={160} />
        </section>
      ) : highlights.length > 0 && (
        <section>
          <SectionHead icon={PlayCircle} title="Latest Highlights" delay={0} />
          <motion.div {...fadeUp(0.1)} className="snap-row">
            {highlights.map(h => <HighlightCard key={h.id} h={h} />)}
          </motion.div>
        </section>
      )}

      {/* ══ LATEST RACES ══ */}
      {loading ? (
        <section>
          <SectionHead icon={Calendar} title="Latest Races" />
          <CarouselSkeleton count={5} w={200} h={130} />
        </section>
      ) : latestRaces.length > 0 && (
        <section>
          <SectionHead icon={Calendar} title="Latest Races" to="/races" delay={0} />
          <motion.div {...fadeUp(0.1)} className="snap-row">
            {latestRaces.map(race => <RaceCard key={race.id} race={race} />)}
          </motion.div>
        </section>
      )}

      {/* ══ DRIVERS ══ */}
      {loading ? (
        <section>
          <SectionHead icon={Star} title="Drivers" />
          <CarouselSkeleton count={6} w={140} h={160} />
        </section>
      ) : displayDrivers.length > 0 && (
        <section>
          <SectionHead icon={Star} title={currentDrivers.length ? 'Current Drivers' : 'Drivers'} to="/drivers" delay={0} />
          <motion.div {...fadeUp(0.1)} className="snap-row">
            {displayDrivers.map(driver => <DriverCard key={driver.id} driver={driver} />)}
          </motion.div>
        </section>
      )}

      {/* ══ STANDINGS PREVIEW ══ */}
      {!loading && standings && (standings.drivers?.length > 0 || standings.teams?.length > 0) && (
        <section>
          <SectionHead icon={Trophy} title={`${seasons[0]?.year || ''} Standings`} to="/standings" delay={0} />
          <motion.div {...fadeUp(0.1)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Drivers */}
            <div className="rounded-3xl border border-border p-5" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Drivers</p>
                <Link to="/standings" className="text-[10px] font-semibold text-accent hover:opacity-70 transition-opacity">
                  Full table →
                </Link>
              </div>
              <div className="space-y-0.5">
                {standings.drivers.slice(0, 6).map((row, i) => (
                  <StandingRow key={row.driver?.id || i} row={row} i={i} type="driver" />
                ))}
              </div>
            </div>
            {/* Constructors */}
            <div className="rounded-3xl border border-border p-5" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Constructors</p>
                <Link to="/standings" className="text-[10px] font-semibold text-accent hover:opacity-70 transition-opacity">
                  Full table →
                </Link>
              </div>
              <div className="space-y-0.5">
                {standings.teams.slice(0, 6).map((row, i) => (
                  <StandingRow key={row.team?.id || i} row={row} i={i} type="team" />
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      )}

    </div>
  )
}
