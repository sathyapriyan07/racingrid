import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Check, X } from 'lucide-react'

export default function AdminTable({ table, data, columns, onRefresh }) {
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [deleting, setDeleting] = useState(null)

  const startEdit = (row) => {
    setEditId(row.id)
    setEditData({ ...row })
  }

  const cancelEdit = () => { setEditId(null); setEditData({}) }

  const saveEdit = async () => {
    const { error } = await supabase.from(table).update(editData).eq('id', editId)
    if (error) return toast.error(error.message)
    toast.success('Updated')
    setEditId(null)
    onRefresh()
  }

  const deleteRow = async (id) => {
    if (!window.confirm('Delete this record?')) return
    setDeleting(id)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); onRefresh() }
    setDeleting(null)
  }

  if (!data?.length) return <p className="text-white/30 text-sm text-center py-8">No records found.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/30 border-b border-white/5">
            {columns.map(c => <th key={c.key} className="text-left pb-2 pr-4 font-medium">{c.label}</th>)}
            <th className="text-right pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} className="border-b border-white/5 hover:bg-white/3">
              {columns.map(c => (
                <td key={c.key} className="py-2 pr-4">
                  {editId === row.id && c.editable !== false ? (
                    <input
                      value={editData[c.key] ?? ''}
                      onChange={e => setEditData(d => ({ ...d, [c.key]: e.target.value }))}
                      className="input py-1 text-xs w-full min-w-20"
                    />
                  ) : (
                    <span className="text-white/70 truncate block max-w-40">
                      {row[c.key] ?? <span className="text-white/20">—</span>}
                    </span>
                  )}
                </td>
              ))}
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  {editId === row.id ? (
                    <>
                      <button onClick={saveEdit} className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-white/10 text-white/40 transition-colors"><X size={12} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(row)} className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Edit2 size={12} /></button>
                      <button onClick={() => deleteRow(row.id)} disabled={deleting === row.id} className="p-1.5 rounded hover:bg-f1red/20 text-white/40 hover:text-f1red transition-colors"><Trash2 size={12} /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
