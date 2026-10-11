// `POST /system/backup` (« Sauvegarder maintenant ») ; refreshes /health afterwards.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'
import { healthKey } from './health'

export type BackupRead = components['schemas']['BackupRead']

export function useCreateBackup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => call(api.POST('/api/v1/system/backup')),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: healthKey }),
  })
}
