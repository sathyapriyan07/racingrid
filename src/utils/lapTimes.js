import { parseLapTimeToMs } from './insights'

export function summarizeLapTimes(rows = []) {
  const byDriver = new Map() // driverId -> { n, sum, sumSq }

  for (const r of rows || []) {
    const driverId = r?.driver_id
    if (!driverId) continue
    const ms = parseLapTimeToMs(r?.lap_time)
    if (!Number.isFinite(ms)) continue
    const prev = byDriver.get(driverId) || { n: 0, sum: 0, sumSq: 0 }
    prev.n += 1
    prev.sum += ms
    prev.sumSq += ms * ms
    byDriver.set(driverId, prev)
  }

  const out = new Map() // driverId -> { avgMs, stdMs, n }
  for (const [driverId, agg] of byDriver.entries()) {
    const avg = agg.n ? agg.sum / agg.n : null
    const variance = agg.n ? Math.max(0, agg.sumSq / agg.n - (avg * avg)) : null
    const std = variance == null ? null : Math.sqrt(variance)
    out.set(driverId, { avgMs: avg, stdMs: std, n: agg.n })
  }

  return out
}

