import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useDataStore } from '../../store/dataStore'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import {
  normalizeDrivers, normalizeTeams, normalizeCircuits,
  normalizeRaces, normalizeResults, normalizeLaps,
  normalizePitStops, normalizeEvents
} from '../../utils/normalizers'
import { Upload, Eye, Save, X } from 'lucide-react'

const DATA_TYPES = [
  { value: 'drivers', label: 'Drivers' },
  { value: 'teams', label: 'Teams' },
  { value: 'circuits', label: 'Circuits' },
  { value: 'seasons', label: 'Seasons' },
  { value: 'races', label: 'Races' },
  { value: 'results', label: 'Results' },
  { value: 'laps', label: 'Laps' },
  { value: 'pit_stops', label: 'Pit Stops' },
  { value: 'race_events', label: 'Race Events' },
]

const SOURCES = [
  { value: 'generic', label: 'Generic JSON/CSV' },
  { value: 'ergast', label: 'Ergast API' },
]

async function buildMaps() {
  const [{ data: drivers }, { data: teams }, { data: circuits }, { data: seasons }] = await Promise.all([
    supabase.from('drivers').select('id, name, code'),
    supabase.from('teams').select('id, name'),
    supabase.from('circuits').select('id, name'),
    supabase.from('seasons').select('id, year'),
  ])
  const driverMap = {}
  drivers?.forEach(d => { driverMap[d.code] = d.id; driverMap[d.name] = d.id })
  const teamMap = {}
  teams?.forEach(t => { teamMap[t.name] = t.id })
  const circuitMap = {}
  circuits?.forEach(c => { circuitMap[c.name] = c.id })
  const seasonMap = {}
  seasons?.forEach(s => { seasonMap[s.year] = s.id })
  return { driverMap, teamMap, circuitMap, seasonMap }
}

export default function AdminImport() {
  const [dataType, setDataType] = useState('drivers')
  const [source, setSource] = useState('generic')
  const [rawText, setRawText] = useState('')
  const [preview, setPreview] = useState(null)
  const [raceId, setRaceId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [races, setRaces] = useState([])
  const [seasons, setSeasonsLocal] = useState([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const { invalidateCache } = useDataStore()

  const loadSelects = async () => {
    try {
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase.from('races').select('id, name').order('date', { ascending: false }),
        supabase.from('seasons').select('id, year').order('year', { ascending: false }),
      ])
      setRaces(r || [])
      setSeasonsLocal(s || [])
    } catch (err) {
      console.error(err)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSelects() }, [])

  const parseRaw = (text) => {
    try {
      return JSON.parse(text)
    } catch {
      const csv = Papa.parse(text.trim(), { header: true, skipEmptyLines: true })
      if (csv.data?.length) return csv.data
      throw new Error('Invalid JSON or CSV')
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setRawText(ev.target.result)
    reader.readAsText(file)
  }

  const handlePreview = async () => {
    if (!rawText.trim()) return toast.error('Paste or upload data first')
    try {
      const parsed = parseRaw(rawText)
      const maps = await buildMaps()
      let normalized

      switch (dataType) {
        case 'drivers': normalized = normalizeDrivers(parsed, source); break
        case 'teams': normalized = normalizeTeams(parsed, source); break
        case 'circuits': normalized = normalizeCircuits(parsed, source); break
        case 'seasons':
          normalized = (Array.isArray(parsed) ? parsed : [parsed]).map(s => ({
            year: parseInt(s.year) || parseInt(s)
          }))
          break
        case 'races':
          normalized = normalizeRaces(parsed, seasonId, maps.circuitMap, source)
          break
        case 'results':
          normalized = normalizeResults(parsed, raceId, maps.driverMap, maps.teamMap, source)
          break
        case 'laps':
          normalized = normalizeLaps(parsed, raceId, maps.driverMap)
          break
        case 'pit_stops':
          normalized = normalizePitStops(parsed, raceId, maps.driverMap)
          break
        case 'race_events':
          normalized = normalizeEvents(parsed, raceId)
          break
        default: normalized = Array.isArray(parsed) ? parsed : [parsed]
      }

      setPreview(normalized)
      toast.success(`Preview ready: ${normalized.length} records`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSave = async () => {
    if (!preview?.length) return
    setLoading(true)
    try {
      const clean = preview.map(row => { const r = { ...row }; if (!r.id) delete r.id; return r })
      const CHUNK = 1000
      for (let i = 0; i < clean.length; i += CHUNK) {
        const { error } = await supabase.from(dataType).upsert(clean.slice(i, i + CHUNK), { ignoreDuplicates: false })
        if (error) throw error
      }
      toast.success(`Saved ${clean.length} ${dataType} records`)
      setPreview(null)
      setRawText('')
      invalidateCache()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const needsRaceId = ['results', 'laps', 'pit_stops', 'race_events'].includes(dataType)
  const needsSeasonId = dataType === 'races'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Import Data</h1>
        <p className="text-white/40 text-sm mt-1">Upload JSON/CSV or paste API response to import data</p>
      </div>

      <div className="glass p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Data Type</label>
            <select value={dataType} onChange={e => { setDataType(e.target.value); setPreview(null) }} className="input">
              {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Source Format</label>
            <select value={source} onChange={e => setSource(e.target.value)} className="input">
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {needsRaceId && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">Race</label>
            <select value={raceId} onChange={e => setRaceId(e.target.value)} className="input">
              <option value="">Select race...</option>
              {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}

        {needsSeasonId && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">Season</label>
            <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className="input">
              <option value="">Select season...</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.year}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-white/50 mb-1 block">Upload File (JSON or CSV)</label>
          <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current.click()} className="btn-ghost flex items-center gap-2">
            <Upload size={14} /> Choose File
          </button>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Or Paste JSON / CSV</label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={8}
            placeholder='[{"name": "Max Verstappen", "code": "VER", "nationality": "Dutch"}]'
            className="input font-mono text-xs resize-y"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={handlePreview} className="btn-ghost flex items-center gap-2">
            <Eye size={14} /> Preview
          </button>
          {preview && (
            <>
              <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
                <Save size={14} /> {loading ? 'Saving...' : `Save ${preview.length} Records`}
              </button>
              <button onClick={() => setPreview(null)} className="btn-ghost flex items-center gap-2">
                <X size={14} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {preview && (
        <div className="glass p-4">
          <h2 className="text-sm font-bold mb-3 text-white/70">Preview ({preview.length} records)</h2>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-dark-800">
                <tr className="text-white/30 border-b border-white/5">
                  {Object.keys(preview[0] || {}).map(k => (
                    <th key={k} className="text-left pb-2 pr-4 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="py-1.5 pr-4 text-white/60 max-w-32 truncate">
                        {v === null || v === undefined ? <span className="text-white/20">null</span> : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="text-white/30 text-xs text-center py-2">Showing 50 of {preview.length} records</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
