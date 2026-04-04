import { create } from 'zustand'

export const useUIStore = create((set) => ({
  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),

  accent: null,
  setAccent: (accent) => set({ accent }),
  clearAccent: () => set({ accent: null }),
}))
