import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageEditRow from './ImageEditRow'

export default function AdminCircuits() {
  const { invalidateCache } = useDataStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('circuits').select('*').order('name')
    setData(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveImage = async (id, url) => {
    const { error } = await supabase.from('circuits').update({ layout_image: url || null }).eq('id', id)
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
                  <th className="text-right pb-2">Image</th>
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
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.location || '—'}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.country || '—'}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => setEditId(editId === row.id ? null : row.id)}
                          className="flex items-center gap-1 ml-auto px-2 py-1 rounded hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--text-muted)' }}>
                          <ImagePlus size={11} />
                          {row.layout_image ? 'Edit' : 'Add'}
                        </button>
                      </td>
                    </tr>
                    {editId === row.id && (
                      <ImageEditRow
                        colSpan={5}
                        folder="circuits"
                        currentUrl={row.layout_image}
                        onSave={(url) => saveImage(row.id, url)}
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
