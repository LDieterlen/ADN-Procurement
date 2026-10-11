// TanStack Query hooks for supplier quotes (ADR-0006): quotes of a project, lines, retain, files, comparison per line.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { projectKeys } from './project'

export type QuoteRead = components['schemas']['QuoteRead']
export type QuoteCreate = components['schemas']['QuoteCreate']
export type QuoteUpdate = components['schemas']['QuoteUpdate']
export type QuoteLineRead = components['schemas']['QuoteLineRead']
export type QuoteLineCreate = components['schemas']['QuoteLineCreate']
export type QuoteLineUpdate = components['schemas']['QuoteLineUpdate']
export type ItemQuoteRead = components['schemas']['ItemQuoteRead']

export const quoteKeys = {
  list: (projectId: number) => ['projects', 'quotes', projectId] as const,
  forItem: (itemId: number) => ['project-items', 'quotes', itemId] as const,
}

function useInvalidateQuotes() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['project-items'] })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useProjectQuotes(projectId: number | undefined) {
  return useQuery({
    queryKey: quoteKeys.list(projectId ?? 0),
    queryFn: () => call(api.GET('/api/v1/projects/{project_id}/quotes', { params: { path: { project_id: projectId ?? 0 } } })),
    enabled: projectId !== undefined,
  })
}

export function useItemQuotes(itemId: number | undefined) {
  return useQuery({
    queryKey: quoteKeys.forItem(itemId ?? 0),
    queryFn: () => call(api.GET('/api/v1/project-items/{item_id}/quotes', { params: { path: { item_id: itemId ?? 0 } } })),
    enabled: itemId !== undefined,
  })
}

export function useCreateQuote() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: QuoteCreate }) =>
      call(api.POST('/api/v1/projects/{project_id}/quotes', { params: { path: { project_id: projectId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateQuote() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuoteUpdate }) =>
      call(api.PATCH('/api/v1/quotes/{quote_id}', { params: { path: { quote_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeclineQuote() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/quotes/{quote_id}/decline', { params: { path: { quote_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useDeleteQuote() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/quotes/{quote_id}', { params: { path: { quote_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useAddQuoteLine() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: number; data: QuoteLineCreate }) =>
      call(api.POST('/api/v1/quotes/{quote_id}/lines', { params: { path: { quote_id: quoteId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateQuoteLine() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuoteLineUpdate }) =>
      call(api.PATCH('/api/v1/quote-lines/{line_id}', { params: { path: { line_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDeleteQuoteLine() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/quote-lines/{line_id}', { params: { path: { line_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useRetainQuoteLine() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/quote-lines/{line_id}/retain', { params: { path: { line_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useAttachQuoteFile() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: ({ quoteId, fileId, caption }: { quoteId: number; fileId: number; caption?: string | null }) =>
      call(api.POST('/api/v1/quotes/{quote_id}/files', { params: { path: { quote_id: quoteId } }, body: { fileId, caption: caption ?? null } })),
    onSuccess: invalidate,
  })
}

export function useDetachQuoteFile() {
  const invalidate = useInvalidateQuotes()
  return useMutation({
    mutationFn: ({ quoteId, fileId }: { quoteId: number; fileId: number }) =>
      call(api.DELETE('/api/v1/quotes/{quote_id}/files/{file_id}', { params: { path: { quote_id: quoteId, file_id: fileId } } })),
    onSuccess: invalidate,
  })
}
