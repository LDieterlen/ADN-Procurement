// TanStack Query hooks for /suppliers (paginated catalogue list).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type SupplierRead = components['schemas']['SupplierRead']
export type SupplierCreate = components['schemas']['SupplierCreate']
export type SupplierUpdate = components['schemas']['SupplierUpdate']
export type SupplierPage = components['schemas']['Page_SupplierRead_']

export type ListParams = { q: string; includeArchived: boolean; limit: number; offset: number }

export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (params: ListParams) => ['suppliers', 'list', params] as const,
  one: (id: number) => ['suppliers', 'one', id] as const,
}

export function useSuppliers(params: ListParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () =>
      call(
        api.GET('/api/v1/suppliers', {
          params: { query: { q: params.q.trim() || undefined, includeArchived: params.includeArchived, limit: params.limit, offset: params.offset } },
        }),
      ),
  })
}

export function useSupplier(id: number | undefined) {
  return useQuery({
    queryKey: supplierKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/suppliers/{supplier_id}', { params: { path: { supplier_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: supplierKeys.all })
}

export function useCreateSupplier() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ data, force }: { data: SupplierCreate; force?: boolean }) =>
      call(api.POST('/api/v1/suppliers', { body: data, params: { query: { force: force ?? false } } })),
    onSuccess: invalidate,
  })
}

export function useUpdateSupplier() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SupplierUpdate }) =>
      call(api.PATCH('/api/v1/suppliers/{supplier_id}', { params: { path: { supplier_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useArchiveSupplier() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/suppliers/{supplier_id}/archive', { params: { path: { supplier_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveSupplier() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/suppliers/{supplier_id}/unarchive', { params: { path: { supplier_id: id } } })),
    onSuccess: invalidate,
  })
}
