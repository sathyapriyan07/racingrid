import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { uploadImage } from '../../lib/uploadImage'
import { resolveImageSrc } from '../../lib/resolveImageSrc'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Image, Pencil, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

function toIntOrNull(v) {
  const t = String(v ?? '').trim(); if (!t) return null
  const n = parseInt(t, 10); return isFinite(n) ? n : null
}
function toFloatOrNull(v) {
  const t = String(v ?? '').trim(); if (!t) return null
  const n = parseFloat(t); return isFinite(n) ? n : null
}

function InlineImage({ folder, currentUrl, onSave, onCancel }) {
  const [url, setUrl] = useState(currentUrl || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try { const u = await uploadImage(file, folder); setUrl(u); toast.success('Uploaded') }
    catch (err) { toast.error(err.message) }
    finally { setUploading(false) }
  }
  return (
    <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
      <div className="flex gap-2 items-center">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste URL..." className="input py-1.5 text-xs flex-1" autoFocus />
        {url && <img src={resolveImageSrc(url) || url} alt="" className="h-8 w-auto object-contain rounded shrink-0" onError={e => e.target.style.display='none'} />}
      </div>
      <div className="flex gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-ghost text-xs py-1 flex items-center gap-1">
          <Upload size={11} />{uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={() => onSave(url)} className="btn-primary text-xs py-1">Save</button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
      </div>
    </div>
  )
}

function InlineDetails({ row, onSave, onCancel }) {
  const [d, setD] = useState({
    track_length_km: row.track_length_km ?? '',
    lap_count: row.lap_count ?? '',
    turns: row.turns ?? '',
    top_speed_kph: row.top_speed_kph ?? '',
    elevation: row.elevation ?? '',
    race_lap_record: row.race_lap_record ?? '',
    opened: row.opened ?? '',
    first_gp: row.first_gp ?? '',
  })
  const field = (key, label, type = 'number', step) => (
    <div key={key}>
      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <input type={type} step={step} className="input text-xs py-1.5 w-full" value={d[key]}
        onChange={e => setD(prev => ({ ...prev, [key]: e.target.value }))} placeholder={label} />
    </div>
  )
  return (
    <div className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {field('track_length_km', 'Length (km)', 'number', '0.001')}
        {field('lap_count', 'Laps')}
        {field('turns', 'Turns')}
        {field('top_speed_kph', 'Top Speed (km/h)')}
        {field('elevation', 'Elevation', 'number', '0.01')}
        {field('race_lap_record', 'Lap Record', 'text')}
        {field('opened', 'Opened')}
        {field('first_gp', 'First GP')}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({
          track_length_km: toFloatOrNull(d.track_length_km),
          lap_count: toIntOrNull(d.lap_count),
          turns: toIntOrNull(d.turns),
          top_speed_kph: toIntOrNull(d.top_speed_kph),
          elevation: toFloatOrNull(d.elevation),
          race_lap_record: String(d.race_lap_record || '').trim() || null,
          opened: toIntOrNull(d.opened),
          first_gp: toIntOrNull(d.first_gp),
        })} className="btn-primary text-xs py-1">Save</button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
      </div>
    </div>
  )
}

function CircuitControls({ row, onClose, onRefresh, invalidateCache }) {
  const [editId, setEditId] = useState(null)
  const toggle = (key) => setEditId(prev => prev === key ? null : key)

  const showDbError = (error) => {
    const msg = String(error?.message || '')
    if (error?.code === '42703' || msg.toLowerCase().includes('does not exist')) {
      toast.error('Missing schema columns. Run the latest SQL from supabase/schema.sql.')
      return true
    }
    return false
  }

  const save = async (field, val) => {
    const { error } = await supabase.from('circuits').update({ [field]: val ?? null }).eq('id', row.id)
    if (error) { if (!showDbError(error)) toast.error(error.message); return }
    toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
  }

  const saveDetails = async (payload) => {
    const { error } = await supabase.from('circuits').update(payload).eq('id', row.id)
    if (error) { if (!showDbError(error)) toast.error(error.message); return }
    toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
  }

  const btnCls = (key) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editId === key ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`

  const layoutSrc = resolveImageSrc(row.layout_image) || row.layout_image

  return (
    <div className="apple-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {layoutSrc
            ? <img src={layoutSrc} alt={row.name} className="w-14 h-10 object-contain rounded bg-muted p-1 shrink-0" />
            : <div className="w-14 h-10 rounded bg-muted flex items-center justify-center shrink-0"><ImagePlus size={14} style={{ color: 'var(--text-muted)' }} /></div>
          }
          <div>
            <div className="font-bold text-sm">{row.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{[row.location, row.country].filter(Boolean).join(', ') || '—'}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[['layout', 'Layout', ImagePlus], ['hero', 'Hero', Image], ['details', 'Details', Pencil]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => toggle(key)} className={btnCls(key)} style={{ color: editId === key ? undefined : 'var(--text-muted)' }}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {editId === 'layout' && <InlineImage folder="circuits" currentUrl={row.layout_image} onSave={u => save('layout_image', u || null)} onCancel={() => toggle('layout')} />}
      {editId === 'hero' && <InlineImage folder="circuits/heroes" currentUrl={row.hero_image_url} onSave={u => save('hero_image_url', u || null)} onCancel={() => toggle('hero')} />}
      {editId === 'details' && <InlineDetails row={row} onSave={saveDetails} onCancel={() => toggle('details')} />}
    </div>
  )
}

export default function AdminCircuits() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    setLoading(true)
    let q = supabase.from('circuits').select('*').order('name')
    if (search) q = q.ilike('name', `%${search}%`)
    q.then(({ data, error }) => {
      if (error) toast.error(error.message)
      else setData(data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    let c = false; setLoading(true)
    let q = supabase.from('circuits').select('*').order('name')
    if (search) q = q.ilike('name', `%${search}%`)
    q.then(({ data, error }) => { if (c) return; if (error) toast.error(error.message); else setData(data || []) })
      .finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [search])

  const selectedRow = data.find(d => d.id === selectedId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Circuits</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs"><Plus size={12} /> Import</Link>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); setSelectedId(null) }}
        placeholder="Search by name..." className="input max-w-xs" />

      {loading ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {data.map(row => {
              const layoutSrc = resolveImageSrc(row.layout_image) || row.layout_image
              return (
                <button key={row.id} onClick={() => setSelectedId(prev => prev === row.id ? null : row.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center ${selectedId === row.id ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40 hover:bg-muted'}`}
                  style={{ background: selectedId === row.id ? undefined : 'var(--bg-surface)' }}>
                  {layoutSrc
                    ? <img src={layoutSrc} alt={row.name} className="w-16 h-10 object-contain" onError={e => e.target.style.display='none'} />
                    : <div className="w-16 h-10 rounded bg-muted flex items-center justify-center"><ImagePlus size={14} style={{ color: 'var(--text-muted)' }} /></div>
                  }
                  <div className="min-w-0 w-full">
                    <div className="text-xs font-bold truncate">{row.name}</div>
                    {row.country && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{row.country}</div>}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedRow && (
            <CircuitControls
              key={selectedRow.id}
              row={selectedRow}
              onClose={() => setSelectedId(null)}
              onRefresh={load}
              invalidateCache={invalidateCache}
            />
          )}
        </div>
      )}
    </div>
  )
}
