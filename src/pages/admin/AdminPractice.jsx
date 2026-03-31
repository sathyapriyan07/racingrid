import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Card, Select, Spinner } from '../../components/ui'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'

const SESSIONS = ['FP1', 'FP2', 'FP3']

function parseLapTimeToMs(value) {
  const s = String(value || '').trim()
  if (!s) return null
  const m = s.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (!m) return null
  const minutes = parseInt(m[1])
  const seconds = parseInt(m[2])
  const millis = m[3] ? parseInt(m[3].padEnd(3, '0')) : 0
  if (Number.isNaN(minutes) || Number.isNaN(seconds) || Number.isNaN(millis)) return null
  return ((minutes * 60) + seconds) * 1000 + millis
}

function formatMsToLapTime(ms) {
  if (ms === null || ms === undefined) return ''
  const total = Math.max(0, Math.round(ms))
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const millis = total % 1000
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function parseGapToMs(value) {
  const s = String(value || '').trim()
  if (!s) return null
  const n = parseFloat(s.replace(/^\+/, ''))
  if (Number.isNaN(n)) return null
  return Math.round(n * 1000)
}

export default function AdminPractice() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState('')
  const [races, setRaces] = useState([])
  const [raceId, setRaceId] = useState(searchParams.get('raceId') || '')
  const [session, setSession] = useState(searchParams.get('session') || 'FP1')

  const [drivers, setDrivers] = useState([])
  const [teams, setTeams] = useState([])

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})

  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ driver_id: '', team_id: '', position: '', time: '', gap: '', laps: '' })
  const [driverSearch, setDriverSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [autoTime, setAutoTime] = useState(true)

  const driverById = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers])
  const teamById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams])
  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter(d => {
      const name = (d.name || '').toLowerCase()
      const code = (d.code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [drivers, driverSearch])

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(t => (t.name || '').toLowerCase().includes(q))
  }, [teams, teamSearch])

  const loadSeasons = async () => {
    const { data, error } = await supabase.from('seasons').select('*').order('year', { ascending: false })
    if (error) throw error
    setSeasons(data || [])
  }

  const loadRaces = async (sid) => {
    if (!sid) { setRaces([]); return }
    const { data, error } = await supabase
      .from('races')
      .select('id, name, round, date')
      .eq('season_id', sid)
      .order('round')
    if (error) throw error
    setRaces(data || [])
  }

  const loadLookups = async () => {
    const [{ data: d, error: dErr }, { data: t, error: tErr }] = await Promise.all([
      supabase.from('drivers').select('id, name, code').order('name'),
      supabase.from('teams').select('id, name').order('name'),
    ])
    if (dErr) throw dErr
    if (tErr) throw tErr
    setDrivers(d || [])
    setTeams(t || [])
  }

  const loadRows = async (rid, sess) => {
    if (!rid) { setRows([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('practice_results')
        .select('*, drivers(id, name, code), teams(id, name, logo_url)')
        .eq('race_id', rid)
        .eq('session', sess)
        .order('position')
      if (error) throw error
      setRows(data || [])
    } catch (err) {
      toast.error(err.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const hydrateFromRaceId = async (rid) => {
    if (!rid) return
    const { data, error } = await supabase.from('races').select('id, season_id').eq('id', rid).single()
    if (error) return
    if (data?.season_id) setSeasonId(data.season_id)
  }

  useEffect(() => {
    loadSeasons().catch(e => toast.error(e.message))
    loadLookups().catch(e => toast.error(e.message))
  }, [])

  useEffect(() => { hydrateFromRaceId(raceId) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadRaces(seasonId).catch(e => toast.error(e.message)) }, [seasonId])

  useEffect(() => {
    if (!autoTime) return
    const pos = parseInt(newRow.position)
    if (!pos || pos <= 1) return
    const gapMs = parseGapToMs(newRow.gap)
    if (gapMs === null) return

    const above =
      rows.find(r => r.position === pos - 1)
      || rows.filter(r => (parseInt(r.position) || 0) < pos).sort((a, b) => (parseInt(b.position) || 0) - (parseInt(a.position) || 0))[0]

    const aboveMs = parseLapTimeToMs(above?.time)
    if (aboveMs === null) return

    const nextMs = aboveMs + gapMs
    const formatted = formatMsToLapTime(nextMs)
    if (formatted && formatted !== newRow.time) setNewRow(r => ({ ...r, time: formatted }))
  }, [autoTime, newRow.position, newRow.gap, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (raceId) next.set('raceId', raceId)
    else next.delete('raceId')
    if (session) next.set('session', session)
    else next.delete('session')
    setSearchParams(next, { replace: true })
    loadRows(raceId, session)
  }, [raceId, session]) // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (row) => {
    setEditId(row.id)
    setEditData({
      id: row.id,
      race_id: row.race_id,
      session: row.session,
      driver_id: row.driver_id,
      team_id: row.team_id,
      position: row.position ?? '',
      time: row.time ?? '',
      gap: row.gap ?? '',
      laps: row.laps ?? '',
    })
  }

  const cancelEdit = () => { setEditId(null); setEditData({}) }

  const saveEdit = async () => {
    try {
      const payload = {
        driver_id: editData.driver_id || null,
        team_id: editData.team_id || null,
        position: editData.position === '' ? null : parseInt(editData.position),
        time: editData.time || null,
        gap: editData.gap || null,
        laps: editData.laps === '' ? null : parseInt(editData.laps),
      }
      const { error } = await supabase.from('practice_results').update(payload).eq('id', editId)
      if (error) throw error
      toast.success('Updated')
      setEditId(null)
      await loadRows(raceId, session)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const deleteRow = async (id) => {
    if (!window.confirm('Delete this classification row?')) return
    const { error } = await supabase.from('practice_results').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Deleted')
    loadRows(raceId, session)
  }

  const addRow = async () => {
    if (!raceId) return toast.error('Select a race')
    if (!newRow.driver_id) return toast.error('Select a driver')
    setAdding(true)
    try {
      const pos = newRow.position === '' ? null : parseInt(newRow.position)
      let time = newRow.time || null
      if (!time && pos && pos > 1 && newRow.gap) {
        const gapMs = parseGapToMs(newRow.gap)
        const above =
          rows.find(r => r.position === pos - 1)
          || rows.filter(r => (parseInt(r.position) || 0) < pos).sort((a, b) => (parseInt(b.position) || 0) - (parseInt(a.position) || 0))[0]
        const aboveMs = parseLapTimeToMs(above?.time)
        if (gapMs !== null && aboveMs !== null) time = formatMsToLapTime(aboveMs + gapMs) || null
      }

      if (pos === 1 && !time) throw new Error('Position 1 requires a time')

      const payload = {
        race_id: raceId,
        session,
        driver_id: newRow.driver_id,
        team_id: newRow.team_id || null,
        position: pos,
        time,
        gap: newRow.gap || null,
        laps: newRow.laps === '' ? null : parseInt(newRow.laps),
      }
      const { error } = await supabase
        .from('practice_results')
        .upsert(payload, { onConflict: 'race_id,session,driver_id' })
      if (error) throw error
      toast.success('Saved')
      setNewRow({ driver_id: '', team_id: '', position: '', time: '', gap: '', laps: '' })
      setAutoTime(true)
      await loadRows(raceId, session)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Practice Classifications</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manually enter FP1/FP2/FP3 classification rows.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Season</label>
            <Select value={seasonId} onChange={e => setSeasonId(e.target.value)}>
              <option value="">Select season...</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.year}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Race</label>
            <Select value={raceId} onChange={e => setRaceId(e.target.value)}>
              <option value="">Select race...</option>
              {races.map(r => <option key={r.id} value={r.id}>{r.round}. {r.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Session</label>
            <Select value={session} onChange={e => setSession(e.target.value)}>
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="min-w-56 flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Driver</label>
            <input
              value={driverSearch}
              onChange={e => setDriverSearch(e.target.value)}
              placeholder="Search driver (name/code)..."
              className="input mb-2"
            />
            <Select value={newRow.driver_id} onChange={e => setNewRow(r => ({ ...r, driver_id: e.target.value }))}>
              <option value="">Select driver...</option>
              {filteredDrivers.map(d => (
                <option key={d.id} value={d.id}>{d.code ? `${d.code} — ` : ''}{d.name}</option>
              ))}
            </Select>
          </div>
          <div className="min-w-48">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Team (optional)</label>
            <input
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              placeholder="Search team..."
              className="input mb-2"
            />
            <Select value={newRow.team_id} onChange={e => setNewRow(r => ({ ...r, team_id: e.target.value }))}>
              <option value="">—</option>
              {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div className="w-20">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Pos</label>
            <input
              value={newRow.position}
              onChange={e => { setNewRow(r => ({ ...r, position: e.target.value })); setAutoTime(true) }}
              className="input"
            />
          </div>
          <div className="w-28">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Time</label>
            <input
              value={newRow.time}
              onChange={e => { setNewRow(r => ({ ...r, time: e.target.value })); setAutoTime(false) }}
              className="input"
              placeholder="1:18.123"
            />
          </div>
          <div className="w-24">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Gap</label>
            <input
              value={newRow.gap}
              onChange={e => { setNewRow(r => ({ ...r, gap: e.target.value })); setAutoTime(true) }}
              className="input"
              placeholder="+0.123"
            />
          </div>
          <div className="w-20">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Laps</label>
            <input value={newRow.laps} onChange={e => setNewRow(r => ({ ...r, laps: e.target.value }))} className="input" />
          </div>
          <button onClick={addRow} disabled={adding} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={12} /> {adding ? 'Saving...' : 'Add / Update'}
          </button>
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          rows.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No classification rows yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <th className="text-left pb-2 pr-4 font-medium">Pos</th>
                    <th className="text-left pb-2 pr-4 font-medium">Driver</th>
                    <th className="text-left pb-2 pr-4 font-medium">Team</th>
                    <th className="text-left pb-2 pr-4 font-medium">Time</th>
                    <th className="text-left pb-2 pr-4 font-medium">Gap</th>
                    <th className="text-left pb-2 pr-4 font-medium">Laps</th>
                    <th className="text-right pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const isEditing = editId === r.id
                    const d = driverById[r.driver_id] || r.drivers
                    const t = teamById[r.team_id] || r.teams
                    return (
                      <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 pr-4 w-16">
                          {isEditing ? (
                            <input value={editData.position ?? ''} onChange={e => setEditData(x => ({ ...x, position: e.target.value }))} className="input py-1 text-xs w-16" />
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{r.position ?? '—'}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 min-w-52">
                          {isEditing ? (
                            <Select value={editData.driver_id || ''} onChange={e => setEditData(x => ({ ...x, driver_id: e.target.value }))}>
                              <option value="">Select...</option>
                              {drivers.map(dd => (
                                <option key={dd.id} value={dd.id}>{dd.code ? `${dd.code} — ` : ''}{dd.name}</option>
                              ))}
                            </Select>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{d?.name || '—'}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 min-w-44">
                          {isEditing ? (
                            <Select value={editData.team_id || ''} onChange={e => setEditData(x => ({ ...x, team_id: e.target.value }))}>
                              <option value="">—</option>
                              {teams.map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                            </Select>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{t?.name || '—'}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 min-w-24">
                          {isEditing ? (
                            <input value={editData.time ?? ''} onChange={e => setEditData(x => ({ ...x, time: e.target.value }))} className="input py-1 text-xs w-24" />
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{r.time || '—'}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 min-w-20">
                          {isEditing ? (
                            <input value={editData.gap ?? ''} onChange={e => setEditData(x => ({ ...x, gap: e.target.value }))} className="input py-1 text-xs w-20" />
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{r.gap || '—'}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 w-16">
                          {isEditing ? (
                            <input value={editData.laps ?? ''} onChange={e => setEditData(x => ({ ...x, laps: e.target.value }))} className="input py-1 text-xs w-16" />
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{r.laps ?? '—'}</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} className="p-1.5 rounded hover:bg-green-500/20 text-green-500 transition-colors"><Check size={12} /></button>
                                <button onClick={cancelEdit} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(r)} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}><Edit2 size={12} /></button>
                                <button onClick={() => deleteRow(r.id)} className="p-1.5 rounded hover:bg-f1red/20 hover:text-f1red transition-colors" style={{ color: 'var(--text-muted)' }}><Trash2 size={12} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  )
}
