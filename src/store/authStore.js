import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../lib/withTimeout'

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  loading: true,
  _initialized: false,
  _initPromise: null,
  _authUnsubscribe: null,

  init: () => {
    const inflight = get()._initPromise
    if (inflight) return inflight

    const run = (async () => {
      const isFirstInit = !get()._initialized
      if (isFirstInit) set({ loading: true })
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 15_000, 'Auth session check timed out')
        if (error) throw error

        const session = data?.session
        if (session?.user) {
          await get().fetchRole(session.user)
        } else {
          set({ user: null, role: null })
        }

        // Ensure we only ever register one auth listener.
        if (!get()._authUnsubscribe) {
          const { data: subData } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
            try {
              if (nextSession?.user) {
                await get().fetchRole(nextSession.user)
              } else {
                set({ user: null, role: null })
              }
            } catch (e) {
              console.error('Auth state change handler failed:', e)
            }
          })

          const unsubscribe = subData?.subscription?.unsubscribe
          set({ _authUnsubscribe: typeof unsubscribe === 'function' ? unsubscribe : null })
        }
      } catch (e) {
        console.error('Auth init failed:', e)
        set({ user: null, role: null })
      } finally {
        set({ loading: false, _initPromise: null, _initialized: true })
      }
    })()

    set({ _initPromise: run })
    return run
  },

  fetchRole: async (user) => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single(),
        15_000,
        'Role lookup timed out',
      )
      if (error) throw error
      set({ user, role: data?.role || 'user' })
    } catch (e) {
      console.warn('Failed to fetch role, falling back to user:', e)
      set({ user, role: 'user' })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, role: null })
  },

  isAdmin: () => get().role === 'admin',
}))
