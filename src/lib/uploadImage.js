import { supabase } from './supabase'

/**
 * Upload a file to Supabase Storage bucket "images" and return the public URL.
 * @param {File} file
 * @param {string} folder  e.g. 'drivers', 'teams', 'circuits'
 * @returns {Promise<string>} public URL
 */
export async function uploadImage(file, folder) {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('images').getPublicUrl(path)
  return data.publicUrl
}
