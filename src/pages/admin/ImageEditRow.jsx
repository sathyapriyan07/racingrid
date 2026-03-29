import { useRef, useState } from 'react'
import { Check, X, Upload, Loader } from 'lucide-react'
import { uploadImage } from '../../lib/uploadImage'
import toast from 'react-hot-toast'

/**
 * Full-width expandable edit row for image URL or file upload.
 * Renders as a <tr> with colSpan — must be inside a <tbody>.
 */
export default function ImageEditRow({ colSpan, folder, currentUrl, onSave, onCancel }) {
  const [url, setUrl] = useState(currentUrl || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const publicUrl = await uploadImage(file, folder)
      setUrl(publicUrl)
      toast.success('Uploaded — click Save to apply')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <tr className="border-b border-border bg-muted">
      <td colSpan={colSpan} className="px-3 py-3">
        <div className="flex flex-col gap-2">
          {/* URL input row */}
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste URL or upload file below..."
              className="input py-2 text-xs flex-1"
              autoFocus
            />
          </div>

          {/* File upload + preview */}
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs btn-ghost"
            >
              {uploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
            {url && (
              <img src={url} alt="preview" className="h-8 w-auto max-w-20 object-contain rounded bg-muted" />
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2">
            <button
              onClick={() => onSave(url)}
              disabled={uploading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold"
            >
              <Check size={13} /> Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-secondary text-xs"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}
