import { supabase } from './supabase'

function isLikelyAbsoluteUrl(value) {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')
}

/**
 * Accepts either a full URL or a Supabase Storage object path and returns
 * a browser-loadable URL.
 *
 * Supported inputs:
 * - https://... / http://... / //cdn...
 * - data: / blob:
 * - circuits/123.png (stored path)
 * - images/circuits/123.png (bucket-prefixed path)
 */
export function resolveImageSrc(raw, { bucket = 'images' } = {}) {
  const value = String(raw ?? '').trim()
  if (!value) return null
  if (isLikelyAbsoluteUrl(value)) return value
  if (value.startsWith('/')) return value

  const path = value.startsWith(`${bucket}/`) ? value.slice(bucket.length + 1) : value
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || null
}

