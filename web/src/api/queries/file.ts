// TanStack Query hooks for /files: upload (multipart built by hand) and content URL.
import { useMutation } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type FileRead = components['schemas']['FileRead']

export function fileContentUrl(fileId: number): string {
  return `/api/v1/files/${fileId}/content`
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
