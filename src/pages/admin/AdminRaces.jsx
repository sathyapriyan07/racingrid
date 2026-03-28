import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminTable from './AdminTable'
import { Spinner } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'date', label: 'Date' },
  { key: 'round', label: 'Round' },
]

export default function AdminRaces() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      let q = supabase.from('races').select('*, seasons(year)').order('date', { ascending: false })
      if (seasonId) q = q.eq('season_id', seasonId)
      const { data, error } = await q
      if (error) throw error
      setData(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.from('seasons').select('*').order('year', { ascending: false })
      .then(({ data }) => setSeasons(data || []))
      .catch(console.error)
  }, [])

  useEffect(() => { load() }, [seasonId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Races</h1>
        <Link to="/admin/import" className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={12} /> Import
        </Link>
      </div>
      <div className="glass p-4">
        <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className="input max-w-xs mb-4">
          <option value="">All Seasons</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.year}</option>)}
        </select>
        {loading ? <Spinner /> : (
          <AdminTable
            table="races"
            data={data.map(r => ({ ...r, season: r.seasons?.year }))}
            columns={[...COLUMNS, { key: 'season', label: 'Season', editable: false }]}
            onRefresh={load}
          />
        )}
      </div>
    </div>
  )
}
