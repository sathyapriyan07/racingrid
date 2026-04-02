import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { uploadImage } from '../../lib/uploadImage'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Flag, Image, Pencil, FileText, Link2, Zap, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

// ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fastest_laps integer DEFAULT 0;

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
        {url && <img src={url} alt="" className="h-8 w-auto object-contain rounded shrink-0" />}
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

function InlineText({ label, currentValue, rows = 3, onSave, onCancel }) {
  const [value, setValue] = useState(currentValue || '')
  return (
    <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
      {label && <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>}
      <textarea value={value} onChange={e => setValue(e.target.value)} rows={rows} className="input text-xs py-2 resize-y w-full" autoFocus />
      <div className="flex gap-2">
        <button onClick={() => onSave(value)} className="btn-primary text-xs py-1">Save</button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
      </div>
    </div>
  )
}

function InlineSocial({ row, onSave, onCancel }) {
  const [ig, setIg] = useState(row.instagram_url || '')
  const [tw, setTw] = useState(row.twitter_url || '')
  return (
    <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
      <input value={ig} onChange={e => setIg(e.target.value)} placeholder="Instagram URL or @handle" className="input text-xs py-1.5 w-full" autoFocus />
      <input value={tw} onChange={e => setTw(e.target.value)} placeholder="Twitter/X URL or @handle" className="input text-xs py-1.5 w-full" />
      <div className="flex gap-2">
        <button onClick={() => onSave(ig, tw)} className="btn-primary text-xs py-1">Save</button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
      </div>
    </div>
  )
}

function DriverControls({ row, onClose, onRefresh, invalidateCache }) {
  const [editId, setEditId] = useState(null)
  const [isActive, setIsActive] = useState(row.is_active || false)
  const [flValue, setFlValue] = useState(row.fastest_laps ?? 0)
  const toggle = (key) => setEditId(prev => prev === key ? null : key)

  const save = async (field, val) => {
    const { error } = await supabase.from('drivers').update({ [field]: val ?? null }).eq('id', row.id)
    if (error) return toast.error(error.message)
    toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
  }

  const btnCls = (key) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editId === key ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`

  return (
    <div className="apple-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {row.image_url
            ? <img src={row.image_url} alt={row.name} className="w-10 h-10 rounded-full object-cover object-top shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-black shrink-0" style={{ color: 'var(--text-muted)' }}>{row.code || '?'}</div>
          }
          <div>
            <div className="font-bold text-sm">{row.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.code || '—'} · {row.nationality || '—'}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[['image', 'Photo', ImagePlus], ['hero', 'Hero', Image], ['flag', 'Flag', Flag],
          ['bio', 'Bio', FileText], ['website', 'Website', Link2], ['social', 'Social', Link2],
          ['active', 'Active', Pencil], ['fl', 'Fastest Laps', Zap]
        ].map(([key, label, Icon]) => (
          <button key={key} onClick={() => toggle(key)} className={btnCls(key)} style={{ color: editId === key ? undefined : 'var(--text-muted)' }}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {editId === 'image' && <InlineImage folder="drivers" currentUrl={row.image_url} onSave={u => save('image_url', u || null)} onCancel={() => toggle('image')} />}
      {editId === 'hero' && <InlineImage folder="drivers/heroes" currentUrl={row.hero_image_url} onSave={u => save('hero_image_url', u || null)} onCancel={() => toggle('hero')} />}
      {editId === 'flag' && <InlineImage folder="drivers/flags" currentUrl={row.flag_url} onSave={u => save('flag_url', u || null)} onCancel={() => toggle('flag')} />}
      {editId === 'bio' && <InlineText label="Biography" currentValue={row.biography} onSave={v => save('biography', v || null)} onCancel={() => toggle('bio')} />}
      {editId === 'website' && <InlineText label="Website URL" currentValue={row.website_url} rows={1} onSave={v => save('website_url', v || null)} onCancel={() => toggle('website')} />}
      {editId === 'social' && <InlineSocial row={row} onSave={async (ig, tw) => {
        const { error } = await supabase.from('drivers').update({ instagram_url: ig?.trim() || null, twitter_url: tw?.trim() || null }).eq('id', row.id)
        if (error) return toast.error(error.message)
        toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
      }} onCancel={() => toggle('social')} />}
      {editId === 'active' && (
        <div className="flex items-center gap-4 p-3 rounded-xl flex-wrap" style={{ background: 'var(--bg-raised)' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-f1red" />
            <span className="text-xs">Active (current season)</span>
          </label>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => toggle('active')} className="btn-ghost text-xs py-1">Cancel</button>
            <button onClick={() => save('is_active', isActive)} className="btn-primary text-xs py-1">Save</button>
          </div>
        </div>
      )}
      {editId === 'fl' && (
        <div className="flex items-center gap-3 p-3 rounded-xl flex-wrap" style={{ background: 'var(--bg-raised)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Fastest Laps</span>
          <input type="number" min={0} value={flValue} onChange={e => setFlValue(Number(e.target.value))} className="input text-xs py-1 w-24" autoFocus />
          <div className="flex gap-2 ml-auto">
            <button onClick={() => toggle('fl')} className="btn-ghost text-xs py-1">Cancel</button>
            <button onClick={() => save('fastest_laps', flValue)} className="btn-primary text-xs py-1">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDrivers() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const PAGE_SIZE = 20

  const load = () => {
    setLoading(true)
    let q = supabase.from('drivers').select('*').order('name').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) q = q.ilike('name', `%${search}%`)
    q.then(({ data, error }) => {
      if (error) toast.error(error.message)
      else setData(data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { let c = false; setLoading(true)
    let q = supabase.from('drivers').select('*').order('name').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) q = q.ilike('name', `%${search}%`)
    q.then(({ data, error }) => { if (c) return; if (error) toast.error(error.message); else setData(data || []) })
      .finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [page, search])

  const selectedRow = data.find(d => d.id === selectedId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Drivers</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs"><Plus size={12} /> Import</Link>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); setSelectedId(null) }}
        placeholder="Search by name..." className="input max-w-xs" />

      {loading ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {data.map(row => (
              <button key={row.id} onClick={() => setSelectedId(prev => prev === row.id ? null : row.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center ${selectedId === row.id ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40 hover:bg-muted'}`}
                style={{ background: selectedId === row.id ? undefined : 'var(--bg-surface)' }}>
                {row.image_url
                  ? <img src={row.image_url} alt={row.name} className="w-14 h-14 rounded-full object-cover object-top" />
                  : <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-sm font-black" style={{ color: 'var(--text-muted)' }}>{row.code || row.name?.slice(0, 2)}</div>
                }
                <div className="min-w-0 w-full">
                  <div className="text-xs font-bold truncate">{row.name}</div>
                  {row.code && <div className="text-[10px] font-semibold text-f1red">{row.code}</div>}
                  {row.is_active && <div className="text-[10px] text-green-400">Active</div>}
                </div>
              </button>
            ))}
          </div>

          {selectedRow && (
            <DriverControls
              key={selectedRow.id}
              row={selectedRow}
              onClose={() => setSelectedId(null)}
              onRefresh={load}
              invalidateCache={invalidateCache}
            />
          )}

          <div className="flex gap-2 justify-end">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs py-1">← Prev</button>
            <span className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Page {page + 1}</span>
            <button disabled={data.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs py-1">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
