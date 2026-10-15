// TanStack Query hooks for the articles of a project: list, sheet, placements, status, journal, files.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { projectKeys } from './project'

export type ProjectItemRead = components['schemas']['ProjectItemRead']
export type ProjectItemCreate = components['schemas']['ProjectItemCreate']
export type ProjectItemUpdate = components['schemas']['ProjectItemUpdate']
export type PlacementRead = components['schemas']['PlacementRead']
export type StatusChange = components['schemas']['StatusChange']
export type EventRead = components['schemas']['EventRead']
export type ItemFileAttach = components['schemas']['ItemFileAttach']
export type ItemFileRead = components['schemas']['ItemFileRead']
export type ItemStatus = ProjectItemRead['status']

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  to_quote: 'À chiffrer',
  quoted: 'Devisé',
  to_review: 'À revoir',
  approved: 'Validé',
  deposit: 'Acompte',
  purchased: 'Acheté',
  cancelled: 'Annulé',
}
export const ITEM_STATUSES = Object.keys(ITEM_STATUS_LABELS) as ItemStatus[]

export type ItemFilters = { status: ItemStatus | null; supplierId: number | null; q: string }

export const itemKeys = {
  list: (projectId: number, filters?: ItemFilters) => ['projects', 'items', projectId, filters ?? null] as const,
  one: (id: number) => ['project-items', 'one', id] as const,
  events: (id: number) => ['project-items', 'events', id] as const,
}

export function useProjectItems(projectId: number | undefined, filters?: ItemFilters) {
  return useQuery({
    queryKey: itemKeys.list(projectId ?? 0, filters),
    queryFn: () =>
      call(
        api.GET('/api/v1/projects/{project_id}/project-items', {
          params: {
            path: { project_id: projectId ?? 0 },
            query: filters ? { status: filters.status ?? undefined, supplierId: filters.supplierId ?? undefined, q: filters.q.trim() || undefined } : undefined,
          },
        }),
      ),
    enabled: projectId !== undefined,
  })
}

export function useProjectItem(id: number | undefined) {
  return useQuery({
    queryKey: itemKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/project-items/{item_id}', { params: { path: { item_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

export function useItemEvents(id: number | undefined) {
  return useQuery({
    queryKey: itemKeys.events(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/project-items/{item_id}/events', { params: { path: { item_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

/** Every article mutation invalidates the project's articles, summary and the article itself. */
function useInvalidateItems() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['projects', 'items'] })
    void queryClient.invalidateQueries({ queryKey: ['projects', 'summary'] })
    void queryClient.invalidateQueries({ queryKey: ['project-items'] })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useCreateItem() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: ProjectItemCreate }) =>
      call(api.POST('/api/v1/projects/{project_id}/project-items', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/project-items/{item_id}', { params: { path: { item_id: id } } })).then(() => undefined),
    onSuccess: (_result, id) => {
      // The deleted article is forgotten, never fetched again (a 404, and Back would show it).
      queryClient.removeQueries({ queryKey: itemKeys.one(id) })
      queryClient.removeQueries({ queryKey: itemKeys.events(id) })
      invalidate()
    },
  })
}

export type ItemSave = components['schemas']['ItemSave']

/** « Enregistrer » on the article page: every pending change at once, all or nothing. */
export function useSaveItem() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ItemSave }) =>
      call(api.POST('/api/v1/project-items/{item_id}/save', { params: { path: { item_id: id } }, body: data })),
    onSuccess: (saved) => {
      // The saved article at once in the cache: the page compares its draft with it, so nothing
      // looks pending while the refetch runs (no false « unsaved changes »).
      queryClient.setQueryData(itemKeys.one(saved.id), saved)
      invalidate()
    },
  })
}

export function useChangeItemStatus() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: StatusChange }) =>
      call(api.POST('/api/v1/project-items/{item_id}/status', { params: { path: { item_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useAttachItemFile() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: ItemFileAttach }) =>
      call(api.POST('/api/v1/project-items/{item_id}/files', { params: { path: { item_id: itemId } }, body: data })),
    onSuccess: invalidate,
  })
}
