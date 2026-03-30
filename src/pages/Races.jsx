import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { Spinner, PageHeader, EmptyState, Badge, SearchSelect } from '../components/ui'

export default function Races() {
  const { fetchRaces, fetchSeasons, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonId = searchParams.get('season')

  useEffect(() => { fetchSeasons().catch(console.error) }, [])

  useEffect(() => {
    setLoading(true)
    fetchRaces(seasonId || null).then(setRaces).catch(console.error).finally(() => setLoading(false))
  }, [seasonId])

  const seasonOptions = [
    { value: '', label: 'All seasons', keywords: 'all' },
    ...seasons
      .slice()
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .map(s => ({ value: s.id, label: String(s.year), keywords: String(s.year) }))
  ]

  const filtered = races.filter(r => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const hay = `${r.name || ''} ${r.circuits?.name || ''} ${r.seasons?.year || ''} ${r.round || ''}`.toLowerCase()
    return hay.includes(q)
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Races"
        subtitle={`${filtered.length} races`}
      >
        <div className="flex gap-2 flex-wrap items-center">
          <div className="w-36">
            <SearchSelect
              value={seasonId || ''}
              onChange={(val) => val ? setSearchParams({ season: val }) : setSearchParams({})}
              options={seasonOptions}
              placeholder="Season..."
            />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search races..."
            className="input w-48"
          />
        </div>
      </PageHeader>

      {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No races found." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(race => (
            <Link key={race.id} to={`/race/${race.id}`}>
              <div className="apple-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge color="gray">Round {race.round}</Badge>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{race.seasons?.year}</span>
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight" style={{ letterSpacing: '-0.02em' }}>{race.name}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{race.circuits?.name}</div>
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
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
