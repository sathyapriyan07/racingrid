import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState, Badge } from '../components/ui'

export default function Races() {
  const { fetchRaces, fetchSeasons, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonId = searchParams.get('season')

  useEffect(() => {
    fetchSeasons()
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchRaces(seasonId || null)
      .then(setRaces)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [seasonId])

  return (
    <div>
      <PageHeader title="Races" subtitle={`${races.length} races`}>
        <select
          value={seasonId || ''}
          onChange={e => setSearchParams(e.target.value ? { season: e.target.value } : {})}
          className="input w-36"
        >
          <option value="">All Seasons</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.year}</option>)}
        </select>
      </PageHeader>

      {loading ? <Spinner /> : races.length === 0 ? <EmptyState message="No races found." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {races.map(race => (
            <Link key={race.id} to={`/race/${race.id}`}>
              <div className="glass-hover p-4 group">
                <div className="flex items-start justify-between mb-2">
                  <Badge color="gray">Round {race.round}</Badge>
                  <span className="text-xs text-white/30">{race.seasons?.year}</span>
                </div>
                <div className="font-semibold group-hover:text-f1red transition-colors">{race.name}</div>
                <div className="text-xs text-white/40 mt-1">{race.circuits?.name}</div>
                <div className="text-xs text-white/30 mt-1">
                  {race.date ? new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
