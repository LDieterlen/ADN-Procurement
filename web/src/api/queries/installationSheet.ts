// Installation sheets (ADR-0024): sheets per room, the plan and the articles in their cells on A3 pages.
// GET/POST /projects/{id}/installation-sheets, GET/PATCH/DELETE /installation-sheets/{id}, PUT …/items, and the PDFs.
// The plans are in installationPlan.ts.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type InstallationSheetDetail = components['schemas']['InstallationSheetDetail']
export type InstallationArticle = components['schemas']['InstallationArticle']
export type InstallationLayout = components['schemas']['InstallationLayout']
export type InstallationSheetCreate = components['schemas']['InstallationSheetCreate']
export type InstallationSheetUpdate = components['schemas']['InstallationSheetUpdate']
export type PerPage = NonNullable<InstallationSheetUpdate['perPage']>

export const PER_PAGE_OPTIONS: { value: '8' | '12' | '16'; label: string }[] = [
  { value: '8', label: '8 articles' },
  { value: '12', label: '12 articles' },
  { value: '16', label: '16 articles' },
]

export type Arrangement = NonNullable<InstallationSheetUpdate['arrangement']>
export type Rotation = NonNullable<InstallationSheetUpdate['planRotation']>

export const ARRANGEMENT_OPTIONS: { value: Arrangement; label: string }[] = [
  { value: 'ring', label: 'Autour du plan' },
  { value: 'sides', label: 'À gauche et à droite' },
  { value: 'ends', label: 'En haut et en bas' },
  { value: 'right', label: 'À droite du plan' },
]

export const ROTATION_OPTIONS: { value: '0' | '90' | '180' | '270'; label: string }[] = [
  { value: '0', label: 'Droit' },
  { value: '90', label: 'Tourné de 90° à droite' },
  { value: '180', label: 'Retourné (180°)' },
  { value: '270', label: 'Tourné de 90° à gauche' },
]

export const installationKeys = {
  plans: (projectId: number) => ['projects', 'installation-plans', projectId] as const, // installationPlan.ts
  sheets: (projectId: number) => ['projects', 'installation-sheets', projectId] as const,
  // Under ['projects']: an article, a location or a diffusion changed refreshes the open sheet too.
  sheet: (sheetId: number) => ['projects', 'installation-sheet', sheetId] as const,
}

/** The A3 PDF of one sheet, or of every sheet of the project (of one room with `locationId`). */
export function sheetPdfUrl(sheetId: number, printable = false): string {
  return `/api/v1/installation-sheets/${sheetId}/pdf${printable ? '?print=true' : ''}`
}

export function installationPdfUrl(projectId: number, locationId: number | null = null, printable = false): string {
  const query = new URLSearchParams()
  if (locationId !== null) query.set('locationId', String(locationId))
  if (printable) query.set('print', 'true')
  const text = query.toString()
  return `/api/v1/projects/${projectId}/installation.pdf${text ? `?${text}` : ''}`
}

export function useInstallationSheets(projectId: number) {
  return useQuery({
    queryKey: installationKeys.sheets(projectId),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/installation-sheets', { params: { path: { project_id: projectId } } })),
  })
}

export function useInstallationSheet(sheetId: number) {
  return useQuery({
    queryKey: installationKeys.sheet(sheetId),
    queryFn: () => call(api.GET('/api/v1/installation-sheets/{sheet_id}', { params: { path: { sheet_id: sheetId } } })),
  })
}

/** Plans and sheets go together (a plan drawn on sheets): every change refreshes both. */
export function useInvalidate(projectId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: installationKeys.plans(projectId) }),
      queryClient.invalidateQueries({ queryKey: installationKeys.sheets(projectId) }),
      queryClient.invalidateQueries({ queryKey: ['projects', 'installation-sheet'] }),
    ])
}

export function useCreateInstallationSheet(projectId: number) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: InstallationSheetCreate) =>
      call(api.POST('/api/v1/projects/{project_id}/installation-sheets', { params: { path: { project_id: projectId } }, body })),
    onSuccess: invalidate,
  })
}

export function useUpdateInstallationSheet(projectId: number) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, ...body }: InstallationSheetUpdate & { id: number }) =>
      call(api.PATCH('/api/v1/installation-sheets/{sheet_id}', { params: { path: { sheet_id: id } }, body })),
    onSuccess: invalidate,
  })
}

export type InstallationSheetItemsSet = components['schemas']['InstallationSheetItemsSet']

export function useSetInstallationSheetItems(projectId: number) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, cells }: InstallationSheetItemsSet & { id: number }) =>
      call(api.PUT('/api/v1/installation-sheets/{sheet_id}/items', { params: { path: { sheet_id: id } }, body: { cells } })),
    onSuccess: invalidate,
  })
}

export function useDeleteInstallationSheet(projectId: number) {
  const invalidate = useInvalidate(projectId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/installation-sheets/{sheet_id}', { params: { path: { sheet_id: id } } })).then(() => undefined),
    onSuccess: (_result, id) => {
      // Forgotten, never fetched again: no « introuvable » flash before leaving its page.
      queryClient.removeQueries({ queryKey: installationKeys.sheet(id) })
      void invalidate()
    },
  })
}
