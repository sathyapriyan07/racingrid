import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Flag, Image, Pencil, FileText, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageEditRow from './ImageEditRow'
import TextEditRow from './TextEditRow'
import SocialLinksEditRow from './SocialLinksEditRow'

function ActiveEditRow({ colSpan, row, onSave, onCancel }) {
  const [isActive, setIsActive] = useState(row.is_active || false)
  return (
    <tr className="bg-muted">
      <td colSpan={colSpan} className="px-3 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-f1red" />
            <span className="text-xs text-secondary">Active (current season)</span>
          </label>
          <div className="flex gap-2 ml-auto">
            <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
            <button onClick={() => onSave(isActive)} className="btn-primary text-xs py-1">Save</button>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function AdminDrivers() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editId, setEditId] = useState(null)  // `${id}-image` or `${id}-flag`
  const PAGE_SIZE = 20

  const load = async () => {
    setLoading(true)
    try {
      let q = supabase.from('drivers').select('*').order('name').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
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

  useEffect(() => { load() }, [page, search])

  const toggle = (key) => setEditId(prev => prev === key ? null : key)

  const saveField = async (id, field, url) => {
    const { error } = await supabase.from('drivers').update({ [field]: url || null }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const saveActive = async (id, is_active) => {
    const { error } = await supabase.from('drivers').update({ is_active }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const saveSocial = async (id, instagram_url, twitter_url) => {
    const { error } = await supabase.from('drivers').update({
      instagram_url: instagram_url?.trim() || null,
      twitter_url: twitter_url?.trim() || null,
    }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Drivers</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={12} /> Import
        </Link>
      </div>

      <div className="glass p-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by name..." className="input mb-4 max-w-xs" />

        {loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-secondary border-b border-border">
                    <th className="text-left pb-2 pr-4 w-10">Image</th>
                    <th className="text-left pb-2 pr-4">Name</th>
                    <th className="text-left pb-2 pr-4">Code</th>
                    <th className="text-left pb-2 pr-4 hidden sm:table-cell">Nationality</th>
                    <th className="text-left pb-2 pr-4 hidden md:table-cell">DOB</th>
                    <th className="text-left pb-2 pr-4">Active</th>
                    <th className="text-right pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => (
                    <>
                      <tr key={row.id} className="border-b border-border hover:bg-muted">
                        <td className="py-2 pr-4">
                          {row.image_url
                            ? <img src={row.image_url} alt={row.name} className="w-8 h-8 rounded-full object-cover object-top bg-muted" />
                            : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-secondary"><ImagePlus size={12} /></div>
                          }
                        </td>
                        <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                        <td className="py-2 pr-4" style={{ color: 'var(--text-muted)' }}>{row.code || '—'}</td>
                        <td className="py-2 pr-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            {row.flag_url && <img src={row.flag_url} alt="" className="h-3.5 w-auto rounded-sm" />}
                            <span style={{ color: 'var(--text-muted)' }}>{row.nationality || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-4 hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>{row.dob || '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs font-semibold ${row.is_active ? 'text-green-400' : 'text-secondary'}`}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => toggle(`${row.id}-active`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-active` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-active` ? undefined : 'var(--text-muted)' }}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button onClick={() => toggle(`${row.id}-bio`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-bio` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-bio` ? undefined : 'var(--text-muted)' }}>
                              <FileText size={11} /> Bio
                            </button>
                            <button onClick={() => toggle(`${row.id}-image`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-image` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-image` ? undefined : 'var(--text-muted)' }}>
                              <ImagePlus size={11} /> Photo
                            </button>
                            <button onClick={() => toggle(`${row.id}-hero`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-hero` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-hero` ? undefined : 'var(--text-muted)' }}>
                              <Image size={11} /> Hero
                            </button>
                            <button onClick={() => toggle(`${row.id}-flag`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-flag` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-flag` ? undefined : 'var(--text-muted)' }}>
                              <Flag size={11} /> Flag
                            </button>
                            <button onClick={() => toggle(`${row.id}-website`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-website` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-website` ? undefined : 'var(--text-muted)' }}>
                              <Link2 size={11} /> Website
                            </button>
                            <button onClick={() => toggle(`${row.id}-social`)}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${editId === `${row.id}-social` ? 'bg-accent/20 text-accent' : 'hover:bg-muted'}`}
                              style={{ color: editId === `${row.id}-social` ? undefined : 'var(--text-muted)' }}>
                              <Link2 size={11} /> Social
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editId === `${row.id}-active` && (
                        <ActiveEditRow
                          colSpan={7}
                          row={row}
                          onSave={(active) => saveActive(row.id, active)}
                          onCancel={() => setEditId(null)}
                        />
                      )}
                      {editId === `${row.id}-bio` && (
                        <TextEditRow
                          colSpan={7}
                          label="Biography"
                          currentValue={row.biography}
                          onSave={(val) => saveField(row.id, 'biography', val || null)}
                          onCancel={() => setEditId(null)}
                        />
                      )}
                      {editId === `${row.id}-image` && (
                        <ImageEditRow
                          colSpan={7}
                          folder="drivers"
                          currentUrl={row.image_url}
                          onSave={(url) => saveField(row.id, 'image_url', url)}
                          onCancel={() => setEditId(null)}
                        />
                      )}
                      {editId === `${row.id}-hero` && (
                        <ImageEditRow
                          colSpan={7}
                          folder="drivers/heroes"
                          currentUrl={row.hero_image_url}
                          onSave={(url) => saveField(row.id, 'hero_image_url', url)}
                          onCancel={() => setEditId(null)}
                        />
                      )}
                      {editId === `${row.id}-flag` && (
                        <ImageEditRow
                          colSpan={7}
                          folder="drivers/flags"
                          currentUrl={row.flag_url}
                          onSave={(url) => saveField(row.id, 'flag_url', url)}
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

            <div className="flex gap-2 mt-4 justify-end">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs py-1">← Prev</button>
              <span className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Page {page + 1}</span>
              <button disabled={data.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs py-1">Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
