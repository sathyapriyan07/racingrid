import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, Badge } from '../components/ui'
import { Calendar, Trophy, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } }
}
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
}

export default function Home() {
  const { fetchRaces, fetchDrivers, fetchSeasons, fetchStandings, drivers, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [standings, setStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [racesData] = await Promise.all([fetchRaces(), fetchDrivers(), fetchSeasons()])
        setRaces(racesData)
        const allSeasons = useDataStore.getState().seasons
        if (allSeasons.length) {
          const s = await fetchStandings(allSeasons[0].id).catch(() => null)
          setStandings(s)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const currentDrivers = drivers.filter(d => d.is_active)
  const displayDrivers = currentDrivers.length ? currentDrivers : drivers.slice(0, 12)
  const latestRaces = races.slice(0, 10)

  if (loading) return <Spinner />

  return (
    <div className="space-y-12">

      {/* ── Cinematic Hero ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative overflow-hidden rounded-3xl noise-overlay"
        style={{ minHeight: 320 }}
      >
        {/* Background layers */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0a0008 0%, #0f0010 40%, #0a0a0f 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 80% at 15% 50%, rgba(225,6,0,0.18) 0%, transparent 60%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 50% 60% at 85% 30%, rgba(100,0,200,0.08) 0%, transparent 60%)',
        }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 p-8 md:p-14 flex flex-col justify-end" style={{ minHeight: 320 }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-f1red animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-f1red">Formula 1 Database</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-none mb-4" style={{ letterSpacing: '-0.05em' }}>
              <span className="text-white">F1</span>
              <span className="text-f1red">Base</span>
            </h1>
            <p className="text-base md:text-lg mb-8 max-w-md font-medium" style={{ color: 'rgba(245,245,247,0.5)' }}>
              The ultimate Formula 1 archive — races, drivers, teams, lap-by-lap replays.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/races" className="btn-primary text-sm px-6 py-2.5">Browse Races</Link>
              <Link to="/drivers" className="btn-ghost text-sm px-6 py-2.5">All Drivers</Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Latest Races carousel ── */}
      {latestRaces.length > 0 && (
        <motion.section variants={stagger} initial="initial" animate="animate">
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
            <h2 className="section-title flex items-center gap-2">
              <Calendar size={18} className="text-f1red" /> Latest Races
            </h2>
            <Link to="/races" className="text-xs font-semibold text-f1red hover:text-red-400 transition-colors flex items-center gap-0.5">
              See all <ChevronRight size={13} />
            </Link>
          </motion.div>
          <div className="scroll-row">
            {latestRaces.map((race, i) => (
              <motion.div key={race.id} variants={fadeUp}>
                <Link to={`/race/${race.id}`}>
                  <div
                    className="glass-hover p-5 flex flex-col gap-3"
                    style={{ width: 220 }}
                  >
                    <div className="flex items-center justify-between">
                      <Badge color="gray">R{race.round}</Badge>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {race.seasons?.year}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-sm leading-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
                        {race.name?.replace(' Grand Prix', '')}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{race.circuits?.name}</div>
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {race.date ? new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Drivers carousel ── */}
      {displayDrivers.length > 0 && (
        <motion.section variants={stagger} initial="initial" animate="animate">
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
            <h2 className="section-title flex items-center gap-2">
              <Trophy size={18} className="text-f1red" />
              {currentDrivers.length ? 'Current Drivers' : 'Drivers'}
            </h2>
            <Link to="/drivers" className="text-xs font-semibold text-f1red hover:text-red-400 transition-colors flex items-center gap-0.5">
              See all <ChevronRight size={13} />
            </Link>
          </motion.div>
          <div className="scroll-row">
            {displayDrivers.map(driver => (
              <motion.div key={driver.id} variants={fadeUp}>
                <Link to={`/driver/${driver.id}`}>
                  <div className="glass-hover flex flex-col items-center p-4 gap-3 text-center" style={{ width: 120 }}>
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                      {driver.image_url
                        ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover object-top" />
                        : <div className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: 'var(--text-muted)' }}>{driver.code || '?'}</div>
                      }
                    </div>
                    <div>
                      <div className="text-xs font-bold text-f1red">{driver.code || '—'}</div>
                      <div className="text-xs font-semibold mt-0.5 leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {driver.name.split(' ').pop()}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Standings preview ── */}
      {standings && (standings.drivers.length > 0 || standings.teams.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" /> {seasons[0]?.year} Standings
            </h2>
            <Link to="/standings" className="text-xs font-semibold text-f1red hover:text-red-400 transition-colors flex items-center gap-0.5">
              Full standings <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Drivers</p>
              <div className="space-y-3">
                {standings.drivers.slice(0, 5).map((row, i) => (
                  <Link key={row.driver?.id} to={`/driver/${row.driver?.id}`}
                    className="flex items-center gap-3 group">
                    <span className={`w-5 text-xs font-black shrink-0 ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}
                      style={{ color: i > 2 ? 'var(--text-muted)' : undefined }}>{i + 1}</span>
                    {row.driver?.image_url
                      ? <img src={row.driver.image_url} alt={row.driver.name} className="w-7 h-7 rounded-full object-cover object-top shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-white/8 shrink-0" />
                    }
                    <span className="text-sm flex-1 font-medium group-hover:text-f1red transition-colors" style={{ letterSpacing: '-0.01em' }}>
                      {row.driver?.name}
                    </span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {row.points.toFixed(0)}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Constructors</p>
              <div className="space-y-3">
                {standings.teams.slice(0, 5).map((row, i) => (
                  <Link key={row.team?.id} to={`/team/${row.team?.id}`}
                    className="flex items-center gap-3 group">
                    <span className={`w-5 text-xs font-black shrink-0 ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}
                      style={{ color: i > 2 ? 'var(--text-muted)' : undefined }}>{i + 1}</span>
                    {row.team?.logo_url
                      ? <img src={row.team.logo_url} alt={row.team.name} className="w-7 h-7 object-contain shrink-0" />
                      : <div className="w-7 h-7 rounded bg-white/8 shrink-0" />
                    }
                    <span className="text-sm flex-1 font-medium group-hover:text-f1red transition-colors" style={{ letterSpacing: '-0.01em' }}>
                      {row.team?.name}
                    </span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {row.points.toFixed(0)}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </motion.section>
      )}

      {/* ── Seasons ── */}
      {seasons.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="section-title mb-4">Seasons</h2>
          <div className="flex flex-wrap gap-2">
            {seasons.map(s => (
              <Link key={s.id} to={`/races?season=${s.id}`}>
                <span className="glass-hover px-5 py-2 text-sm font-bold hover:text-f1red transition-colors" style={{ letterSpacing: '-0.02em' }}>
                  {s.year}
                </span>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
