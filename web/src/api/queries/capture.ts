// « Coller une adresse » (ADR-0014): the server reads the page and downloads the image; the front
// never reaches the outside.
import { useMutation } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type CapturePreviewRead = components['schemas']['CapturePreviewRead']

export function usePreviewCapture() {
  return useMutation({ mutationFn: (url: string) => call(api.GET('/api/v1/captures/preview', { params: { query: { url } } })) })
}

export function useCaptureImage() {
  return useMutation({ mutationFn: (url: string) => call(api.POST('/api/v1/captures/image', { body: { url } })) })
}
