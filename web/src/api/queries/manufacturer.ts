// TanStack Query hooks for /manufacturers (paginated catalogue list).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import type { ListParams } from './supplier'

export type ManufacturerRead = components['schemas']['ManufacturerRead']
export type ManufacturerCreate = components['schemas']['ManufacturerCreate']
export type ManufacturerUpdate = components['schemas']['ManufacturerUpdate']

export const manufacturerKeys = {
  all: ['manufacturers'] as const,
  list: (params: ListParams) => ['manufacturers', 'list', params] as const,
  one: (id: number) => ['manufacturers', 'one', id] as const,
}

export function useManufacturers(params: ListParams) {
  return useQuery({
    queryKey: manufacturerKeys.list(params),
    queryFn: () =>
      call(
        api.GET('/api/v1/manufacturers', {
          params: { query: { q: params.q.trim() || undefined, includeArchived: params.includeArchived, limit: params.limit, offset: params.offset } },
        }),
      ),
  })
}

export function useManufacturer(id: number | undefined) {
  return useQuery({
    queryKey: manufacturerKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/manufacturers/{manufacturer_id}', { params: { path: { manufacturer_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: manufacturerKeys.all })
}

export function useCreateManufacturer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ data, force }: { data: ManufacturerCreate; force?: boolean }) =>
      call(api.POST('/api/v1/manufacturers', { body: data, params: { query: { force: force ?? false } } })),
    onSuccess: invalidate,
  })
}

export function useUpdateManufacturer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ManufacturerUpdate }) =>
      call(api.PATCH('/api/v1/manufacturers/{manufacturer_id}', { params: { path: { manufacturer_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useArchiveManufacturer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/manufacturers/{manufacturer_id}/archive', { params: { path: { manufacturer_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveManufacturer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/manufacturers/{manufacturer_id}/unarchive', { params: { path: { manufacturer_id: id } } })),
    onSuccess: invalidate,
  })
}
