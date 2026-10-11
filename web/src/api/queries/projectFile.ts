// Issued exports of a project (ADR-0009): the list; the download itself is a plain link to the API.
import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ProjectFileRead = components['schemas']['ProjectFileRead']
export type ExportVariant = ProjectFileRead['variant']

export const EXPORT_VARIANT_LABELS: Record<ExportVariant, string> = { internal: 'interne', client: 'client' }

export const exportKeys = { list: (projectId: number) => ['projects', 'exports', projectId] as const }

export function scheduleExportUrl(projectId: number, variant: ExportVariant): string {
  return `/api/v1/projects/${projectId}/exports/schedule.xlsx?variant=${variant}`
}

export function useProjectExports(projectId: number | undefined) {
  return useQuery({
    queryKey: exportKeys.list(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/exports', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}
