// Listing profiles (ADR-0023): which columns a listing PDF prints, by recipient. GET/POST/PATCH/DELETE
// /listing-profiles, and the fixed column catalogue with its labels (GET /listing-profiles/columns).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ListingProfileRead = components['schemas']['ListingProfileRead']
export type ListingColumn = ListingProfileRead['columns'][number]
export type ListingColumnRead = components['schemas']['ListingColumnRead']

const keys = { profiles: ['listing-profiles'] as const, columns: ['listing-profiles', 'columns'] as const }

export function useListingProfiles() {
  return useQuery({ queryKey: keys.profiles, queryFn: () => call(api.GET('/api/v1/listing-profiles')) })
}

export function useListingColumns() {
  return useQuery({ queryKey: keys.columns, queryFn: () => call(api.GET('/api/v1/listing-profiles/columns')), staleTime: Infinity })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.profiles, exact: true })
}

export function useCreateListingProfile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: { name: string; columns: ListingColumn[] }) => call(api.POST('/api/v1/listing-profiles', { body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateListingProfile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name: string; columns: ListingColumn[] }) =>
      call(api.PATCH('/api/v1/listing-profiles/{profile_id}', { params: { path: { profile_id: id } }, body })),
    onSuccess: invalidate,
  })
}

export function useDeleteListingProfile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/listing-profiles/{profile_id}', { params: { path: { profile_id: id } } })).then(() => undefined),
    onSuccess: invalidate,
  })
}
