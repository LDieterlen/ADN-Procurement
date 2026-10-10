import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type HealthRead = components['schemas']['HealthRead']

export const healthKey = ['health'] as const

export function useHealth() {
  return useQuery({ queryKey: healthKey, queryFn: () => call(api.GET('/api/v1/health')), refetchInterval: 30_000 })
}
