import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { resolveImageSrc } from '../../lib/resolveImageSrc'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Image, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageEditRow from './ImageEditRow'

function toIntOrNull(v) {
  const trimmed = String(v ?? '').trim()
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

function toFloatOrNull(v) {
  const trimmed = String(v ?? '').trim()
  if (!trimmed) return null
  const n = Number.parseFloat(trimmed)
  return Number.isFinite(n) ? n : null
}

function LayoutThumb({ name, value }) {
  const [broken, setBroken] = useState(false)
  const src = resolveImageSrc(value) || (typeof value === 'string' ? value.trim() : '')

  if (!src || broken) {
    return (
      <div className="w-12 h-8 rounded bg-muted flex items-center justify-center text-secondary">
        <ImagePlus size={12} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-12 h-8 object-contain bg-muted rounded"
      onError={() => setBroken(true)}
    />
  )
}

export default function AdminCircuits() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null) // `${id}-layout` or `${id}-hero`
  const [detailsDraft, setDetailsDraft] = useState(null)

  const showDbError = (error) => {
    const code = error?.code
    const msg = String(error?.message || '')
    if (code === '42703' || code === 'PGRST204' || msg.toLowerCase().includes('does not exist')) {
      toast.error('Database schema is missing circuit detail columns. Run the latest SQL from `supabase/schema.sql`.')
      return true
    }
    return false
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('circuits').select('*').order('name')
      if (error) throw error
      setData(data || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase.from('circuits').select('*').order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error(error.message)
        else setData(data || [])
      }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const saveField = async (id, field, url) => {
    const { error } = await supabase.from('circuits').update({ [field]: url || null }).eq('id', id)
    if (error) {
      if (!showDbError(error)) toast.error(error.message)
      return
    }
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const toggle = (key) => setEditId(prev => prev === key ? null : key)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Circuits</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={12} /> Import
        </Link>
      </div>

      <div className="glass p-4">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-secondary border-b border-border">
                  <th className="text-left pb-2 pr-4 w-16">Layout</th>
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Location</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Country</th>
                  <th className="text-right pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <>
                    <tr key={row.id} className="border-b border-border hover:bg-muted">
                      <td className="py-2 pr-4">
                        <LayoutThumb name={row.name} value={row.layout_image} />
                      </td>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.location || '—'}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.country || '—'}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggle(`${row.id}-layout`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-layout` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-layout` ? undefined : 'var(--text-muted)' }}>
                            <ImagePlus size={11} /> Layout
                          </button>
                          <button onClick={() => toggle(`${row.id}-hero`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-hero` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-hero` ? undefined : 'var(--text-muted)' }}>
                            <Image size={11} /> Hero
                          </button>
                          <button
                            onClick={() => {
                              const key = `${row.id}-details`
                              if (editId === key) {
                                setEditId(null)
                                setDetailsDraft(null)
                                return
                              }
                              setEditId(key)
                              setDetailsDraft({
                                id: row.id,
                                track_length_km: row.track_length_km ?? '',
                                lap_count: row.lap_count ?? '',
                                turns: row.turns ?? '',
                                top_speed_kph: row.top_speed_kph ?? '',
                                elevation: row.elevation ?? '',
                                race_lap_record: row.race_lap_record ?? '',
                                opened: row.opened ?? '',
                                first_gp: row.first_gp ?? '',
                              })
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-details` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-details` ? undefined : 'var(--text-muted)' }}
                          >
                            <Pencil size={11} /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editId === `${row.id}-layout` && (
                      <ImageEditRow
                        colSpan={5}
                        folder="circuits"
                        currentUrl={row.layout_image}
                        onSave={(url) => saveField(row.id, 'layout_image', url)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-hero` && (
                      <ImageEditRow
                        colSpan={5}
                        folder="circuits/heroes"
                        currentUrl={row.hero_image_url}
                        onSave={(url) => saveField(row.id, 'hero_image_url', url)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-details` && detailsDraft?.id === row.id && (
                      <tr className="border-b border-border bg-muted/30">
                        <td colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Track length (km)</div>
                              <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={detailsDraft.track_length_km}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, track_length_km: e.target.value }))}
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Laps</div>
                              <input
                                type="number"
                                className="input"
                                value={detailsDraft.lap_count}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, lap_count: e.target.value }))}
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Turns</div>
                              <input
                                type="number"
                                className="input"
                                value={detailsDraft.turns}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, turns: e.target.value }))}
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Top speed (km/h)</div>
                              <input
                                type="number"
                                className="input"
                                value={detailsDraft.top_speed_kph}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, top_speed_kph: e.target.value }))}
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Elevation</div>
                              <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={detailsDraft.elevation}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, elevation: e.target.value }))}
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Lap record</div>
                              <input
                                className="input"
                                value={detailsDraft.race_lap_record}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, race_lap_record: e.target.value }))}
                                placeholder="1.29.708"
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Opened</div>
                              <input
                                type="number"
                                className="input"
                                value={detailsDraft.opened}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, opened: e.target.value }))}
                              />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>First GP</div>
                              <input
                                type="number"
                                className="input"
                                value={detailsDraft.first_gp}
                                onChange={(e) => setDetailsDraft(d => ({ ...d, first_gp: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 mt-4">
                            <button
                              className="btn-ghost text-xs"
                              onClick={() => { setEditId(null); setDetailsDraft(null) }}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn-primary text-xs"
                              onClick={async () => {
                                const payload = {
                                  track_length_km: toFloatOrNull(detailsDraft.track_length_km),
                                  lap_count: toIntOrNull(detailsDraft.lap_count),
                                  turns: toIntOrNull(detailsDraft.turns),
                                  top_speed_kph: toIntOrNull(detailsDraft.top_speed_kph),
                                  elevation: toFloatOrNull(detailsDraft.elevation),
                                  race_lap_record: String(detailsDraft.race_lap_record || '').trim() || null,
                                  opened: toIntOrNull(detailsDraft.opened),
                                  first_gp: toIntOrNull(detailsDraft.first_gp),
                                }
                                const { error } = await supabase.from('circuits').update(payload).eq('id', row.id)
                                if (error) {
                                  if (!showDbError(error)) toast.error(error.message)
                                  return
                                }
                                toast.success('Updated')
                                setEditId(null)
                                setDetailsDraft(null)
                                invalidateCache()
                                load()
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
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
