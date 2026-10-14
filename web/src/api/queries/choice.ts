// Editable value lists (family, usage, prestation): GET/POST/PATCH /choices, archive, unarchive.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { components } from '../schema.d.ts'
import { call } from './client'

export type ChoiceRead = components['schemas']['ChoiceRead']
export type ChoiceList = ChoiceRead['list']

export const CHOICE_LIST_LABELS: Record<ChoiceList, string> = { family: 'Familles', usage: 'Usages', prestation: 'Prestations' }

const key = (list: ChoiceList, includeArchived: boolean) => ['choices', list, includeArchived] as const

export function useChoices(list: ChoiceList, includeArchived = false) {
  return useQuery({
    queryKey: key(list, includeArchived),
    queryFn: () => call(api.GET('/api/v1/choices', { params: { query: { list, includeArchived } } })),
  })
}

/** code → name (archived values included, so older data keeps its label) and the active options. */
export function useChoiceLabels(list: ChoiceList) {
  const all = useChoices(list, true)
  const labels = new Map((all.data ?? []).map((c) => [c.code, c.name]))
  const options = (all.data ?? []).filter((c) => c.archivedAt === null).map((c) => ({ value: c.code, label: c.name }))
  return { labels, options, label: (code: string | null | undefined) => (code ? (labels.get(code) ?? code) : '') }
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['choices'] })
}

export function useCreateChoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: { list: ChoiceList; name: string }) => call(api.POST('/api/v1/choices', { body: { ...data, sortOrder: null } })),
    onSuccess: invalidate,
  })
}

export function useUpdateChoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      call(api.PATCH('/api/v1/choices/{choice_id}', { params: { path: { choice_id: id } }, body: { name } })),
    onSuccess: invalidate,
  })
}

export function useToggleChoice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (choice: ChoiceRead) =>
      choice.archivedAt
        ? call(api.POST('/api/v1/choices/{choice_id}/unarchive', { params: { path: { choice_id: choice.id } } }))
        : call(api.POST('/api/v1/choices/{choice_id}/archive', { params: { path: { choice_id: choice.id } } })),
    onSuccess: invalidate,
  })
}
