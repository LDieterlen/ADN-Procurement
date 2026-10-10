// TanStack Query hooks for /categories (flat two-level tree).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type CategoryRead = components['schemas']['CategoryRead']
export type CategoryCreate = components['schemas']['CategoryCreate']
export type CategoryUpdate = components['schemas']['CategoryUpdate']

export const categoryKeys = {
  all: ['categories'] as const,
  list: (includeArchived: boolean) => ['categories', 'list', { includeArchived }] as const,
  one: (id: number) => ['categories', 'one', id] as const,
}

export function useCategories(includeArchived: boolean) {
  return useQuery({
    queryKey: categoryKeys.list(includeArchived),
    queryFn: () => call(api.GET('/api/v1/categories', { params: { query: { includeArchived } } })),
  })
}

export function useCategory(id: number | undefined) {
  return useQuery({
    queryKey: categoryKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/categories/{category_id}', { params: { path: { category_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: categoryKeys.all })
}

export function useCreateCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: CategoryCreate) => call(api.POST('/api/v1/categories', { body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) =>
      call(api.PATCH('/api/v1/categories/{category_id}', { params: { path: { category_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useArchiveCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/categories/{category_id}/archive', { params: { path: { category_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/categories/{category_id}/unarchive', { params: { path: { category_id: id } } })),
    onSuccess: invalidate,
  })
}
