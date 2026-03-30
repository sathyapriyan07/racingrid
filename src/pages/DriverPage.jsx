import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { supabase } from '../lib/supabase'
import { Spinner, Card, Badge } from '../components/ui'
import PerformanceChart from '../components/charts/PerformanceChart'
import { Trophy, ChevronDown, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

function Icon({ settingKey, emoji, className = '' }) {
  const url = useSettingsStore(s => s.settings[settingKey])
  return url
    ? <img src={url} alt="" className={`inline-block w-4 h-4 object-contain ${className}`} />
    : <span>{emoji}</span>
}

function SeasonCard({ year, races, isChamp, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const wins = races.filter(r => r.position === 1).length
  const pts = races.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)

  return (
    <div className="apple-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center gap-3 transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Season {year}</span>
        {isChamp && (
          <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">🏆 Champion</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{races.length} races</span>
          {wins > 0 && <span className="text-xs font-semibold text-f1red">{wins}W</span>}
          <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pts.toFixed(0)} pts</span>
          <ChevronDown
            size={14}
            style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <table className="w-full table-fixed">
            <thead>
              <tr style={{ fontSize: 10, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2 pl-5 w-[52%]">Race</th>
                <th className="text-center py-2 w-12 whitespace-nowrap">Pos</th>
                <th className="text-center py-2 w-14 whitespace-nowrap hidden sm:table-cell">Grid</th>
                <th className="text-center py-2 w-12 whitespace-nowrap">Pts</th>
                <th className="text-left py-2 pr-5 w-[36%]">Team</th>
              </tr>
            </thead>
            <tbody>
              {races.map(r => (
                <tr key={r.id} className="hover:bg-muted transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 pl-5">
                    <Link to={`/race/${r.race_id}`} className="text-xs font-medium hover:text-f1red transition-colors block truncate" title={r.races?.name || ''}>
                      {r.races?.name?.replace('Grand Prix', 'GP') || '—'}
                    </Link>
                  </td>
                  <td className="py-2 text-center tabular-nums whitespace-nowrap">
                    <span className={`text-xs font-bold ${r.position === 1 ? 'pos-1' : r.position <= 3 ? 'pos-2' : ''}`}
                      style={{ color: r.position > 3 ? 'var(--text-secondary)' : undefined }}>
                      {r.position ?? '—'}
                    </span>
                  </td>
                  <td className="py-2 text-center text-xs tabular-nums whitespace-nowrap hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{r.grid ?? '—'}</td>
                  <td className="py-2 text-center text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{r.points ?? 0}</td>
                  <td className="py-2 pr-5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {r.teams?.logo_url && <img src={r.teams.logo_url} alt={r.teams.name} className="h-4 w-auto object-contain shrink-0" loading="lazy" />}
                      <span className="text-xs hidden sm:inline truncate min-w-0 flex-1" style={{ color: 'var(--text-muted)' }}>{r.teams?.name || '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'performance', label: 'Performance' },
  { id: 'records', label: 'Records' },
  { id: 'biography', label: 'Biography' },
  { id: 'championships', label: 'Championships' },
]

function normalizeWebsiteUrl(url) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizeSocialUrl(platform, value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const v = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (v.includes('instagram.com') || v.includes('twitter.com') || v.includes('x.com')) return `https://${v}`

  if (platform === 'instagram') return `https://instagram.com/${v}`
  return `https://x.com/${v}`
}

export default function DriverPage() {
  const { id } = useParams()
  const { fetchDriver, fetchDriverStats, fetchAllChampionships } = useDataStore()
  const [driver, setDriver] = useState(null)
  const [results, setResults] = useState([])
  const [champYears, setChampYears] = useState([])
  const [poleRows, setPoleRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('results')

  useEffect(() => {
    Promise.all([
      fetchDriver(id),
      fetchDriverStats(id),
      fetchAllChampionships(),
      supabase
        .from('qualifying_results')
        .select('race_id, races(circuit_id, circuits(id, name))')
        .eq('driver_id', id)
        .eq('position', 1)
        .then(({ data }) => data || []),
    ])
      .then(([d, r, champs, p]) => {
        setDriver(d)
        setResults(r || [])
        setChampYears(champs.driverChamps[id] || [])
        setPoleRows(p || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const wins = results.filter(r => r.position === 1).length
  const podiums = results.filter(r => r.position <= 3).length
  const poles = results.filter(r => r.grid === 1).length
  const totalPoints = results.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)

  const chartData = results.map(r => ({
    name: r.races?.name?.replace('Grand Prix', 'GP') || '?',
    points: parseFloat(r.points) || 0,
  }))

  const seasonGroups = results.reduce((acc, r) => {
    const year = r.races?.seasons?.year || 'Unknown'
    if (!acc[year]) acc[year] = []
    acc[year].push(r)
    return acc
  }, {})

  const seasonSummaries = Object.entries(seasonGroups)
    .sort(([a], [b]) => b - a)
    .map(([year, races]) => {
      const pts = races.reduce((s, r) => s + (parseFloat(r.points) || 0), 0)
      const w = races.filter(r => r.position === 1).length
      const pod = races.filter(r => r.position <= 3).length
      const isChamp = champYears.includes(Number(year))
      const teamMap = {}
      races.forEach(r => { if (r.teams?.name) teamMap[r.teams.name] = r.teams })
      return { year, pts, wins: w, podiums: pod, races: races.length, isChamp, teams: Object.values(teamMap) }
    })

  const circuitRecords = useMemo(() => {
    const map = {}

    for (const r of results) {
      const circuitId = r?.races?.circuit_id
      const circuitName = r?.races?.circuits?.name
      if (!circuitId) continue

      if (!map[circuitId]) map[circuitId] = { circuitId, circuitName: circuitName || '—', wins: 0, podiums: 0, poles: 0, races: 0 }
      map[circuitId].races += 1
      if (r.position === 1) map[circuitId].wins += 1
      if (r.position && r.position <= 3) map[circuitId].podiums += 1
    }

    for (const p of poleRows) {
      const circuitId = p?.races?.circuit_id
      const circuitName = p?.races?.circuits?.name
      if (!circuitId) continue
      if (!map[circuitId]) map[circuitId] = { circuitId, circuitName: circuitName || '—', wins: 0, podiums: 0, poles: 0, races: 0 }
      map[circuitId].poles += 1
    }

    return Object.values(map)
      .sort((a, b) =>
        (b.wins - a.wins) ||
        (b.podiums - a.podiums) ||
        (b.poles - a.poles) ||
        (b.races - a.races) ||
        String(a.circuitName).localeCompare(String(b.circuitName))
      )
      .slice(0, 30)
  }, [poleRows, results])

  if (loading) return <Spinner />
  if (!driver) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Driver not found.</div>

  const activeTabs = [
    ...TABS.filter(t => t.id !== 'championships' || champYears.length > 0),
    ...(!driver.biography ? TABS.filter(t => t.id === 'biography') : []),
  ].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)

  return (
    <div className="space-y-6">
      {/* ── Banner ── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 320 }}>
        {/* Hero image full-bleed */}
        {driver.hero_image_url
          ? <img src={driver.hero_image_url} alt={driver.name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          : <div className="absolute inset-0 bg-surface" />
        }
        {driver.hero_image_url
          ? <div className="absolute inset-0 bg-gradient-to-t from-base/90 to-transparent" />
          : <div className="absolute inset-0 bg-radial-glow from-accent/10 via-transparent to-transparent" />
        }
      </div>

      {/* ── Driver Info (below hero) ── */}
      <div className="apple-card p-6 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            {driver.code && <Badge color="red">{driver.code}</Badge>}
            <h1 className="text-3xl md:text-4xl font-black" style={{ letterSpacing: '-0.04em' }}>{driver.name}</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
            {driver.nationality && (
              <span className="flex items-center gap-1.5 font-medium">
                {driver.flag_url ? <img src={driver.flag_url} alt={driver.nationality} className="h-4 w-auto rounded-sm" /> : <Icon settingKey="icon_flag" emoji="🌍" />}
                {driver.nationality}
              </span>
            )}
            {driver.dob && (
              <span className="flex items-center gap-1.5 font-medium">
                <Icon settingKey="icon_birthday" emoji="🎂" />
                {new Date(driver.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto sm:justify-end">
          {driver.instagram_url && (
            <a
              href={normalizeSocialUrl('instagram', driver.instagram_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap"
              aria-label="Instagram"
              title="Instagram"
            >
              <img src="/Instagram_icon.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Instagram
            </a>
          )}
          {driver.twitter_url && (
            <a
              href={normalizeSocialUrl('twitter', driver.twitter_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap"
              aria-label="Twitter"
              title="Twitter"
            >
              <img src="/twitter%20logo.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              Twitter
            </a>
          )}
          {driver.website_url && (
            <a
              href={normalizeWebsiteUrl(driver.website_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 whitespace-nowrap"
            >
              <ExternalLink size={12} /> Visit website
            </a>
          )}
          <Link to={`/compare?a=${id}`} className="btn-ghost text-xs py-1.5 px-3">Compare</Link>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Wins', value: wins },
          { label: 'Podiums', value: podiums },
          { label: 'Poles', value: poles },
          { label: 'Points', value: totalPoints.toFixed(0) },
        ].map(m => (
          <div key={m.label} className="apple-card p-4 text-center">
            <div className="metric-value">{m.value}</div>
            <div className="metric-label mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        {activeTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
            {t.id === 'championships' && <Trophy size={11} className="inline mr-1" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Performance ── */}
      {tab === 'performance' && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Points Per Race</p>
          <PerformanceChart data={chartData} dataKey="points" label="Points" />
        </Card>
      )}

      {tab === 'records' && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>Circuit Records</span>
          </div>
          {circuitRecords.length === 0 ? (
            <p className="text-sm px-5 py-6" style={{ color: 'var(--text-muted)' }}>No circuit records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b" style={{ fontSize: 10, borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left py-2 pl-5">Circuit</th>
                    <th className="text-right py-2 whitespace-nowrap">Wins</th>
                    <th className="text-right py-2 whitespace-nowrap">Podiums</th>
                    <th className="text-right py-2 pr-5 whitespace-nowrap">Poles</th>
                  </tr>
                </thead>
                <tbody>
                  {circuitRecords.map(row => (
                    <tr key={row.circuitId} className="border-b transition-colors" style={{ borderColor: 'var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td className="py-2.5 pl-5">
                        <Link to={`/circuit/${row.circuitId}`} className="hover:text-f1red transition-colors font-medium" style={{ fontSize: 13 }}>
                          {row.circuitName}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.wins}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.podiums}</td>
                      <td className="py-2.5 pr-5 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.poles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Biography ── */}
      {tab === 'biography' && (
        <Card>
          {driver.biography
            ? <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{driver.biography}</p>
            : <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No biography added yet.</p>
          }
        </Card>
      )}

      {/* ── Results ── */}
      {tab === 'results' && (
        <div className="space-y-3">
          {results.length === 0
            ? <Card><p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No race results for this driver.</p></Card>
            : Object.keys(seasonGroups).sort((a, b) => b - a).map((year, i) => (
              <SeasonCard
                key={year}
                year={year}
                races={seasonGroups[year]}
                isChamp={champYears.includes(Number(year))}
                defaultOpen={i === 0}
              />
            ))
          }
        </div>
      )}

      {/* ── Championships ── */}
      {tab === 'championships' && (
        <div className="space-y-4">
          {champYears.length > 0 && (
            <div className="apple-card p-6 flex items-center gap-5 flex-wrap"
              style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(5,5,8,0) 100%)', borderColor: 'rgba(234,179,8,0.2)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(234,179,8,0.12)' }}>
                <Icon settingKey="icon_trophy" emoji="🏆" className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(234,179,8,0.7)' }}>World Champion</div>
                <div className="text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>{champYears.sort().join(' · ')}</div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {champYears.length} World Championship{champYears.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seasonSummaries.map(s => (
              <div key={s.year} className="apple-card p-5"
                style={s.isChamp ? { borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.04)' } : {}}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black" style={{ letterSpacing: '-0.04em' }}>{s.year}</span>
                    {s.isChamp && (
                      <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">
                        <Icon settingKey="icon_trophy" emoji="🏆" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.races} races</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Pts', value: s.pts.toFixed(0) },
                    { label: 'Wins', value: s.wins },
                    { label: 'Pods', value: s.podiums },
                    { label: 'Races', value: s.races },
                  ].map(m => (
                    <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                      <div className="text-base font-black" style={{ letterSpacing: '-0.04em' }}>{m.value}</div>
                      <div className="text-xs font-medium uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {s.teams.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.teams.map(team => (
                      <div key={team.name}>
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.name} className="h-5 w-auto object-contain" loading="lazy" />
                          : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.name}</span>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
