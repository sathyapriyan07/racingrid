import { useState } from 'react'
import { Check, X } from 'lucide-react'

export default function SocialLinksEditRow({ colSpan, row, onSave, onCancel }) {
  const [instagramUrl, setInstagramUrl] = useState(row.instagram_url || '')
  const [twitterUrl, setTwitterUrl] = useState(row.twitter_url || '')

  return (
    <tr className="border-b border-border bg-muted">
      <td colSpan={colSpan} className="px-3 py-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Social Links</p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)}
              placeholder="Instagram (handle or URL)"
              className="input text-xs py-1.5 flex-1 min-w-60"
            />
            <input
              value={twitterUrl}
              onChange={e => setTwitterUrl(e.target.value)}
              placeholder="Twitter/X (handle or URL)"
              className="input text-xs py-1.5 flex-1 min-w-60"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSave(instagramUrl, twitterUrl)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold"
            >
              <Check size={12} /> Save
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-secondary text-xs"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

