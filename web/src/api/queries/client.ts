// TanStack Query hooks for /clients: the only place that calls client.ts for this resource.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { ApiError, unwrap } from '../errors'
import type { components } from '../schema.d.ts'

export type ClientRead = components['schemas']['ClientRead']
export type ClientCreate = components['schemas']['ClientCreate']
export type ClientUpdate = components['schemas']['ClientUpdate']

export const clientKeys = {
  all: ['clients'] as const,
  list: (q: string, includeArchived: boolean) => ['clients', 'list', { q, includeArchived }] as const,
  one: (id: number) => ['clients', 'one', id] as const,
}

/** Network failures (server down) become ApiError.network(); HTTP errors become typed ApiError. */
export async function call<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  let result: { data?: T; error?: unknown; response: Response }
  try {
    result = await request
  } catch {
    throw ApiError.network()
  }
  return unwrap(result)
}

export function useClients(q: string, includeArchived: boolean) {
  return useQuery({
    queryKey: clientKeys.list(q, includeArchived),
    queryFn: () => call(api.GET('/api/v1/clients', { params: { query: { q: q.trim() || undefined, includeArchived } } })),
  })
}

export function useClient(id: number | undefined) {
  return useQuery({
    queryKey: clientKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/clients/{client_id}', { params: { path: { client_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidateClients() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: clientKeys.all })
}

export function useCreateClient() {
  const invalidate = useInvalidateClients()
  return useMutation({
    mutationFn: ({ data, force }: { data: ClientCreate; force?: boolean }) =>
      call(api.POST('/api/v1/clients', { body: data, params: { query: { force: force ?? false } } })),
    onSuccess: invalidate,
  })
}

export function useUpdateClient() {
  const invalidate = useInvalidateClients()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClientUpdate }) =>
      call(api.PATCH('/api/v1/clients/{client_id}', { params: { path: { client_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useArchiveClient() {
  const invalidate = useInvalidateClients()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/clients/{client_id}/archive', { params: { path: { client_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveClient() {
  const invalidate = useInvalidateClients()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/clients/{client_id}/unarchive', { params: { path: { client_id: id } } })),
    onSuccess: invalidate,
  })
}
