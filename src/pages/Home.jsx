import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, Card, Badge } from '../components/ui'
import { Calendar, Trophy, Zap } from 'lucide-react'

export default function Home() {
  const { fetchRaces, fetchDrivers, fetchSeasons, drivers, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchRaces().then(setRaces),
      fetchDrivers(),
      fetchSeasons(),
    ]).finally(() => setLoading(false))
  }, [])

  const latestRaces = races.slice(0, 6)
  const topDrivers = drivers.slice(0, 8)

  if (loading) return <Spinner />

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-f1red/20 via-dark-800 to-dark-900 border border-white/5 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-f1red/10 via-transparent to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-f1red" />
            <span className="text-xs text-f1red font-semibold uppercase tracking-widest">Formula 1 Database</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
            F1<span className="text-f1red">Base</span>
          </h1>
          <p className="text-white/50 mt-3 max-w-md text-sm md:text-base">
            The ultimate Formula 1 archive — races, drivers, teams, lap-by-lap replays.
          </p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Link to="/races" className="btn-primary">Browse Races</Link>
            <Link to="/drivers" className="btn-ghost">All Drivers</Link>
          </div>
        </div>
      </div>

      {/* Latest Races */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar size={16} className="text-f1red" /> Latest Races
          </h2>
          <Link to="/races" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
        </div>
        {latestRaces.length === 0 ? (
          <Card><p className="text-white/30 text-sm text-center py-4">No races yet. Import data via Admin Panel.</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {latestRaces.map(race => (
              <Link key={race.id} to={`/race/${race.id}`}>
                <div className="glass-hover p-4 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-white/40 mb-1">
                        Round {race.round} · {race.seasons?.year}
                      </div>
                      <div className="font-semibold text-sm group-hover:text-f1red transition-colors">{race.name}</div>
                      <div className="text-xs text-white/40 mt-1">{race.circuits?.name}</div>
                    </div>
                    <Badge color="gray">{race.date ? new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top Drivers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy size={16} className="text-f1red" /> Drivers
          </h2>
          <Link to="/drivers" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
        </div>
        {topDrivers.length === 0 ? (
          <Card><p className="text-white/30 text-sm text-center py-4">No drivers yet.</p></Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {topDrivers.map(driver => (
              <Link key={driver.id} to={`/driver/${driver.id}`}>
                <div className="glass-hover p-3 text-center group">
                  <div className="w-10 h-10 rounded-full bg-dark-600 mx-auto mb-2 overflow-hidden">
                    {driver.image_url
                      ? <img src={driver.image_url} alt={driver.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">{driver.code || '?'}</div>
                    }
                  </div>
                  <div className="text-xs font-bold text-f1red">{driver.code || '—'}</div>
                  <div className="text-xs text-white/60 truncate">{driver.name.split(' ').pop()}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Seasons */}
      {seasons.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Seasons</h2>
          <div className="flex flex-wrap gap-2">
            {seasons.map(s => (
              <Link key={s.id} to={`/races?season=${s.id}`}>
                <span className="glass-hover px-4 py-2 text-sm font-semibold hover:text-f1red transition-colors">{s.year}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
