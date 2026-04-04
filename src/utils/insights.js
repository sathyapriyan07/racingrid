export function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n)
}

export function parsePos(pos) {
  const n = typeof pos === 'string' ? parseInt(pos, 10) : pos
  return Number.isFinite(n) ? n : null
}

export function isDnfResult(result) {
  const pos = parsePos(result?.position)
  const status = (result?.status || '').toString().toLowerCase()
  if (pos == null) return true
  if (!status) return false
  if (status.includes('finished')) return false
  if (/\+\d+\s*lap/.test(status)) return false // classified
  return /(dnf|retired|accident|collision|engine|gearbox|hydraul|brake|suspension|puncture|disqualified|excluded|not classified|withdrawn)/i.test(status)
}

export function calcConsistency(results = []) {
  const races = results.filter(r => r?.race_id)
  const raceCount = races.length || 0
  const classified = races.filter(r => parsePos(r.position) != null && !isDnfResult(r))

  const avgFinish = classified.length
    ? classified.reduce((s, r) => s + (parsePos(r.position) || 0), 0) / classified.length
    : null

  const dnfCount = races.filter(isDnfResult).length
  const pointsFinishes = races.filter(r => (parseFloat(r.points) || 0) > 0).length

  const avgNorm = avgFinish == null ? 0 : (20 - Math.min(20, Math.max(1, avgFinish))) / 19
  const pointsRate = raceCount ? pointsFinishes / raceCount : 0
  const dnfRate = raceCount ? dnfCount / raceCount : 0

  const score = Math.round(100 * (0.55 * avgNorm + 0.30 * pointsRate + 0.15 * (1 - dnfRate)))

  let tier = 'Weak'
  if (score >= 80) tier = 'Elite'
  else if (score >= 65) tier = 'Strong'
  else if (score >= 50) tier = 'Mid'

  return { raceCount, avgFinish, dnfCount, pointsFinishes, score, tier, pointsRate, dnfRate }
}

export function buildQualiRaceDelta({ results = [], qualifying = [] }) {
  const qualiByRace = new Map(qualifying.map(q => [q.race_id, q]))
  const rows = results
    .filter(r => r?.race_id)
    .map(r => {
      const q = qualiByRace.get(r.race_id)
      const qualiPos = parsePos(q?.position)
      const racePos = parsePos(r?.position)
      const delta = (qualiPos != null && racePos != null) ? (qualiPos - racePos) : null
      return {
        raceId: r.race_id,
        raceName: r.races?.name,
        year: r.races?.seasons?.year,
        round: r.races?.round,
        date: r.races?.date,
        qualiPos,
        racePos,
        delta,
      }
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  return rows
}

export function calcOvertakesFromLaps(laps = []) {
  const byRace = {}
  laps.forEach(l => {
    const raceId = l.race_id
    if (!raceId) return
    if (!byRace[raceId]) byRace[raceId] = []
    byRace[raceId].push(l)
  })
  const totals = {}
  Object.entries(byRace).forEach(([raceId, list]) => {
    const sorted = [...list].sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0))
    let overtakes = 0
    let prev = null
    for (const lap of sorted) {
      const pos = parsePos(lap.position)
      if (pos == null) continue
      if (prev != null) {
        const gained = prev - pos
        if (gained > 0) overtakes += gained
      }
      prev = pos
    }
    totals[raceId] = overtakes
  })
  return totals
}

export function parseLapTimeToMs(value) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null

  // numeric seconds or ms as string
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    if (!Number.isFinite(n)) return null
    // assume seconds when below 10k
    return n > 10_000 ? Math.round(n) : Math.round(n * 1000)
  }

  // "M:SS.mmm" or "SS.mmm"
  const parts = s.split(':')
  if (parts.length === 1) {
    const sec = Number(parts[0])
    if (!Number.isFinite(sec)) return null
    return Math.round(sec * 1000)
  }
  if (parts.length === 2) {
    const min = Number(parts[0])
    const sec = Number(parts[1])
    if (!Number.isFinite(min) || !Number.isFinite(sec)) return null
    return Math.round((min * 60 + sec) * 1000)
  }
  return null
}

export function formatMs(ms) {
  if (!Number.isFinite(ms)) return '—'
  const total = Math.max(0, Math.round(ms))
  const min = Math.floor(total / 60_000)
  const rem = total - min * 60_000
  const sec = Math.floor(rem / 1000)
  const milli = rem - sec * 1000
  const secStr = String(sec).padStart(2, '0')
  const msStr = String(milli).padStart(3, '0')
  return `${min}:${secStr}.${msStr}`
}
