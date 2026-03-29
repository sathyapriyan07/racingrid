import { useState } from 'react'
import { Check, X } from 'lucide-react'

export default function TextEditRow({ colSpan, label, currentValue, onSave, onCancel, rows = 4 }) {
  const [value, setValue] = useState(currentValue || '')

  return (
    <tr className="border-b border-white/5 bg-white/3">
      <td colSpan={colSpan} className="px-3 py-3">
        <div className="flex flex-col gap-2">
          {label && <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>}
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={rows}
            placeholder="Enter text..."
            className="input text-xs py-2 resize-y"
            style={{ borderRadius: '0.75rem', fontFamily: 'inherit' }}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => onSave(value)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold">
              <Check size={12} /> Save
            </button>
            <button onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}
