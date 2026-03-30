import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/uploadImage'
import { resolveImageSrc } from '../../lib/resolveImageSrc'
import { useSettingsStore } from '../../store/settingsStore'
import toast from 'react-hot-toast'
import { Upload, Loader, X } from 'lucide-react'
import { useRef } from 'react'

const ICONS = [
  { key: 'icon_trophy',   label: 'Trophy',        emoji: '🏆', desc: 'Championship badge, standings P1' },
  { key: 'icon_flag',     label: 'Nationality',   emoji: '🌍', desc: 'Fallback when no flag image is set' },
  { key: 'icon_location', label: 'Location Pin',  emoji: '📍', desc: 'Base location, circuit location' },
  { key: 'icon_calendar', label: 'Race Date',     emoji: '📅', desc: 'Race date on race page' },
  { key: 'icon_birthday', label: 'Date of Birth', emoji: '🎂', desc: 'Driver date of birth' },
  { key: 'icon_champion', label: 'Champion Star', emoji: '⭐', desc: 'Season champion label' },
]

function IconRow({ icon, value, onSave }) {
  const [url, setUrl] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileRef = useRef()

  useEffect(() => { setUrl(value || ''); setDirty(false) }, [value])

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const publicUrl = await uploadImage(file, 'icons')
      setUrl(publicUrl)
      setDirty(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => { onSave(icon.key, url); setDirty(false) }
  const handleClear = () => { setUrl(''); setDirty(true) }

  return (
    <div className="glass p-4 flex items-center gap-4 flex-wrap">
      {/* Emoji fallback + preview */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
        style={{ background: 'var(--bg-raised)' }}>
        {url
          ? <img src={resolveImageSrc(url) || url} alt={icon.label} className="w-8 h-8 object-contain" />
          : icon.emoji
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{icon.label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{icon.desc}</div>
      </div>

      {/* URL input */}
      <input
        value={url}
        onChange={e => { setUrl(e.target.value); setDirty(true) }}
        placeholder="Paste image URL..."
        className="input text-xs py-1.5 w-48 hidden sm:block"
      />

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs btn-ghost">
          {uploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {url && (
          <button onClick={handleClear} className="btn-icon w-7 h-7" title="Clear">
            <X size={12} />
          </button>
        )}
        {dirty && (
          <button onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-f1red/20 text-f1red border border-f1red/25">
            Save
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminMedia() {
  const { settings, fetchSettings } = useSettingsStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings().finally(() => setLoading(false))
  }, [])

  const handleSave = async (key, value) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: value || null }, { onConflict: 'key' })
    if (error) return toast.error(error.message)
    toast.success('Saved')
    fetchSettings()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Media & Icons</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Replace emoji icons with custom images. Falls back to emoji if not set.
        </p>
      </div>

      {/* Per-entity images reminder */}
      <div className="glass p-4 text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
        <div className="font-semibold text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Per-entity images are managed separately:</div>
        <div>• Driver photos &amp; country flags → <a href="/admin/drivers" className="text-f1red hover:underline">Admin → Drivers</a></div>
        <div>• Team logos, car images &amp; country flags → <a href="/admin/teams" className="text-f1red hover:underline">Admin → Teams</a></div>
        <div>• Circuit layout images → <a href="/admin/circuits" className="text-f1red hover:underline">Admin → Circuits</a></div>
      </div>

      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Global UI Icons</h2>
        {loading ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div className="space-y-2">
            {ICONS.map(icon => (
              <IconRow
                key={icon.key}
                icon={icon}
                value={settings[icon.key]}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
