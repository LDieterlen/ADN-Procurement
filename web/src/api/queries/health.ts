// Step 1: a plain hook. Step 5 turns `queries/` into TanStack Query hooks (ADR-0001).
import { useEffect, useState } from 'react'
import { api } from '../client'
import type { components } from '../schema.d.ts'

export type HealthRead = components['schemas']['HealthRead']

export type HealthState = { status: 'loading' } | { status: 'ok'; data: HealthRead } | { status: 'error'; message: string }

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    api
      .GET('/api/v1/health')
      .then(({ data, error, response }) => {
        if (cancelled) return
        if (data) setState({ status: 'ok', data })
        else setState({ status: 'error', message: `HTTP ${response.status}${error ? ` : ${JSON.stringify(error)}` : ''}` })
      })
      .catch((reason: unknown) => {
        if (!cancelled) setState({ status: 'error', message: reason instanceof Error ? reason.message : String(reason) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
