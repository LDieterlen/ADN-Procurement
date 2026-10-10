// TanStack Query hooks for /projects and the zones nested under a project.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ProjectRead = components['schemas']['ProjectRead']
export type ProjectCreate = components['schemas']['ProjectCreate']
export type ProjectUpdate = components['schemas']['ProjectUpdate']
export type ProjectStatus = ProjectRead['status']
export type ZoneRead = components['schemas']['ZoneRead']
export type ZoneCreate = components['schemas']['ZoneCreate']
export type ZoneUpdate = components['schemas']['ZoneUpdate']

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  prospect: 'Prospect',
  active: 'Actif',
  delivered: 'Livré',
  closed: 'Clos',
  cancelled: 'Annulé',
}
export const CLOSED_STATUSES: ProjectStatus[] = ['closed', 'cancelled']

export const projectKeys = {
  all: ['projects'] as const,
  list: (status: ProjectStatus | null) => ['projects', 'list', { status }] as const,
  one: (id: number) => ['projects', 'one', id] as const,
  zones: (id: number, includeArchived: boolean) => ['projects', 'zones', id, { includeArchived }] as const,
}

export function useProjects(status: ProjectStatus | null) {
  return useQuery({
    queryKey: projectKeys.list(status),
    queryFn: () => call(api.GET('/api/v1/projects', { params: { query: { status: status ?? undefined } } })),
  })
}

export function useProject(id: number | undefined) {
  return useQuery({
    queryKey: projectKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}', { params: { path: { project_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.all })
}

export function useCreateProject() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (data: ProjectCreate) => call(api.POST('/api/v1/projects', { body: data })), onSuccess: invalidate })
}

export function useUpdateProject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectUpdate }) =>
      call(api.PATCH('/api/v1/projects/{project_id}', { params: { path: { project_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useChangeProjectStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProjectStatus }) =>
      call(api.POST('/api/v1/projects/{project_id}/status', { params: { path: { project_id: id } }, body: { status } })),
    onSuccess: invalidate,
  })
}

// --- zones ---------------------------------------------------------------------------------

export function useZones(projectId: number | undefined, includeArchived: boolean) {
  return useQuery({
    queryKey: projectKeys.zones(projectId ?? 0, includeArchived),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/zones', { params: { path: { project_id: projectId ?? 0 }, query: { includeArchived } } })),
    enabled: projectId !== undefined,
  })
}

export function useCreateZone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: ZoneCreate }) =>
      call(api.POST('/api/v1/projects/{project_id}/zones', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateZone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ZoneUpdate }) =>
      call(api.PATCH('/api/v1/zones/{zone_id}', { params: { path: { zone_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteZone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/zones/{zone_id}', { params: { path: { zone_id: id } } })).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useArchiveZone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/zones/{zone_id}/archive', { params: { path: { zone_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveZone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/zones/{zone_id}/unarchive', { params: { path: { zone_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useReorderZones() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ projectId, zoneIds }: { projectId: number; zoneIds: number[] }) =>
      call(api.POST('/api/v1/projects/{project_id}/zones/reorder', { params: { path: { project_id: projectId } }, body: { zoneIds } })),
    onSuccess: invalidate,
  })
}
