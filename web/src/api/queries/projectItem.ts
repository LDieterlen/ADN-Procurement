// TanStack Query hooks for project lines, placements, status, journal and the project summary.
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
export type ReplaceProduct = components['schemas']['ReplaceProduct']
export type EventRead = components['schemas']['EventRead']
export type ProjectSummaryRead = components['schemas']['ProjectSummaryRead']
export type LineAmountsRead = components['schemas']['LineAmountsRead']
export type ItemStatus = ProjectItemRead['status']
export type ItemKind = ProjectItemRead['kind']

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  draft: 'Brouillon',
  specified: 'Spécifié',
  quoted: 'Chiffré',
  approved: 'Validé',
  ordered: 'Commandé',
  delivered: 'Livré',
  installed: 'Installé',
  cancelled: 'Annulé',
  replaced: 'Remplacé',
}
export const ITEM_KIND_LABELS: Record<ItemKind, string> = { ffe: 'FF&E', ose: 'OS&E', custom: 'Sur mesure', existing: 'Existant', fee: 'Frais' }

export type ItemFilters = { status: ItemStatus | null; kind: ItemKind | null; supplierId: number | null; q: string }

export const itemKeys = {
  list: (projectId: number, filters?: ItemFilters) => ['projects', 'items', projectId, filters ?? null] as const,
  one: (id: number) => ['project-items', 'one', id] as const,
  events: (id: number) => ['project-items', 'events', id] as const,
  summary: (projectId: number) => ['projects', 'summary', projectId] as const,
}

export function useProjectItems(projectId: number | undefined, filters?: ItemFilters) {
  return useQuery({
    queryKey: itemKeys.list(projectId ?? 0, filters),
    queryFn: () =>
      call(
        api.GET('/api/v1/projects/{project_id}/project-items', {
          params: {
            path: { project_id: projectId ?? 0 },
            query: filters
              ? {
                  status: filters.status ?? undefined,
                  kind: filters.kind ?? undefined,
                  supplierId: filters.supplierId ?? undefined,
                  q: filters.q.trim() || undefined,
                }
              : undefined,
          },
        }),
      ),
    enabled: projectId !== undefined,
  })
}

export function useProjectSummary(projectId: number | undefined) {
  return useQuery({
    queryKey: itemKeys.summary(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/summary', { params: { path: { project_id: projectId ?? 0 } } })),
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

/** Every line mutation invalidates the project's lines, summary and the line itself. */
function useInvalidateLines() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['projects', 'items'] })
    void queryClient.invalidateQueries({ queryKey: ['projects', 'summary'] })
    void queryClient.invalidateQueries({ queryKey: ['project-items'] })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useCreateItem() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: ProjectItemCreate }) =>
      call(api.POST('/api/v1/projects/{project_id}/project-items', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateItem() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectItemUpdate }) =>
      call(api.PATCH('/api/v1/project-items/{item_id}', { params: { path: { item_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/project-items/{item_id}', { params: { path: { item_id: id } } })).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useChangeItemStatus() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: StatusChange }) =>
      call(api.POST('/api/v1/project-items/{item_id}/status', { params: { path: { item_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useReplaceItemProduct() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReplaceProduct }) =>
      call(api.POST('/api/v1/project-items/{item_id}/replace', { params: { path: { item_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useRefreshItem() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/project-items/{item_id}/refresh', { params: { path: { item_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useAddPlacement() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: PlacementCreate }) =>
      call(api.POST('/api/v1/project-items/{item_id}/placements', { params: { path: { item_id: itemId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdatePlacement() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlacementUpdate }) =>
      call(api.PATCH('/api/v1/placements/{placement_id}', { params: { path: { placement_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeletePlacement() {
  const invalidate = useInvalidateLines()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/placements/{placement_id}', { params: { path: { placement_id: id } } })),
    onSuccess: invalidate,
  })
}
