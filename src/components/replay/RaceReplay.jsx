import { useState, useCallback } from 'react'
import { useReplayEngine } from '../../hooks/useReplayEngine'
import TrackCanvas from './TrackCanvas'
import { Spinner } from '../ui'

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20]

function formatTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RaceReplay({ sessionKey }) {
  const {
    status, error,
    playing, speed, setSpeed,
    currentTime, totalTime,
    currentLap, totalLaps,
    drivers, leaderboard, trackPoints,
    play, pause, seek, seekToLap, reset,
  } = useReplayEngine(sessionKey)

  const [highlighted, setHighlighted] = useState([])

  const toggleHighlight = useCallback((abbr) => {
    setHighlighted(h => h.includes(abbr) ? h.filter(x => x !== abbr) : [...h, abbr])
  }, [])

  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16" style={{ color: 'var(--text-muted)' }}>
        <Spinner />
        <p className="text-sm">Loading telemetry data from OpenF1...</p>
        <p className="text-xs opacity-60">This may take 30–60 seconds for the first load</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center py-12">
        <p className="text-f1red text-sm mb-1">Failed to load replay data</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    )
  }

  if (status !== 'ready') return null

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: '#0a0a0f' }}>
      {/* Main layout: track + leaderboard */}
      <div className="flex flex-col md:flex-row" style={{ minHeight: 360 }}>

        {/* Track canvas */}
        <div className="flex-1 relative" style={{ minHeight: 300 }}>
          <TrackCanvas
            trackPoints={trackPoints}
            drivers={drivers}
            highlightedDrivers={highlighted}
            playbackSpeed={speed}
            showDriverNames={true}
          />
          {/* Lap badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
            Lap {currentLap} / {totalLaps}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="md:w-44 border-t md:border-t-0 md:border-l overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.08)', maxHeight: 400 }}>
          {leaderboard.map((drv, i) => {
            const isHighlighted = highlighted.includes(drv.abbr)
            return (
              <button key={drv.num} onClick={() => toggleHighlight(drv.abbr)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                style={{ background: isHighlighted ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                <span className="text-xs font-bold w-5 text-right shrink-0"
                  style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.5)' }}>
                  {i + 1}
                </span>
                <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: drv.color }} />
                <span className="text-xs font-bold text-white">{drv.abbr}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Playback controls */}
      <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full cursor-pointer relative group"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            seek((e.clientX - rect.left) / rect.width * totalTime)
          }}>
          <div className="h-full rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%`, background: '#E10600' }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Play/Pause/Reset */}
          <button onClick={currentTime >= totalTime ? reset : playing ? pause : play}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-f1red hover:bg-red-700 transition-colors text-white shrink-0">
            {currentTime >= totalTime ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            ) : playing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Time */}
          <span className="text-xs font-bold tabular-nums" style={{ color: '#fff' }}>
            {formatTime(currentTime)}
            <span className="ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>/ {formatTime(totalTime)}</span>
          </span>

          {/* Lap selector */}
          {totalLaps > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Lap</span>
              <select value={currentLap}
                onChange={e => seekToLap(Number(e.target.value))}
                className="text-xs font-bold rounded px-2 py-1 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                {Array.from({ length: totalLaps }, (_, i) => i + 1).map(l => (
                  <option key={l} value={l} style={{ background: '#111' }}>{l}</option>
                ))}
              </select>
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>/{totalLaps}</span>
            </div>
          )}

          {/* Speed */}
          <div className="flex items-center gap-1 ml-auto">
            {SPEED_OPTIONS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="px-2 py-1 text-xs font-bold rounded transition-colors"
                style={{
                  background: speed === s ? '#E10600' : 'rgba(255,255,255,0.08)',
                  color: speed === s ? '#fff' : 'rgba(255,255,255,0.5)',
                }}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
