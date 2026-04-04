import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loaded: false,
  loading: false,
  error: null,

  fetchSettings: async () => {
    const s = get()
    if (s.loaded || s.loading) return s.settings
    set({ loading: true, error: null })

    const { data, error } = await supabase.from('app_settings').select('key, value')
    if (error) {
      // `app_settings` is optional; avoid repeated 404 spam on hosts where it isn't deployed.
      set({ loaded: true, loading: false, error })
      return get().settings
    }
    const map = {}
    data?.forEach(r => { map[r.key] = r.value })
    set({ settings: map, loaded: true, loading: false, error: null })
    return map
  },

  getSetting: (key, fallback = null) => get().settings[key] || fallback,
}))
