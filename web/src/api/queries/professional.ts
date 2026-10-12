// TanStack Query hooks for /professionals (paginated catalogue list).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import type { ListParams } from './supplier'

export type ProfessionalRead = components['schemas']['ProfessionalRead']
export type ProfessionalCreate = components['schemas']['ProfessionalCreate']
export type ProfessionalUpdate = components['schemas']['ProfessionalUpdate']

export const professionalKeys = {
  all: ['professionals'] as const,
  list: (params: ListParams) => ['professionals', 'list', params] as const,
  one: (id: number) => ['professionals', 'one', id] as const,
}

export function useProfessionals(params: ListParams) {
  return useQuery({
    queryKey: professionalKeys.list(params),
    queryFn: () =>
      call(
        api.GET('/api/v1/professionals', {
          params: { query: { q: params.q.trim() || undefined, includeArchived: params.includeArchived, limit: params.limit, offset: params.offset } },
        }),
      ),
  })
}

export function useProfessional(id: number | undefined) {
  return useQuery({
    queryKey: professionalKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/professionals/{professional_id}', { params: { path: { professional_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: professionalKeys.all })
}

export function useCreateProfessional() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ data, force }: { data: ProfessionalCreate; force?: boolean }) =>
      call(api.POST('/api/v1/professionals', { body: data, params: { query: { force: force ?? false } } })),
    onSuccess: invalidate,
  })
}

export function useUpdateProfessional() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProfessionalUpdate }) =>
      call(api.PATCH('/api/v1/professionals/{professional_id}', { params: { path: { professional_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useArchiveProfessional() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/professionals/{professional_id}/archive', { params: { path: { professional_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveProfessional() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/professionals/{professional_id}/unarchive', { params: { path: { professional_id: id } } })),
    onSuccess: invalidate,
  })
}
