import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, Card, Badge } from '../components/ui'
import { Calendar, Trophy, ChevronRight, ChevronLeft } from 'lucide-react'

function NextRaceBar({ races }) {
  const [idx, setIdx] = useState(0)
  if (!races.length) return null
  const race = races[idx]
  const fp1 = race.fp1_date
  const raceDate = race.date
  const startDate = fp1 || raceDate
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : null
  const dateRange = startDate && raceDate && startDate !== raceDate
    ? `${fmtDate(startDate)} - ${fmtDate(raceDate)}`
    : fmtDate(raceDate) || '—'
  const city = race.circuits?.location || race.circuits?.name?.split(' ')[0] || race.name?.replace(' Grand Prix', '').replace(' GP', '')

  return (
    <div className="apple-card px-5 py-4 flex items-center gap-4" style={{ background: 'var(--bg-surface)' }}>
      {/* Left: flag + label */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {race.circuits?.country
            ? <span className="text-base" title={race.circuits.country}>🏁</span>
            : <span className="text-base">🏁</span>
          }
          <span className="text-xs font-black uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
            Next: <span style={{ color: 'var(--text-primary)' }}>{city?.toUpperCase()}</span>
          </span>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          Round {race.round}: {race.name}
        </div>
      </div>

      {/* Center: date range */}
      <div className="hidden sm:block text-sm font-black uppercase tracking-widest shrink-0" style={{ letterSpacing: '0.1em' }}>
        {dateRange}
      </div>

      {/* Right: circuit layout + nav */}
      <div className="flex items-center gap-3 shrink-0">
        {race.circuits?.layout_image && (
          <img src={race.circuits.layout_image} alt={race.circuits.name} className="h-10 w-auto object-contain opacity-80" />
        )}
        <div className="flex gap-1.5">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors"
            style={{ borderColor: 'var(--border)', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)', background: 'var(--bg-raised)' }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setIdx(i => Math.min(races.length - 1, i + 1))}
            disabled={idx === races.length - 1}
            className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors"
            style={{ borderColor: 'var(--border)', color: idx === races.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', background: 'var(--bg-raised)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { fetchRaces, fetchDrivers, fetchSeasons, fetchStandings, drivers, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [upcomingRaces, setUpcomingRaces] = useState([])
  const [standings, setStandings] = useState(null)
  const [loading, setLoading] = useState(() => {
    const s = useDataStore.getState()
    return !s.drivers.length || !s.seasons.length
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [racesData] = await Promise.all([fetchRaces(), fetchDrivers(), fetchSeasons()])
        if (cancelled) return
        setRaces(racesData)
        // fetch upcoming races (future dates)
        const today = new Date().toISOString().slice(0, 10)
        const { data: upcoming } = await supabase
          .from('races')
          .select('*, circuits(name, location, country, layout_image), seasons(year)')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(5)
        if (!cancelled) setUpcomingRaces(upcoming || [])
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
  const displayDrivers = currentDrivers.length ? currentDrivers : drivers.slice(0, 12)
  const latestRaces = races.slice(0, 10)

  if (loading) return <Spinner />

  return (
    <div className="space-y-12">

      {/* ── Cinematic Hero ── */}
      <div
        className="relative overflow-hidden rounded-3xl noise-overlay bg-surface border border-border shadow-[var(--shadow)]"
        style={{ minHeight: 320 }}
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-surface" />
        <div className="absolute inset-0 bg-radial-glow from-accent/15 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base/90 to-transparent" />

        <div className="relative z-10 p-8 md:p-14 flex flex-col justify-end" style={{ minHeight: 320 }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Formula 1 Database</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-none mb-4" style={{ letterSpacing: '-0.05em' }}>
              <span className="text-primary">F1</span>
              <span className="text-accent">Base</span>
            </h1>
            <p className="text-base md:text-lg mb-8 max-w-md font-medium text-secondary">
              The ultimate Formula 1 archive — races, drivers, teams, lap-by-lap replays.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/races" className="btn-primary text-sm px-6 py-2.5">Browse Races</Link>
              <Link to="/drivers" className="btn-ghost text-sm px-6 py-2.5">All Drivers</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Next Race Bar ── */}
      {upcomingRaces.length > 0 && <NextRaceBar races={upcomingRaces} />}

      {/* ── Latest Races carousel ── */}
      {latestRaces.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title flex items-center gap-2">
              <Calendar size={18} className="text-f1red" /> Latest Races
            </h2>
            <Link to="/races" className="text-xs font-semibold text-f1red hover:text-red-400 transition-colors flex items-center gap-0.5">
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="scroll-row">
            {latestRaces.map((race, i) => (
              <div key={race.id}>
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Drivers carousel ── */}
      {displayDrivers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title flex items-center gap-2">
              <Trophy size={18} className="text-f1red" />
              {currentDrivers.length ? 'Current Drivers' : 'Drivers'}
            </h2>
            <Link to="/drivers" className="text-xs font-semibold text-f1red hover:text-red-400 transition-colors flex items-center gap-0.5">
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="scroll-row">
            {displayDrivers.map(driver => (
              <div key={driver.id}>
                <Link to={`/driver/${driver.id}`}>
                  <div className="glass-hover flex flex-col items-center p-4 gap-3 text-center" style={{ width: 120 }}>
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted shrink-0">
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Standings preview ── */}
      {standings && (standings.drivers.length > 0 || standings.teams.length > 0) && (
        <section>
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
                      : <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
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
                      : <div className="w-7 h-7 rounded bg-muted shrink-0" />
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
        </section>
      )}

    </div>
  )
}
