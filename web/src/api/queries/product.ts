// TanStack Query hooks for /products and /files (upload is multipart through openapi-fetch).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ProductRead = components['schemas']['ProductRead']
export type ProductCreate = components['schemas']['ProductCreate']
export type ProductUpdate = components['schemas']['ProductUpdate']
export type ProductFileRead = components['schemas']['ProductFileRead']
export type ProductFileAttach = components['schemas']['ProductFileAttach']
export type ProductFileUpdate = components['schemas']['ProductFileUpdate']
export type FileRead = components['schemas']['FileRead']

export type ProductListParams = {
  q: string
  includeArchived: boolean
  categoryId: number | null
  supplierId: number | null
  limit: number
  offset: number
}

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => ['products', 'list', params] as const,
  one: (id: number) => ['products', 'one', id] as const,
}

export function fileContentUrl(fileId: number): string {
  return `/api/v1/files/${fileId}/content`
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () =>
      call(
        api.GET('/api/v1/products', {
          params: {
            query: {
              q: params.q.trim() || undefined,
              includeArchived: params.includeArchived,
              categoryId: params.categoryId ?? undefined,
              supplierId: params.supplierId ?? undefined,
              limit: params.limit,
              offset: params.offset,
            },
          },
        }),
      ),
  })
}

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: productKeys.one(id ?? 0),
    queryFn: () => call(api.GET('/api/v1/products/{product_id}', { params: { path: { product_id: id ?? 0 } } })),
    enabled: id !== undefined,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all })
}

export function useCreateProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ data, force }: { data: ProductCreate; force?: boolean }) =>
      call(api.POST('/api/v1/products', { body: data, params: { query: { force: force ?? false } } })),
    onSuccess: invalidate,
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUpdate }) =>
      call(api.PATCH('/api/v1/products/{product_id}', { params: { path: { product_id: id } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useArchiveProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/products/{product_id}/archive', { params: { path: { product_id: id } } })),
    onSuccess: invalidate,
  })
}

export function useUnarchiveProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => call(api.POST('/api/v1/products/{product_id}/unarchive', { params: { path: { product_id: id } } })),
    onSuccess: invalidate,
  })
}

/** Builds a multipart/form-data body by hand: standard bytes, no dependency on FormData
 * (whose jsdom flavour loses the file bytes under Vitest). */
export async function multipartBody(file: File): Promise<{ body: Uint8Array; contentType: string }> {
  const boundary = `----ffe-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
  const encoder = new TextEncoder()
  const name = file.name.replace(/["\r\n]/g, '_')
  const head = encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
  )
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const body = new Uint8Array(head.length + bytes.length + tail.length)
  body.set(head)
  body.set(bytes, head.length)
  body.set(tail, head.length + bytes.length)
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

/** Uploads one file and returns its row; the API deduplicates by sha256. */
export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { body, contentType } = await multipartBody(file)
      return call(
        api.POST('/api/v1/files', {
          // The generated type describes the field as a string (binary); the serializer sends the raw body.
          body: { file: '' },
          bodySerializer: () => body,
          headers: { 'Content-Type': contentType },
        }),
      )
    },
  })
}

export function useAttachProductFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ productId, data }: { productId: number; data: ProductFileAttach }) =>
      call(api.POST('/api/v1/products/{product_id}/files', { params: { path: { product_id: productId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useUpdateProductFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ productId, fileId, data }: { productId: number; fileId: number; data: ProductFileUpdate }) =>
      call(api.PATCH('/api/v1/products/{product_id}/files/{file_id}', { params: { path: { product_id: productId, file_id: fileId } }, body: data })),
    onSuccess: invalidate,
  })
}

export function useDetachProductFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ productId, fileId }: { productId: number; fileId: number }) =>
      call(api.DELETE('/api/v1/products/{product_id}/files/{file_id}', { params: { path: { product_id: productId, file_id: fileId } } })),
    onSuccess: invalidate,
  })
}
