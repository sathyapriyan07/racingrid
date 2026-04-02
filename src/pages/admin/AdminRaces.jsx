import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner, Select } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, PlayCircle, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

// Run in Supabase SQL Editor:
// ALTER TABLE race_highlights ADD COLUMN IF NOT EXISTS session text DEFAULT 'race'
//   CHECK (session IN ('fp1','fp2','fp3','qualifying','race'));

const SESSIONS = [
  { value: 'fp1', label: 'FP1' },
  { value: 'fp2', label: 'FP2' },
  { value: 'fp3', label: 'FP3' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'race', label: 'Race' },
]

function getYoutubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function HighlightsEditor({ race }) {
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newSession, setNewSession] = useState('race')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('race_highlights').select('*').eq('race_id', race.id).order('created_at')
      .then(({ data }) => setHighlights(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [race.id])

  const addHighlight = async () => {
    if (!newUrl.trim()) return
    const vid = getYoutubeId(newUrl.trim())
    if (!vid) return toast.error('Invalid YouTube URL')
    setSaving(true)
    const { data, error } = await supabase.from('race_highlights').insert({
      race_id: race.id,
      title: newTitle.trim() || null,
      youtube_url: newUrl.trim(),
      session: newSession,
    }).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setHighlights(h => [...h, data])
    setNewUrl('')
    setNewTitle('')
    setSaving(false)
    toast.success('Highlight added')
  }

  const removeHighlight = async (id) => {
    const { error } = await supabase.from('race_highlights').delete().eq('id', id)
    if (error) return toast.error(error.message)
    setHighlights(h => h.filter(x => x.id !== id))
    toast.success('Removed')
  }

  return (
    <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
      <td colSpan={5} className="px-4 py-3">
        {loading ? <Spinner /> : (
          <div className="space-y-3">
            {/* Group by session */}
            {SESSIONS.map(sess => {
              const items = highlights.filter(h => (h.session || 'race') === sess.value)
              if (!items.length) return null
              return (
                <div key={sess.value}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{sess.label}</div>
                  {items.map(h => {
                    const vid = getYoutubeId(h.youtube_url)
                    return (
                      <div key={h.id} className="flex items-center gap-2 text-xs mb-1">
                        {vid && <img src={`https://img.youtube.com/vi/${vid}/default.jpg`} alt="" className="w-12 h-8 object-cover rounded shrink-0" />}
                        <span className="flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{h.title || h.youtube_url}</span>
                        <a href={h.youtube_url} target="_blank" rel="noopener noreferrer" className="text-f1red hover:opacity-70 shrink-0"><PlayCircle size={13} /></a>
                        <button onClick={() => removeHighlight(h.id)} className="shrink-0 hover:text-f1red transition-colors" style={{ color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Add new */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <select value={newSession} onChange={e => setNewSession(e.target.value)}
                className="input py-1.5 text-xs sm:w-32">
                {SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Title (optional)" className="input py-1.5 text-xs sm:w-36" />
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="YouTube URL" className="input py-1.5 text-xs flex-1"
                onKeyDown={e => e.key === 'Enter' && addHighlight()} />
              <button onClick={addHighlight} disabled={saving || !newUrl.trim()}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-f1red/20 text-f1red text-xs font-semibold shrink-0">
                {saving ? '...' : <><Plus size={12} /> Add</>}
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function AdminRaces() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      let q = supabase.from('races').select('*, seasons(year)').order('date', { ascending: false })
      if (seasonId) q = q.eq('season_id', seasonId)
      const { data, error } = await q
      if (error) throw error
      setData(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.from('seasons').select('*').order('year', { ascending: false })
      .then(({ data }) => setSeasons(data || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    let q = supabase.from('races').select('*, seasons(year)').order('date', { ascending: false })
    if (seasonId) q = q.eq('season_id', seasonId)
    q.then(({ data, error }) => {
      if (cancelled) return
      if (error) console.error(error)
      else setData(data || [])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [seasonId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Races</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={12} /> Import
        </Link>
      </div>
      <div className="glass p-4">
        <Select value={seasonId} onChange={e => setSeasonId(e.target.value)} className="max-w-xs mb-4">
          <option value="">All Seasons</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.year}</option>)}
        </Select>

        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-secondary border-b border-border">
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Date</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Round</th>
                  <th className="text-left pb-2 pr-4 hidden md:table-cell">Season</th>
                  <th className="text-right pb-2">Highlights</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <>
                    <tr key={row.id} className="border-b border-border hover:bg-muted">
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.date || '—'}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.round || '—'}</td>
                      <td className="py-2 pr-4 hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>{row.seasons?.year || '—'}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                          className="flex items-center gap-1 ml-auto px-2 py-1 rounded hover:bg-muted transition-colors text-xs"
                          style={{ color: expandedId === row.id ? '#E10600' : 'var(--text-muted)' }}>
                          <PlayCircle size={11} />
                          Highlights
                          {expandedId === row.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === row.id && <HighlightsEditor race={row} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
