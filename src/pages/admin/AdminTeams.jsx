import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Car, Pencil, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageEditRow from './ImageEditRow'

function DetailsEditRow({ colSpan, row, onSave, onCancel }) {
  const [isActive, setIsActive] = useState(row.is_active || false)
  const [base, setBase] = useState(row.base || '')
  return (
    <tr className="bg-white/3">
      <td colSpan={colSpan} className="px-3 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-f1red" />
            <span className="text-xs text-white/70">Active (current season)</span>
          </label>
          <input value={base} onChange={e => setBase(e.target.value)}
            placeholder="Base location..." className="input text-xs py-1 w-56" />
          <div className="flex gap-2 ml-auto">
            <button onClick={onCancel} className="btn-ghost text-xs py-1">Cancel</button>
            <button onClick={() => onSave(isActive, base)} className="btn-primary text-xs py-1">Save</button>
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

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('teams').select('*').order('name')
      if (error) throw error
      setData(data || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveField = async (id, field, url) => {
    const { error } = await supabase.from('teams').update({ [field]: url || null }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    invalidateCache()
    load()
  }

  const saveDetails = async (id, is_active, base) => {
    const { error } = await supabase.from('teams').update({ is_active, base: base || null }).eq('id', id)
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
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/5">
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
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-2 pr-3">
                        {row.logo_url
                          ? <img src={row.logo_url} alt={row.name} className="w-8 h-8 object-contain rounded bg-white/5 p-0.5" />
                          : <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/20"><ImagePlus size={12} /></div>
                        }
                      </td>
                      <td className="py-2 pr-3 hidden sm:table-cell">
                        {row.car_image
                          ? <img src={row.car_image} alt={`${row.name} car`} className="w-16 h-8 object-contain rounded bg-white/5" />
                          : <div className="w-16 h-8 rounded bg-white/5 flex items-center justify-center text-white/20"><Car size={12} /></div>
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
                        <span className={`text-xs font-semibold ${row.is_active ? 'text-green-400' : 'text-white/30'}`}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggle(`${row.id}-flag`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-flag` ? 'bg-f1red/20 text-f1red' : 'hover:bg-white/5'}`}
                            style={{ color: editId === `${row.id}-flag` ? undefined : 'var(--text-muted)' }}>
                            <Flag size={11} /> Flag
                          </button>
                          <button onClick={() => toggle(`${row.id}-details`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-details` ? 'bg-f1red/20 text-f1red' : 'hover:bg-white/5'}`}
                            style={{ color: editId === `${row.id}-details` ? undefined : 'var(--text-muted)' }}>
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => toggle(`${row.id}-logo`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-logo` ? 'bg-f1red/20 text-f1red' : 'hover:bg-white/5'}`}
                            style={{ color: editId === `${row.id}-logo` ? undefined : 'var(--text-muted)' }}>
                            <ImagePlus size={11} /> Logo
                          </button>
                          <button onClick={() => toggle(`${row.id}-car`)}
                            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${editId === `${row.id}-car` ? 'bg-f1red/20 text-f1red' : 'hover:bg-white/5'}`}
                            style={{ color: editId === `${row.id}-car` ? undefined : 'var(--text-muted)' }}>
                            <Car size={11} /> Car
                          </button>
                        </div>
                      </td>
                    </tr>
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
                        onSave={(active, base) => saveDetails(row.id, active, base)}
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
