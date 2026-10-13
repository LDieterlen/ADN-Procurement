// TanStack Query hooks for /projects and the locations nested under a project.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ProjectRead = components['schemas']['ProjectRead']
export type ProjectListRead = components['schemas']['ProjectListRead']
export type ProjectCreate = components['schemas']['ProjectCreate']
export type ProjectUpdate = components['schemas']['ProjectUpdate']
export type ProjectStatus = ProjectRead['status']
export type LocationRead = components['schemas']['LocationRead']
export type LocationCreate = components['schemas']['LocationCreate']
export type LocationUpdate = components['schemas']['LocationUpdate']

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  prospect: 'Prospect',
  active: 'En cours',
  delivered: 'Livré',
  closed: 'Clos',
  cancelled: 'Annulé',
}
export const CLOSED_STATUSES: ProjectStatus[] = ['closed', 'cancelled']

export const projectKeys = {
  all: ['projects'] as const,
  list: (status: ProjectStatus | null) => ['projects', 'list', { status }] as const,
  one: (id: number) => ['projects', 'one', id] as const,
  locations: (id: number, includeArchived: boolean) => ['projects', 'locations', id, { includeArchived }] as const,
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

// --- locations -----------------------------------------------------------------------------

export function locationLabel(location: LocationRead): string {
  return `${location.code} — ${location.name}${location.multiplier > 1 ? ` (×${location.multiplier})` : ''}`
}

/** Declares the next diffusion letter (A, B, C…); the articles changed since the previous one take it. */
export function useNextProjectIndice() {
  const invalidate = useInvalidate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/projects/{project_id}/indice', { params: { path: { project_id: id } } })),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['projects', 'summary'] })
    },
  })
}

/** Takes the last declaration back (wrong click): previous letter on the project and its articles. */
export function useRevertProjectIndice() {
  const invalidate = useInvalidate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/projects/{project_id}/indice', { params: { path: { project_id: id } } })),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['projects', 'summary'] })
    },
  })
}

export function useLocations(projectId: number | undefined, includeArchived: boolean) {
  return useQuery({
    queryKey: projectKeys.locations(projectId ?? 0, includeArchived),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/locations', { params: { path: { project_id: projectId ?? 0 }, query: { includeArchived } } })),
    enabled: projectId !== undefined,
  })
}

export function useCreateLocation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: LocationCreate }) =>
      call(api.POST('/api/v1/projects/{project_id}/locations', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateLocation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LocationUpdate }) =>
      call(api.PATCH('/api/v1/locations/{location_id}', { params: { path: { location_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteLocation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/locations/{location_id}', { params: { path: { location_id: id } } })).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useArchiveLocation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/locations/{location_id}/archive', { params: { path: { location_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveLocation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/locations/{location_id}/unarchive', { params: { path: { location_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useReorderLocations() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ projectId, locationIds }: { projectId: number; locationIds: number[] }) =>
      call(api.POST('/api/v1/projects/{project_id}/locations/reorder', { params: { path: { project_id: projectId } }, body: { locationIds } })),
    onSuccess: invalidate,
  })
}
