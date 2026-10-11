// Supplier invoices and their payment (ADR-0008): per purchase order; figures as printed, in the order's currency.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { projectKeys } from './project'

export type InvoiceRead = components['schemas']['InvoiceRead']
export type InvoiceCreate = components['schemas']['InvoiceCreate']
export type InvoiceUpdate = components['schemas']['InvoiceUpdate']
export type InvoiceKind = InvoiceRead['kind']

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = { deposit: 'Acompte', balance: 'Solde', other: 'Autre' }

export const invoiceKeys = { list: (poId: number) => ['purchase-orders', 'invoices', poId] as const }

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useInvoices(poId: number | undefined) {
  return useQuery({
    queryKey: invoiceKeys.list(poId ?? 0),
    queryFn: () => call(api.GET('/api/v1/purchase-orders/{po_id}/invoices', { params: { path: { po_id: poId ?? 0 } } })),
    enabled: poId !== undefined,
  })
}

export function useCreateInvoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: InvoiceCreate }) =>
      call(api.POST('/api/v1/purchase-orders/{po_id}/invoices', { params: { path: { po_id: poId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateInvoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InvoiceUpdate }) =>
      call(api.PATCH('/api/v1/invoices/{invoice_id}', { params: { path: { invoice_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function usePayInvoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, paidOn, paymentRef }: { id: number; paidOn: string; paymentRef: string | null }) =>
      call(api.POST('/api/v1/invoices/{invoice_id}/pay', { params: { path: { invoice_id: id } }, body: { paidOn, paymentRef } })),
    onSuccess: invalidate,
  })
}

export function useDeleteInvoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/invoices/{invoice_id}', { params: { path: { invoice_id: id } } })),
    onSuccess: invalidate,
  })
}
