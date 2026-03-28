import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, Check, X, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDrivers() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editId, setEditId] = useState(null)
  const [editUrl, setEditUrl] = useState('')
  const PAGE_SIZE = 20

  const load = async () => {
    setLoading(true)
    let q = supabase.from('drivers').select('*').order('name').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) q = q.ilike('name', `%${search}%`)
    const { data } = await q
    setData(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [page, search])

  const startEdit = (row) => { setEditId(row.id); setEditUrl(row.image_url || '') }
  const cancelEdit = () => { setEditId(null); setEditUrl('') }

  const saveImage = async (id) => {
    const { error } = await supabase.from('drivers').update({ image_url: editUrl || null }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Image updated')
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
                  <tr className="text-white/30 border-b border-white/5">
                    <th className="text-left pb-2 pr-4 w-10">Image</th>
                    <th className="text-left pb-2 pr-4">Name</th>
                    <th className="text-left pb-2 pr-4">Code</th>
                    <th className="text-left pb-2 pr-4 hidden sm:table-cell">Nationality</th>
                    <th className="text-left pb-2 pr-4 hidden md:table-cell">DOB</th>
                    <th className="text-right pb-2">Image URL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-2 pr-4">
                        {row.image_url
                          ? <img src={row.image_url} alt={row.name} className="w-8 h-8 rounded-full object-cover bg-white/10" />
                          : <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20"><ImagePlus size={12} /></div>
                        }
                      </td>
                      <td className="py-2 pr-4 font-medium text-white/80">{row.name}</td>
                      <td className="py-2 pr-4 text-white/40">{row.code || '—'}</td>
                      <td className="py-2 pr-4 text-white/40 hidden sm:table-cell">{row.nationality || '—'}</td>
                      <td className="py-2 pr-4 text-white/40 hidden md:table-cell">{row.dob || '—'}</td>
                      <td className="py-2 text-right">
                        {editId === row.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              placeholder="https://..."
                              className="input py-1 text-xs w-56"
                              autoFocus
                            />
                            <button onClick={() => saveImage(row.id)} className="p-1.5 rounded hover:bg-green-500/20 text-green-400"><Check size={12} /></button>
                            <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-white/10 text-white/40"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(row)}
                            className="flex items-center gap-1 ml-auto text-white/30 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                            <ImagePlus size={11} />
                            {row.image_url ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs py-1">← Prev</button>
              <span className="text-xs text-white/40 py-2">Page {page + 1}</span>
              <button disabled={data.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs py-1">Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
