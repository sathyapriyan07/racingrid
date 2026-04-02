import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, PageHeader, EmptyState, Badge, SearchSelect } from '../components/ui'

export default function Races() {
  const { fetchRaces, fetchSeasons, seasons } = useDataStore()
  const [races, setRaces] = useState([])
  const [podiums, setPodiums] = useState({}) // raceId -> [{position, driver}]
  const [loading, setLoading] = useState(() => !useDataStore.getState().seasons.length)
  const [query, setQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonId = searchParams.get('season')

  useEffect(() => { fetchSeasons().catch(console.error) }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchRaces(seasonId || null).then(async data => {
      if (cancelled) return
      setRaces(data)
      if (!data.length) { setLoading(false); return }
      const raceIds = data.map(r => r.id)
      const { data: results } = await supabase
        .from('results')
        .select('race_id, position, drivers(id, name, code, image_url)')
        .in('race_id', raceIds)
        .lte('position', 3)
        .order('position')
      if (cancelled) return
      const map = {}
      for (const r of results || []) {
        if (!map[r.race_id]) map[r.race_id] = []
        if (map[r.race_id].length < 3) map[r.race_id].push(r)
      }
      setPodiums(map)
      setLoading(false)
    }).catch(err => { console.error(err); if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
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
          {filtered.map(race => {
            const top3 = podiums[race.id] || []
            const medals = ['🥇', '🥈', '🥉']
            return (
              <Link key={race.id} to={`/race/${race.id}`}>
                <div className="apple-card p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <Badge color="gray">Round {race.round}</Badge>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{race.seasons?.year}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight" style={{ letterSpacing: '-0.02em' }}>{race.name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{race.circuits?.name}</div>
                  </div>
                  {top3.length > 0 ? (
                    <div className="flex gap-3 mt-auto pt-2 border-t justify-around" style={{ borderColor: 'var(--border)' }}>
                      {top3.map((r, i) => (
                        <div key={r.drivers?.id || i} className="flex flex-col items-center gap-1">
                          <span className="text-xs">{medals[i]}</span>
                          {r.drivers?.image_url
                            ? <img src={r.drivers.image_url} alt={r.drivers.name} className="w-10 h-10 rounded-full object-cover object-top" />
                            : <div className="w-10 h-10 rounded-full bg-muted" />
                          }
                          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                            {r.drivers?.code || r.drivers?.name?.split(' ').pop() || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-auto pt-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      {race.date ? new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
