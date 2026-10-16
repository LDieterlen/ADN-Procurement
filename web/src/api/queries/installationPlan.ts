// Floor plans of a project (ADR-0024), drawn on the installation sheets: an image, or a PDF drawn from its first
// page, white margins cut off. GET/POST /projects/{id}/installation-plans, PATCH/DELETE /installation-plans/{id}.
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { installationKeys, useInvalidate } from './installationSheet'

export type InstallationPlanRead = components['schemas']['InstallationPlanRead']

export function useInstallationPlans(projectId: number) {
  return useQuery({
    queryKey: installationKeys.plans(projectId),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/installation-plans', { params: { path: { project_id: projectId } } })),
  })
}

export function useCreateInstallationPlan(projectId: number) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: { fileId: number; name?: string | null }) =>
      call(api.POST('/api/v1/projects/{project_id}/installation-plans', { params: { path: { project_id: projectId } }, body })),
    onSuccess: invalidate,
  })
}

export function useRenameInstallationPlan(projectId: number) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      call(api.PATCH('/api/v1/installation-plans/{plan_id}', { params: { path: { plan_id: id } }, body: { name } })),
    onSuccess: invalidate,
  })
}

export function useDeleteInstallationPlan(projectId: number) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/installation-plans/{plan_id}', { params: { path: { plan_id: id } } })).then(() => undefined),
    onSuccess: invalidate,
  })
}
