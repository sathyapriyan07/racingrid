import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { searchAll } from './search'
import { withTimeout } from '../lib/withTimeout'

function throwIfError(result) {
  if (result?.error) throw result.error
  return result?.data || []
}

export function useDriversQuery() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await withTimeout(
        supabase.from('drivers').select('*').order('name'),
        20_000,
        'Drivers request timed out',
      )
      return throwIfError(res)
    },
  })
}

export function useTeamsQuery() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await withTimeout(
        supabase.from('teams').select('*').order('name'),
        20_000,
        'Teams request timed out',
      )
      return throwIfError(res)
    },
  })
}

export function useCircuitsQuery() {
  return useQuery({
    queryKey: ['circuits'],
    queryFn: async () => {
      const res = await withTimeout(
        supabase.from('circuits').select('*').order('name'),
        20_000,
        'Circuits request timed out',
      )
      return throwIfError(res)
    },
  })
}

export function useGlobalSearchQuery(query) {
  const q = (query || '').trim()
  return useQuery({
    queryKey: ['search', q],
    enabled: q.length > 0,
    queryFn: () => searchAll(q, { limit: 6 }),
    staleTime: 2 * 60_000,
  })
}

export function useSearchAllQuery(query, { limit = 20 } = {}) {
  const q = (query || '').trim()
  return useQuery({
    queryKey: ['search_all', q, limit],
    enabled: q.length > 0,
    queryFn: () => searchAll(q, { limit }),
    staleTime: 2 * 60_000,
  })
}
