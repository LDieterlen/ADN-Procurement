// « Coller une adresse » (ADR-0014): the server reads the page and downloads the image; the front
// never reaches the outside.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type CapturePreviewRead = components['schemas']['CapturePreviewRead']
export type CaptureRead = components['schemas']['CaptureRead']

export const captureKeys = { all: ['captures'] as const }

export function usePreviewCapture() {
  return useMutation({ mutationFn: (url: string) => call(api.GET('/api/v1/captures/preview', { params: { query: { url } } })) })
}

export function useCaptureImage() {
  return useMutation({ mutationFn: (url: string) => call(api.POST('/api/v1/captures/image', { body: { url } })) })
}

/** Inbox of the browser extension (ADR-0017): pages sent from Chrome, waiting to become articles. */
export function useCaptures() {
  return useQuery({ queryKey: captureKeys.all, queryFn: () => call(api.GET('/api/v1/captures')) })
}

export function useDeleteCapture() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => call(api.DELETE('/api/v1/captures/{capture_id}', { params: { path: { capture_id: id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: captureKeys.all }),
  })
}
