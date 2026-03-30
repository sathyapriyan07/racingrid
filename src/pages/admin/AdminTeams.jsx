import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Car, Pencil, Flag, FileText, Image, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageEditRow from './ImageEditRow'
import TextEditRow from './TextEditRow'
import SocialLinksEditRow from './SocialLinksEditRow'

function DetailsEditRow({ colSpan, row, onSave, onCancel }) {
  const [isActive, setIsActive] = useState(row.is_active || false)
  const [base, setBase] = useState(row.base || '')
  const [fullName, setFullName] = useState(row.full_name || '')
  const [founded, setFounded] = useState(row.founded || '')
  return (
    <tr className="bg-muted">
      <td colSpan={colSpan} className="px-3 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-f1red" />
            <span className="text-xs text-secondary">Active (current season)</span>
          </label>
          <input value={base} onChange={e => setBase(e.target.value)}
            placeholder="Base location..." className="input text-xs py-1 w-48" />
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="Full team name..." className="input text-xs py-1 w-48" />
          <input value={founded} onChange={e => setFounded(e.target.value)}
            placeholder="Founded year..." className="input text-xs py-1 w-28" type="number" />
          <div className="flex gap-2 ml-auto">
            <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
            <button onClick={() => onSave(isActive, base, fullName, founded)} className="btn-primary text-xs py-1">Save</button>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function AdminTeams() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      let q = supabase.from('teams').select('*').order('name')
      if (search) q = q.ilike('name', `%${search}%`)
      const { data, error } = await q
      if (error) throw error
      setData(data || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search])

  const saveField = async (id, field, url) => {
    const { error } = await supabase.from('teams').update({ [field]: url || null }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const saveDetails = async (id, is_active, base, full_name, founded) => {
    const { error } = await supabase.from('teams').update({
      is_active,
      base: base || null,
      full_name: full_name || null,
      founded: founded ? parseInt(founded) : null,
    }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const saveSocial = async (id, instagram_url, twitter_url) => {
    const { error } = await supabase.from('teams').update({
      instagram_url: instagram_url?.trim() || null,
      twitter_url: twitter_url?.trim() || null,
    }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const toggle = (key) => setEditId(prev => prev === key ? null : key)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Teams</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={12} /> Import
        </Link>
      </div>
      <div className="glass p-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setEditId(null) }}
          placeholder="Search by name..." className="input mb-4 max-w-xs" />
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-secondary border-b border-border">
                  <th className="text-left pb-2 pr-3 w-10">Logo</th>
                  <th className="text-left pb-2 pr-3 w-16 hidden sm:table-cell">Car</th>
                  <th className="text-left pb-2 pr-3">Name</th>
                  <th className="text-left pb-2 pr-3 hidden sm:table-cell">Nationality</th>
                  <th className="text-left pb-2 pr-3 hidden md:table-cell">Base</th>
                  <th className="text-left pb-2 pr-3">Active</th>
                  <th className="text-right pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <>
                    <tr key={row.id} className="border-b border-border hover:bg-muted">
                      <td className="py-2 pr-3">
                        {row.logo_url
                          ? <img src={row.logo_url} alt={row.name} className="w-8 h-8 object-contain rounded bg-muted p-0.5" />
                          : <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-secondary"><ImagePlus size={12} /></div>
                        }
                      </td>
                      <td className="py-2 pr-3 hidden sm:table-cell">
                        {row.car_image
                          ? <img src={row.car_image} alt={`${row.name} car`} className="w-16 h-8 object-contain rounded bg-muted" />
                          : <div className="w-16 h-8 rounded bg-muted flex items-center justify-center text-secondary"><Car size={12} /></div>
                        }
                      </td>
                      <td className="py-2 pr-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                      <td className="py-2 pr-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          {row.flag_url && <img src={row.flag_url} alt="" className="h-3.5 w-auto rounded-sm" />}
                          <span style={{ color: 'var(--text-muted)' }}>{row.nationality || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 hidden md:table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{row.base || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-semibold ${row.is_active ? 'text-green-400' : 'text-secondary'}`}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggle(`${row.id}-flag`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-flag` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-flag` ? undefined : 'var(--text-muted)' }}>
                            <Flag size={11} /> Flag
                          </button>
                          <button onClick={() => toggle(`${row.id}-hero`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-hero` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-hero` ? undefined : 'var(--text-muted)' }}>
                            <Image size={11} /> Hero
                          </button>
                          <button onClick={() => toggle(`${row.id}-details`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-details` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-details` ? undefined : 'var(--text-muted)' }}>
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => toggle(`${row.id}-bio`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-bio` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-bio` ? undefined : 'var(--text-muted)' }}>
                            <FileText size={11} /> Bio
                          </button>
                          <button onClick={() => toggle(`${row.id}-logo`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-logo` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-logo` ? undefined : 'var(--text-muted)' }}>
                            <ImagePlus size={11} /> Logo
                          </button>
                          <button onClick={() => toggle(`${row.id}-car`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-car` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-car` ? undefined : 'var(--text-muted)' }}>
                            <Car size={11} /> Car
                          </button>
                          <button onClick={() => toggle(`${row.id}-website`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-website` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-website` ? undefined : 'var(--text-muted)' }}>
                            <Link2 size={11} /> Website
                          </button>
                          <button onClick={() => toggle(`${row.id}-social`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-social` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                            style={{ color: editId === `${row.id}-social` ? undefined : 'var(--text-muted)' }}>
                            <Link2 size={11} /> Social
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editId === `${row.id}-hero` && (
                      <ImageEditRow
                        colSpan={7}
                        folder="teams/heroes"
                        currentUrl={row.hero_image_url}
                        onSave={(url) => saveField(row.id, 'hero_image_url', url)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-flag` && (
                      <ImageEditRow
                        colSpan={7}
                        folder="teams/flags"
                        currentUrl={row.flag_url}
                        onSave={(url) => saveField(row.id, 'flag_url', url)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-details` && (
                      <DetailsEditRow
                        colSpan={7}
                        row={row}
                        onSave={(active, base, fullName, founded) => saveDetails(row.id, active, base, fullName, founded)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-bio` && (
                      <TextEditRow
                        colSpan={7}
                        label="About / Bio"
                        currentValue={row.bio}
                        onSave={(val) => saveField(row.id, 'bio', val || null)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-logo` && (
                      <ImageEditRow
                        colSpan={7}
                        folder="teams"
                        currentUrl={row.logo_url}
                        onSave={(url) => saveField(row.id, 'logo_url', url)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-car` && (
                      <ImageEditRow
                        colSpan={7}
                        folder="teams/cars"
                        currentUrl={row.car_image}
                        onSave={(url) => saveField(row.id, 'car_image', url)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-website` && (
                      <TextEditRow
                        colSpan={7}
                        label="Website URL"
                        currentValue={row.website_url}
                        rows={2}
                        onSave={(val) => saveField(row.id, 'website_url', val || null)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                    {editId === `${row.id}-social` && (
                      <SocialLinksEditRow
                        colSpan={7}
                        row={row}
                        onSave={(instagramUrl, twitterUrl) => saveSocial(row.id, instagramUrl, twitterUrl)}
                        onCancel={() => setEditId(null)}
                      />
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
