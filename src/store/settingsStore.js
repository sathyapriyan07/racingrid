import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSettingsStore = create((set, get) => ({
  settings: {},

  fetchSettings: async () => {
    const { data, error } = await supabase.from('app_settings').select('key, value')
    if (error) return
    const map = {}
    data?.forEach(r => { map[r.key] = r.value })
    set({ settings: map })
    return map
  },

  getSetting: (key, fallback = null) => get().settings[key] || fallback,
}))
