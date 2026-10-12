// TanStack Query hooks for the forecast envelopes and the project summary (ADR-0013). Every figure
// comes from the server; the front never adds anything up.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type BudgetLineRead = components['schemas']['BudgetLineRead']
export type BudgetLineIn = components['schemas']['BudgetLineIn']
export type BudgetScope = BudgetLineIn['scope']
export type ProjectSummaryRead = components['schemas']['ProjectSummaryRead']
export type LineAmountsRead = components['schemas']['LineAmountsRead']
export type SummaryRowRead = components['schemas']['SummaryRowRead']
export type StatusShareRead = components['schemas']['StatusShareRead']
export type SummaryAxis = 'location' | 'zone' | 'family' | 'type' | 'supplier'
export type SummaryFilters = { locationId: number | null; zone: string | null; family: string | null; categoryId: number | null; supplierId: number | null }

export const NO_SUMMARY_FILTERS: SummaryFilters = { locationId: null, zone: null, family: null, categoryId: null, supplierId: null }
export const AXIS_LABELS: Record<SummaryAxis, string> = {
  location: 'Localisation',
  zone: 'Zone',
  family: 'Famille',
  type: 'Type de produit',
  supplier: 'Fournisseur',
}

export const budgetKeys = {
  lines: (projectId: number) => ['projects', 'budget-lines', projectId] as const,
  summary: (projectId: number, filters: SummaryFilters) => ['projects', 'summary', projectId, filters] as const,
}

export function useBudgetLines(projectId: number | undefined) {
  return useQuery({
    queryKey: budgetKeys.lines(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/budget-lines', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}

export function usePutBudgetLines() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, lines }: { projectId: number; lines: BudgetLineIn[] }) =>
      call(api.PUT('/api/v1/projects/{project_id}/budget-lines', { params: { path: { project_id: projectId } }, body: { lines } })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useProjectSummary(projectId: number | undefined, filters: SummaryFilters = NO_SUMMARY_FILTERS) {
  return useQuery({
    queryKey: budgetKeys.summary(projectId ?? 0, filters),
    queryFn: () =>
      call(
        api.GET('/api/v1/projects/{project_id}/summary', {
          params: {
            path: { project_id: projectId ?? 0 },
            query: {
              locationId: filters.locationId ?? undefined,
              zone: filters.zone ?? undefined,
              family: filters.family ?? undefined,
              categoryId: filters.categoryId ?? undefined,
              supplierId: filters.supplierId ?? undefined,
            },
          },
        }),
      ),
    enabled: projectId !== undefined,
  })
}

/** A `BudgetLineIn` from a stored row (PUT replaces every envelope, so the others are re-sent as they are). */
export function toBudgetLineIn(row: BudgetLineRead): BudgetLineIn {
  return {
    scope: row.scope,
    locationId: row.locationId,
    zone: row.zone,
    family: row.family,
    supplierId: row.supplierId,
    amountCents: row.amountCents,
    notes: row.notes,
  }
}
