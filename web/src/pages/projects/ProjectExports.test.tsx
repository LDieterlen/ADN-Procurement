// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
  })
})
afterEach(() => api.restore())

describe('exports xlsx', () => {
  test('les liens d’export pointent vers l’API (interne et client) et les exports émis sont listés', async () => {
    const user = userEvent.setup()
    api.exports.push({
      id: 1,
      projectId: 1,
      fileId: 7,
      kind: 'schedule_xlsx',
      variant: 'client',
      issuedAt: '2026-10-11T15:02:00Z',
      originalName: '2026-001-schedule-client-2026-10-11.xlsx',
      sizeBytes: 8000,
    })
    renderApp('/projects/1')
    await user.click(await screen.findByRole('button', { name: 'Lignes' }))
    const internal = await screen.findByRole('link', { name: 'Schedule xlsx (interne)' })
    expect(internal.getAttribute('href')).toBe('/api/v1/projects/1/exports/schedule.xlsx?variant=internal')
    expect(screen.getByRole('link', { name: 'Schedule xlsx (client)' }).getAttribute('href')).toBe('/api/v1/projects/1/exports/schedule.xlsx?variant=client')
    expect(screen.getByRole('link', { name: 'Book PDF (client)' }).getAttribute('href')).toBe('/api/v1/projects/1/exports/book.pdf')
    const issued = await screen.findByRole('list', { name: 'Exports émis' })
    const link = within(issued).getByRole('link', { name: '2026-001-schedule-client-2026-10-11.xlsx' })
    expect(link.getAttribute('href')).toBe('/api/v1/files/7/content')
    expect(issued.textContent).toContain('(client, 2026-10-11)')
  })
})
