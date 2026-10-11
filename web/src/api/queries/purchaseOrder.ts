// TanStack Query hooks for purchase orders (ADR-0007): list per project, create from approved lines, issue, status, lines, files.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { projectKeys } from './project'

export type PoRead = components['schemas']['PoRead']
export type PoCreate = components['schemas']['PoCreate']
export type PoUpdate = components['schemas']['PoUpdate']
export type PoLineRead = components['schemas']['PoLineRead']
export type PoLineUpdate = components['schemas']['PoLineUpdate']
export type PoStatusChange = components['schemas']['PoStatusChange']
export type PoStatus = PoRead['status']

export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: 'Brouillon',
  issued: 'Émis',
  acknowledged: 'Accusé de réception',
  partially_delivered: 'Partiellement livré',
  closed: 'Clos',
  cancelled: 'Annulé',
}

export const poKeys = { list: (projectId: number) => ['projects', 'purchase-orders', projectId] as const }

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['project-items'] })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useProjectPurchaseOrders(projectId: number | undefined) {
  return useQuery({
    queryKey: poKeys.list(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/purchase-orders', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}

export function useCreatePurchaseOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: PoCreate }) =>
      call(api.POST('/api/v1/projects/{project_id}/purchase-orders', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdatePurchaseOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PoUpdate }) =>
      call(api.PATCH('/api/v1/purchase-orders/{po_id}', { params: { path: { po_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeletePurchaseOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/purchase-orders/{po_id}', { params: { path: { po_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useIssuePurchaseOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/purchase-orders/{po_id}/issue', { params: { path: { po_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useChangePurchaseOrderStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PoStatusChange }) =>
      call(api.POST('/api/v1/purchase-orders/{po_id}/status', { params: { path: { po_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useAddPurchaseOrderLines() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, itemIds }: { id: number; itemIds: number[] }) =>
      call(api.POST('/api/v1/purchase-orders/{po_id}/lines', { params: { path: { po_id: id } }, body: { itemIds } })),
    onSuccess: invalidate,
  })
}

export function useUpdatePurchaseOrderLine() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PoLineUpdate }) =>
      call(api.PATCH('/api/v1/purchase-order-lines/{line_id}', { params: { path: { line_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeletePurchaseOrderLine() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/purchase-order-lines/{line_id}', { params: { path: { line_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useAttachPurchaseOrderFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, fileId, caption }: { id: number; fileId: number; caption?: string | null }) =>
      call(api.POST('/api/v1/purchase-orders/{po_id}/files', { params: { path: { po_id: id } }, body: { fileId, caption: caption ?? null } })),
    onSuccess: invalidate,
  })
}

export function useDetachPurchaseOrderFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, fileId }: { id: number; fileId: number }) =>
      call(api.DELETE('/api/v1/purchase-orders/{po_id}/files/{file_id}', { params: { path: { po_id: id, file_id: fileId } } })),
    onSuccess: invalidate,
  })
}
