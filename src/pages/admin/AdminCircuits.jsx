import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminTable from './AdminTable'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  { key: 'country', label: 'Country' },
]

export default function AdminCircuits() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('circuits').select('*').order('name')
    setData(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Circuits</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={12} /> Import
        </Link>
      </div>
      <div className="glass p-4">
        {loading ? <Spinner /> : <AdminTable table="circuits" data={data} columns={COLUMNS} onRefresh={load} />}
      </div>
    </div>
  )
}
