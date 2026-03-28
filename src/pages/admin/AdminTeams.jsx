import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageEditRow from './ImageEditRow'

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

  const saveImage = async (id, url) => {
    const { error } = await supabase.from('teams').update({ logo_url: url || null }).eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Logo updated')
    setEditId(null)
    invalidateCache()
    load()
  }

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
                  <th className="text-left pb-2 pr-4 w-12">Logo</th>
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4 hidden sm:table-cell">Nationality</th>
                  <th className="text-left pb-2 pr-4 hidden md:table-cell">Base</th>
                  <th className="text-right pb-2">Logo</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <>
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-2 pr-4">
                        {row.logo_url
                          ? <img src={row.logo_url} alt={row.name} className="w-8 h-8 object-contain rounded bg-white/5 p-0.5" />
                          : <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/20"><ImagePlus size={12} /></div>
                        }
                      </td>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>{row.nationality || '—'}</td>
                      <td className="py-2 pr-4 hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>{row.base || '—'}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => setEditId(editId === row.id ? null : row.id)}
                          className="flex items-center gap-1 ml-auto px-2 py-1 rounded hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--text-muted)' }}>
                          <ImagePlus size={11} />
                          {row.logo_url ? 'Edit' : 'Add'}
                        </button>
                      </td>
                    </tr>
                    {editId === row.id && (
                      <ImageEditRow
                        colSpan={5}
                        folder="teams"
                        currentUrl={row.logo_url}
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
