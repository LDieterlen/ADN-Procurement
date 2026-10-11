// Receipts of a purchase order (ADR-0008): list, record (partial or complete), delete as a correction.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { projectKeys } from './project'

export type DeliveryRead = components['schemas']['DeliveryRead']
export type DeliveryCreate = components['schemas']['DeliveryCreate']

export const deliveryKeys = { list: (poId: number) => ['purchase-orders', 'deliveries', poId] as const }

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['project-items'] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useDeliveries(poId: number | undefined) {
  return useQuery({
    queryKey: deliveryKeys.list(poId ?? 0),
    queryFn: () => call(api.GET('/api/v1/purchase-orders/{po_id}/deliveries', { params: { path: { po_id: poId ?? 0 } } })),
    enabled: poId !== undefined,
  })
}

export function useCreateDelivery() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: DeliveryCreate }) =>
      call(api.POST('/api/v1/purchase-orders/{po_id}/deliveries', { params: { path: { po_id: poId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteDelivery() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/deliveries/{delivery_id}', { params: { path: { delivery_id: id } } })),
    onSuccess: invalidate,
  })
}
