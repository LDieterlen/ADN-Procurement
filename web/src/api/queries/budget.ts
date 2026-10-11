// TanStack Query hooks for budget lines, alerts and the multi-project dashboard.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type BudgetLineRead = components['schemas']['BudgetLineRead']
export type BudgetLineIn = components['schemas']['BudgetLineIn']
export type BudgetSummaryRead = components['schemas']['BudgetSummaryRead']
export type BudgetRowRead = components['schemas']['BudgetRowRead']
export type AlertRead = components['schemas']['AlertRead']
export type DashboardProjectRead = components['schemas']['DashboardProjectRead']

export const budgetKeys = {
  lines: (projectId: number) => ['projects', 'budget-lines', projectId] as const,
  alerts: (projectId: number) => ['projects', 'alerts', projectId] as const,
  dashboard: ['dashboard'] as const,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: budgetKeys.dashboard })
    },
  })
}

export function useProjectAlerts(projectId: number | undefined) {
  return useQuery({
    queryKey: budgetKeys.alerts(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/alerts', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}

export function useDashboard() {
  return useQuery({ queryKey: budgetKeys.dashboard, queryFn: () => call(api.GET('/api/v1/dashboard')) })
}
