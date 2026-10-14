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
export type PlacementCreate = components['schemas']['PlacementCreate']
export type PlacementUpdate = components['schemas']['PlacementUpdate']
export type StatusChange = components['schemas']['StatusChange']
export type EventRead = components['schemas']['EventRead']
export type ItemFileAttach = components['schemas']['ItemFileAttach']
export type ItemFileUpdate = components['schemas']['ItemFileUpdate']
export type ItemFileRead = components['schemas']['ItemFileRead']
export type ItemStatus = ProjectItemRead['status']
export type ItemKind = ProjectItemRead['kind']

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
/** Statuses shown as a filled pill (the client has committed). */
export const ENGAGED_STATUSES: ItemStatus[] = ['approved', 'deposit', 'purchased']

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

export function useUpdateItem() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectItemUpdate }) =>
      call(api.PATCH('/api/v1/project-items/{item_id}', { params: { path: { item_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/project-items/{item_id}', { params: { path: { item_id: id } } })).then(() => undefined),
    onSuccess: invalidate,
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

export function useAddPlacement() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: PlacementCreate }) =>
      call(api.POST('/api/v1/project-items/{item_id}/placements', { params: { path: { item_id: itemId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdatePlacement() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlacementUpdate }) =>
      call(api.PATCH('/api/v1/placements/{placement_id}', { params: { path: { placement_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeletePlacement() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/placements/{placement_id}', { params: { path: { placement_id: id } } })),
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

export function useUpdateItemFile() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ itemId, fileId, data }: { itemId: number; fileId: number; data: ItemFileUpdate }) =>
      call(api.PATCH('/api/v1/project-items/{item_id}/files/{file_id}', { params: { path: { item_id: itemId, file_id: fileId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDetachItemFile() {
  const invalidate = useInvalidateItems()
  return useMutation({
    mutationFn: ({ itemId, fileId }: { itemId: number; fileId: number }) =>
      call(api.DELETE('/api/v1/project-items/{item_id}/files/{file_id}', { params: { path: { item_id: itemId, file_id: fileId } } })),
    onSuccess: invalidate,
  })
}
