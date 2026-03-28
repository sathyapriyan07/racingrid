import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminTable from './AdminTable'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'dob', label: 'DOB' },
]

export default function AdminDrivers() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
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
            <AdminTable table="drivers" data={data} columns={COLUMNS} onRefresh={load} />
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
