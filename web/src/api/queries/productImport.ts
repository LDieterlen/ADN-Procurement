// Price-list imports (ADR-0011): preview (no write), commit, saved mapping, batches. The file travels as
// multipart with its form fields; the plan and every count come from the server.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ImportMapping = components['schemas']['ImportMapping']
export type ImportField = keyof ImportMapping['columns']
export type ImportPreviewRead = components['schemas']['ImportPreviewRead']
export type ImportCommitRead = components['schemas']['ImportCommitRead']
export type ImportBatchRead = components['schemas']['ImportBatchRead']
export type PlanRowRead = components['schemas']['PlanRowRead']

export const IMPORT_FIELDS: { key: ImportField; label: string }[] = [
  { key: 'name', label: 'Désignation' },
  { key: 'supplierRef', label: 'Réf. fournisseur' },
  { key: 'manufacturerRef', label: 'Réf. fabricant' },
  { key: 'manufacturerName', label: 'Marque / fabricant' },
  { key: 'gtin', label: 'GTIN / EAN' },
  { key: 'listPrice', label: 'Prix catalogue' },
  { key: 'leadTimeWeeks', label: 'Délai (semaines)' },
  { key: 'finish', label: 'Finition' },
]

export const ACTION_LABELS: Record<PlanRowRead['action'], string> = { create: 'Créer', update: 'Mettre à jour', unchanged: 'Inchangé', skip: 'Ignoré' }

export const importKeys = {
  batches: (supplierId: number | null) => ['imports', 'batches', supplierId] as const,
  mapping: (supplierId: number) => ['imports', 'mapping', supplierId] as const,
}

/** Builds a multipart body by hand (jsdom/Vitest turn a File inside FormData into an empty Blob, ARCHITECTURE §11). */
async function multipartWithFields(file: File, fields: Record<string, string>): Promise<{ body: Uint8Array; contentType: string }> {
  const boundary = `----ffe${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  for (const [name, value] of Object.entries(fields)) {
    parts.push(encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  parts.push(
    encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name.replace(/"/g, '')}"\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    ),
  )
  parts.push(bytes)
  parts.push(encoder.encode(`\r\n--${boundary}--\r\n`))
  const total = parts.reduce((n, p) => n + p.length, 0)
  const body = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    body.set(part, offset)
    offset += part.length
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

export type ImportRequest = { file: File; supplierId: number; mapping: ImportMapping | null; markMissingDiscontinued?: boolean }

function fieldsOf(request: ImportRequest): Record<string, string> {
  const fields: Record<string, string> = { supplierId: String(request.supplierId) }
  if (request.mapping) fields.mapping = JSON.stringify(request.mapping)
  if (request.markMissingDiscontinued) fields.markMissingDiscontinued = 'true'
  return fields
}

export function usePreviewImport() {
  return useMutation({
    mutationFn: async (request: ImportRequest) => {
      const { body, contentType } = await multipartWithFields(request.file, fieldsOf(request))
      return call(
        api.POST('/api/v1/imports/products/preview', {
          body: { file: '', supplierId: request.supplierId },
          bodySerializer: () => body,
          headers: { 'Content-Type': contentType },
        }),
      )
    },
  })
}

export function useCommitImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: ImportRequest) => {
      const { body, contentType } = await multipartWithFields(request.file, fieldsOf(request))
      return call(
        api.POST('/api/v1/imports/products/commit', {
          body: { file: '', supplierId: request.supplierId, markMissingDiscontinued: false },
          bodySerializer: () => body,
          headers: { 'Content-Type': contentType },
        }),
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['manufacturers'] })
    },
  })
}

export function useImportBatches(supplierId: number | null) {
  return useQuery({
    queryKey: importKeys.batches(supplierId),
    queryFn: () => call(api.GET('/api/v1/imports/products/batches', { params: { query: { supplierId: supplierId ?? undefined } } })),
  })
}

export function useImportMapping(supplierId: number | undefined) {
  return useQuery({
    queryKey: importKeys.mapping(supplierId ?? 0),
    queryFn: () => call(api.GET('/api/v1/imports/products/mapping', { params: { query: { supplierId: supplierId ?? 0 } } })),
    enabled: supplierId !== undefined,
  })
}
