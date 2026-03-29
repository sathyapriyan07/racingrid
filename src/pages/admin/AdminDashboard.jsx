import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { StatCard } from '../../components/ui'
import { Link } from 'react-router-dom'
import { Upload, RefreshCw } from 'lucide-react'

export default function AdminDashboard() {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    const tables = ['drivers', 'teams', 'circuits', 'seasons', 'races', 'results', 'laps', 'pit_stops']
    Promise.all(
      tables.map(t => supabase.from(t).select('id', { count: 'exact', head: true }).then(r => [t, r.count]))
    ).then(results => setCounts(Object.fromEntries(results))).catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Admin Dashboard</h1>
        <p className="text-secondary text-sm mt-1">Manage all F1Base data</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Drivers" value={counts.drivers ?? '…'} />
        <StatCard label="Teams" value={counts.teams ?? '…'} />
        <StatCard label="Circuits" value={counts.circuits ?? '…'} />
        <StatCard label="Seasons" value={counts.seasons ?? '…'} />
        <StatCard label="Races" value={counts.races ?? '…'} />
        <StatCard label="Results" value={counts.results ?? '…'} />
        <StatCard label="Laps" value={counts.laps ?? '…'} />
        <StatCard label="Pit Stops" value={counts.pit_stops ?? '…'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/admin/import">
          <div className="glass-hover p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-f1red/15 flex items-center justify-center">
              <Upload size={18} className="text-f1red" />
            </div>
            <div>
              <div className="font-semibold">Import Data</div>
              <div className="text-xs text-secondary mt-0.5">Upload JSON/CSV or paste API response</div>
            </div>
          </div>
        </Link>
        <Link to="/admin/sync">
          <div className="glass-hover p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <RefreshCw size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="font-semibold">Sync Tools</div>
              <div className="text-xs text-secondary mt-0.5">Fetch from Ergast or OpenF1</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
