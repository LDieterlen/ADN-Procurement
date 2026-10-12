// Issued PDFs of a project (ADR-0009, ADR-0013): the list; the download itself is a plain link to the API.
import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ProjectFileRead = components['schemas']['ProjectFileRead']
export type ExportKind = ProjectFileRead['kind']

export const EXPORT_KIND_LABELS: Record<ExportKind, string> = { sheets_pdf: 'Fiches de prescription', list_pdf: 'Listing' }

export const exportKeys = { list: (projectId: number) => ['projects', 'exports', projectId] as const }

export function sheetsExportUrl(projectId: number): string {
  return `/api/v1/projects/${projectId}/exports/sheets.pdf`
}

export function listExportUrl(projectId: number): string {
  return `/api/v1/projects/${projectId}/exports/list.pdf`
}

export function useProjectExports(projectId: number | undefined) {
  return useQuery({
    queryKey: exportKeys.list(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/exports', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}
