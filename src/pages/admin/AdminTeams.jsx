import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { uploadImage } from '../../lib/uploadImage'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Car, Pencil, Flag, FileText, Image, Link2, Users, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

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

function InlineDetails({ row, onSave, onCancel }) {
  const [isActive, setIsActive] = useState(row.is_active || false)
  const [base, setBase] = useState(row.base || '')
  const [fullName, setFullName] = useState(row.full_name || '')
  const [founded, setFounded] = useState(row.founded || '')
  const [teamBoss, setTeamBoss] = useState(row.team_boss || '')
  const [engine, setEngine] = useState(row.engine_manufacturer || '')
  return (
    <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 cursor-pointer w-full">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-f1red" />
          <span className="text-xs">Active (current season)</span>
        </label>
        <input value={base} onChange={e => setBase(e.target.value)} placeholder="Base location" className="input text-xs py-1.5 flex-1 min-w-[160px]" />
        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full team name" className="input text-xs py-1.5 flex-1 min-w-[160px]" />
        <input value={founded} onChange={e => setFounded(e.target.value)} placeholder="Founded year" type="number" className="input text-xs py-1.5 w-28" />
        <input value={teamBoss} onChange={e => setTeamBoss(e.target.value)} placeholder="Team boss" className="input text-xs py-1.5 flex-1 min-w-[160px]" />
        <input value={engine} onChange={e => setEngine(e.target.value)} placeholder="Engine manufacturer" className="input text-xs py-1.5 flex-1 min-w-[160px]" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(isActive, base, fullName, founded, teamBoss, engine)} className="btn-primary text-xs py-1">Save</button>
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

function InlinePartners({ teamId, onCancel }) {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newName, setNewName] = useState('')
  const fileRef = useRef()

  const load = async () => {
    const { data } = await supabase.from('team_partners').select('*').eq('team_id', teamId).order('sort_order').order('created_at')
    setPartners(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [teamId])

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'teams/partners')
      const { error } = await supabase.from('team_partners').insert({ team_id: teamId, logo_url: url, name: newName.trim() || null, sort_order: partners.length })
      if (error) throw new Error(error.message)
      setNewName(''); toast.success('Partner added'); load()
    } catch (err) { toast.error(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('team_partners').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Removed'); load()
  }

  return (
    <div className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Partners</p>
      {loading ? <Spinner /> : (
        <div className="flex flex-wrap gap-3">
          {partners.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-1 relative group">
              <img src={p.logo_url} alt={p.name || ''} className="h-10 w-auto max-w-[80px] object-contain rounded bg-surface p-1" />
              {p.name && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.name}</span>}
              <button onClick={() => remove(p.id)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[10px] hidden group-hover:flex items-center justify-center">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Partner name (optional)" className="input text-xs py-1 w-44" />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary text-xs py-1 flex items-center gap-1.5">
          {uploading ? 'Uploading...' : <><Plus size={11} /> Add Logo</>}
        </button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1">Close</button>
      </div>
    </div>
  )
}

function TeamControls({ row, onClose, onRefresh, invalidateCache }) {
  const [editId, setEditId] = useState(null)
  const toggle = (key) => setEditId(prev => prev === key ? null : key)

  const save = async (field, val) => {
    const { error } = await supabase.from('teams').update({ [field]: val ?? null }).eq('id', row.id)
    if (error) return toast.error(error.message)
    toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
  }

  const saveDetails = async (isActive, base, fullName, founded, teamBoss, engine) => {
    const { error } = await supabase.from('teams').update({
      is_active: isActive,
      base: base || null, full_name: fullName || null,
      founded: founded ? parseInt(founded) : null,
      team_boss: teamBoss || null, engine_manufacturer: engine || null,
    }).eq('id', row.id)
    if (error) return toast.error(error.message)
    toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
  }

  const saveSocial = async (ig, tw) => {
    const { error } = await supabase.from('teams').update({ instagram_url: ig?.trim() || null, twitter_url: tw?.trim() || null }).eq('id', row.id)
    if (error) return toast.error(error.message)
    toast.success('Updated'); setEditId(null); invalidateCache(); onRefresh()
  }

  const btnCls = (key) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editId === key ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`

  return (
    <div className="apple-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {row.logo_url
            ? <img src={row.logo_url} alt={row.name} className="w-10 h-10 object-contain rounded-xl bg-muted p-1 shrink-0" />
            : <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xs font-black shrink-0" style={{ color: 'var(--text-muted)' }}>{row.name?.slice(0, 2).toUpperCase()}</div>
          }
          <div>
            <div className="font-bold text-sm">{row.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.nationality || '—'}{row.base ? ` · ${row.base}` : ''}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[['details', 'Edit', Pencil], ['bio', 'Bio', FileText], ['logo', 'Logo', ImagePlus],
          ['detail-logo', 'Detail Logo', ImagePlus], ['hero', 'Hero', Image], ['car', 'Car', Car],
          ['flag', 'Flag', Flag], ['website', 'Website', Link2], ['social', 'Social', Link2],
          ['partners', 'Partners', Users],
        ].map(([key, label, Icon]) => (
          <button key={key} onClick={() => toggle(key)} className={btnCls(key)} style={{ color: editId === key ? undefined : 'var(--text-muted)' }}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {editId === 'details' && <InlineDetails row={row} onSave={saveDetails} onCancel={() => toggle('details')} />}
      {editId === 'bio' && <InlineText label="About / Bio" currentValue={row.bio} onSave={v => save('bio', v || null)} onCancel={() => toggle('bio')} />}
      {editId === 'logo' && <InlineImage folder="teams" currentUrl={row.logo_url} onSave={u => save('logo_url', u || null)} onCancel={() => toggle('logo')} />}
      {editId === 'detail-logo' && <InlineImage folder="teams/detail" currentUrl={row.detail_logo_url} onSave={u => save('detail_logo_url', u || null)} onCancel={() => toggle('detail-logo')} />}
      {editId === 'hero' && <InlineImage folder="teams/heroes" currentUrl={row.hero_image_url} onSave={u => save('hero_image_url', u || null)} onCancel={() => toggle('hero')} />}
      {editId === 'car' && <InlineImage folder="teams/cars" currentUrl={row.car_image} onSave={u => save('car_image', u || null)} onCancel={() => toggle('car')} />}
      {editId === 'flag' && <InlineImage folder="teams/flags" currentUrl={row.flag_url} onSave={u => save('flag_url', u || null)} onCancel={() => toggle('flag')} />}
      {editId === 'website' && <InlineText label="Website URL" currentValue={row.website_url} rows={1} onSave={v => save('website_url', v || null)} onCancel={() => toggle('website')} />}
      {editId === 'social' && <InlineSocial row={row} onSave={saveSocial} onCancel={() => toggle('social')} />}
      {editId === 'partners' && <InlinePartners teamId={row.id} onCancel={() => toggle('partners')} />}
    </div>
  )
}

export default function AdminTeams() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    setLoading(true)
    let q = supabase.from('teams').select('*').order('name')
    if (search) q = q.ilike('name', `%${search}%`)
    q.then(({ data, error }) => {
      if (error) toast.error(error.message)
      else setData(data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    let c = false; setLoading(true)
    let q = supabase.from('teams').select('*').order('name')
    if (search) q = q.ilike('name', `%${search}%`)
    q.then(({ data, error }) => { if (c) return; if (error) toast.error(error.message); else setData(data || []) })
      .finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [search])

  const selectedRow = data.find(d => d.id === selectedId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Teams</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs"><Plus size={12} /> Import</Link>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); setSelectedId(null) }}
        placeholder="Search by name..." className="input max-w-xs" />

      {loading ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {data.map(row => (
              <button key={row.id} onClick={() => setSelectedId(prev => prev === row.id ? null : row.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${selectedId === row.id ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40 hover:bg-muted'}`}
                style={{ background: selectedId === row.id ? undefined : 'var(--bg-surface)' }}>
                {row.logo_url
                  ? <img src={row.logo_url} alt={row.name} className="w-12 h-12 object-contain" />
                  : <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-sm font-black" style={{ color: 'var(--text-muted)' }}>{row.name?.slice(0, 2).toUpperCase()}</div>
                }
                <div className="min-w-0 w-full">
                  <div className="text-xs font-bold truncate">{row.name}</div>
                  {row.nationality && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{row.nationality}</div>}
                  {row.is_active && <div className="text-[10px] text-green-400">Active</div>}
                </div>
              </button>
            ))}
          </div>

          {selectedRow && (
            <TeamControls
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
