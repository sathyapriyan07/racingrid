import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, Check, X, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCircuits() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editUrl, setEditUrl] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('circuits').select('*').order('name')
    setData(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startEdit = (row) => { setEditId(row.id); setEditUrl(row.layout_image || '') }
  const cancelEdit = () => { setEditId(null); setEditUrl('') }

  const saveImage = async (id) => {
    const { error } = await supabase.from('circuits').update({ layout_image: editUrl || null }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Image updated')
    setEditId(null)
    invalidateCache()
    load()
  }

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
                <tr className="text-white/30 border-b border-white/5">
                  <th className="text-left pb-2 pr-4 w-16">Layout</th>
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Location</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Country</th>
                  <th className="text-right pb-2">Image URL</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <>
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-2 pr-4">
                        {row.layout_image
                          ? <img src={row.layout_image} alt={row.name} className="w-12 h-8 object-contain bg-white/5 rounded" />
                          : <div className="w-12 h-8 rounded bg-white/5 flex items-center justify-center text-white/20"><ImagePlus size={12} /></div>
                        }
                      </td>
                      <td className="py-2 pr-4 font-medium text-white/80">{row.name}</td>
                      <td className="py-2 pr-4 text-white/40 hidden sm:table-cell">{row.location || '—'}</td>
                      <td className="py-2 pr-4 text-white/40 hidden sm:table-cell">{row.country || '—'}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => startEdit(row)}
                          className="flex items-center gap-1 ml-auto text-white/30 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                          <ImagePlus size={11} />
                          {row.layout_image ? 'Edit' : 'Add'}
                        </button>
                      </td>
                    </tr>
                    {editId === row.id && (
                      <tr key={`${row.id}-edit`} className="border-b border-white/5 bg-white/3">
                        <td colSpan={5} className="px-3 py-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              placeholder="https://..."
                              className="input py-2 text-xs flex-1"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button onClick={() => saveImage(row.id)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold">
                                <Check size={13} /> Save
                              </button>
                              <button onClick={cancelEdit}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-white/40 text-xs">
                                <X size={13} /> Cancel
                              </button>
                            </div>
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
