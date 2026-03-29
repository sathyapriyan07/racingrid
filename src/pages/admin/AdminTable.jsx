import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Check, X } from 'lucide-react'

export default function AdminTable({ table, data, columns, onRefresh }) {
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [deleting, setDeleting] = useState(null)

  const startEdit = (row) => { setEditId(row.id); setEditData({ ...row }) }
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

  if (!data?.length) return <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No records found.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {columns.map(c => <th key={c.key} className="text-left pb-2 pr-4 font-medium">{c.label}</th>)}
            <th className="text-right pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} className="border-b transition-colors" style={{ borderColor: 'var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {columns.map(c => (
                <td key={c.key} className="py-2 pr-4">
                  {editId === row.id && c.editable !== false ? (
                    <input value={editData[c.key] ?? ''} onChange={e => setEditData(d => ({ ...d, [c.key]: e.target.value }))}
                      className="input py-1 text-xs w-full min-w-20" />
                  ) : (
                    <span className="truncate block max-w-40" style={{ color: 'var(--text-secondary)' }}>
                      {row[c.key] ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </span>
                  )}
                </td>
              ))}
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  {editId === row.id ? (
                    <>
                      <button onClick={saveEdit} className="p-1.5 rounded hover:bg-green-500/20 text-green-500 transition-colors"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(row)} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}><Edit2 size={12} /></button>
                      <button onClick={() => deleteRow(row.id)} disabled={deleting === row.id} className="p-1.5 rounded hover:bg-f1red/20 hover:text-f1red transition-colors" style={{ color: 'var(--text-muted)' }}><Trash2 size={12} /></button>
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
