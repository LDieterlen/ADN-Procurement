// Issued PDFs of a project (ADR-0009, ADR-0013): the list, the spec sheets issued (an official
// diffusion or a working document, ADR-0022), the listing link.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ProjectFileRead = components['schemas']['ProjectFileRead']
export type ExportKind = ProjectFileRead['kind']

export const EXPORT_KIND_LABELS: Record<ExportKind, string> = { sheets_pdf: 'Fiches de prescription', list_pdf: 'Listing' }

export const exportKeys = { list: (projectId: number) => ['projects', 'exports', projectId] as const }

export type SheetsIssue = components['schemas']['SheetsIssue']

/** « Fiches PDF »: issues the sheets (one PDF per paper); a diffusion moves the indices. */
export function useIssueSheets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: SheetsIssue }) =>
      call(api.POST('/api/v1/projects/{project_id}/exports/sheets', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['project-items'] })
    },
  })
}

/** The listing PDF: white paper for a printer, the columns of a listing profile (ADR-0023), the options on demand. */
export function listExportUrl(projectId: number, printable = false, profileId: number | null = null, options = false): string {
  const query = new URLSearchParams()
  if (printable) query.set('print', 'true')
  if (profileId !== null) query.set('profile', String(profileId))
  if (options) query.set('options', 'true')
  const text = query.toString()
  return `/api/v1/projects/${projectId}/exports/list.pdf${text ? `?${text}` : ''}`
}

export function useProjectExports(projectId: number | undefined) {
  return useQuery({
    queryKey: exportKeys.list(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/exports', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}
