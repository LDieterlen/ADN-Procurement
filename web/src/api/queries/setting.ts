// TanStack Query hooks for the single `setting` row (GET/PATCH /settings).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type SettingRead = components['schemas']['SettingRead']
export type SettingUpdate = components['schemas']['SettingUpdate']

export const settingKey = ['settings'] as const

export function useSettings() {
  return useQuery({ queryKey: settingKey, queryFn: () => call(api.GET('/api/v1/settings')) })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingUpdate) => call(api.PATCH('/api/v1/settings', { body: data })),
    onSuccess: (updated) => queryClient.setQueryData(settingKey, updated),
  })
}
