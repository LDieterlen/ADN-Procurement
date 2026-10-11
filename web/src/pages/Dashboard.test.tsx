// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, type FakeApi } from '../../tests/helpers/fakeApi'
import { renderApp } from '../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    projects: [
      { name: 'Rénovation', clientId: 1, status: 'active', dueOn: '2027-03-01' },
      { name: 'Fini', clientId: 1, status: 'closed' },
    ],
    zones: [{ projectId: 1, code: 'CHA', name: 'Chambre type A', multiplier: 12, sortOrder: 20 }],
    budgets: [{ projectId: 1, amountCents: 1_400_000 }],
  })
  api.items.push(
    itemRow(
      {
        projectId: 1,
        unitCostCents: 124_313,
        status: 'draft',
        placements: [
          {
            id: 1,
            projectItemId: 1,
            zoneId: 1,
            qtyMilli: 1000,
            sortOrder: 0,
            notes: null,
            createdAt: '2026-10-10T00:00:00Z',
            updatedAt: '2026-10-10T00:00:00Z',
          },
        ],
      },
      1,
    ),
  )
})
afterEach(() => api.restore())

describe('tableau de bord', () => {
  test('la page d’accueil liste les projets ouverts avec budget, prescrit, reste et alerte', async () => {
    renderApp('/')
    const table = await screen.findByRole('table', { name: 'Projets en cours' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    const cells = Array.from((rows[0] as HTMLTableRowElement).cells).map((c) => c.textContent?.trim())
    expect(cells.slice(1, 10)).toEqual(['Rénovation', 'Hôtel X SA', 'Actif', '2027-03-01', '14 000,00', '14 917,56', '0,00', '-917,56', 'dépassé'])
    expect(cells[10]).toBe('1 brouillon(s)')
    expect(api.requests.some((r) => r.path.endsWith('/dashboard'))).toBe(true)
  })

  test('cliquer une ligne ouvre le projet', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const table = await screen.findByRole('table', { name: 'Projets en cours' })
    await user.click(within(table).getByText('Rénovation'))
    expect(await screen.findByRole('button', { name: 'Budget' })).toBeTruthy()
  })
})
