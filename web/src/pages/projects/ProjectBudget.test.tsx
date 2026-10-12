// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

const GBP = 1_170_000

// Beat Light Fat 1 250,00 GBP −15 % × 1,17 = 1 243,13 € ; × 12 clés = 14 917,56 € dans CHA (fixture de test_api_budget.py).
beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP', defaultDiscountBp: 1500 }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active', contingencyBp: 1000 }],
    zones: [
      { projectId: 1, code: 'LOB', name: 'Lobby', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre type A', multiplier: 12, sortOrder: 20 },
    ],
    budgets: [
      { projectId: 1, amountCents: 5_000_000 },
      { projectId: 1, zoneId: 2, amountCents: 3_000_000 },
    ],
  })
  api.items.push(
    itemRow(
      {
        projectId: 1,
        name: 'Beat Light Fat',
        supplierId: 1,
        unitCostCents: 125_000,
        currency: 'GBP',
        fxRateMicro: GBP,
        discountBp: 1500,
        status: 'specified',
        placements: [
          {
            id: 1,
            projectItemId: 1,
            zoneId: 2,
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

async function openBudget(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/projects/1')
  await user.click(await screen.findByRole('button', { name: 'Budget' }))
}

const cellsOf = (row: HTMLElement) => Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent?.trim())

describe('onglet Budget', () => {
  test('global et par zone : Budget / Contingence / Prescrit / Validé / Reste venus du serveur', async () => {
    const user = userEvent.setup()
    await openBudget(user)
    const global = await screen.findByRole('table', { name: 'Budget global' })
    const globalRow = within(global).getByRole('row', { name: /Global/ })
    expect(cellsOf(globalRow).slice(0, 5)).toEqual(['Global', '50 000,00', '5 000,00', '14 917,56', '35 082,44'])
    const byZone = screen.getByRole('table', { name: 'Budget par zone' })
    const cha = within(byZone).getByRole('row', { name: /Chambre type A/ })
    expect(cellsOf(cha).slice(0, 6)).toEqual(['Chambre type A', '12', '30 000,00', '2 500,00', '14 917,56', '15 082,44'])
    expect(cellsOf(within(byZone).getByRole('row', { name: /Lobby/ })).slice(2, 3)).toEqual(['—'])
    expect(screen.queryByRole('region', { name: 'Alertes' })).toBeNull()
  })

  test('modifier les budgets : un seul PUT en bloc, puis synthèse rafraîchie', async () => {
    const user = userEvent.setup()
    await openBudget(user)
    await screen.findByRole('table', { name: 'Budget global' })
    await user.click(screen.getByRole('button', { name: 'Modifier les budgets' }))
    const lobby = screen.getByLabelText('Budget zone 1')
    await user.type(lobby, '2500')
    const global = screen.getByLabelText('Budget du projet')
    await user.clear(global)
    await user.type(global, '16 000')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(api.budgets.map((b) => [b.zoneId ?? 0, b.amountCents]).sort((a, b) => a[0]! - b[0]!)).toEqual([
        [0, 1_600_000],
        [1, 250_000],
        [2, 3_000_000],
      ]),
    )
    expect(api.requests.filter((r) => r.method === 'PUT' && r.path.endsWith('/budget-lines'))).toHaveLength(1)
    // 14 917,56 / 16 000 = 93 % : alerte 90 % sur le projet.
    const alerts = await screen.findByRole('region', { name: 'Alertes' })
    expect(within(alerts).getByText(/Projet : prescrit à 90 %/)).toBeTruthy()
    const globalTable = screen.getByRole('table', { name: 'Budget global' })
    expect(within(globalTable).getByText('93 % ≥ 90 %')).toBeTruthy()
  })

  test('refus du serveur à l’enregistrement : message affiché, rien d’écrasé', async () => {
    const user = userEvent.setup()
    await openBudget(user)
    await screen.findByRole('table', { name: 'Budget global' })
    await user.click(screen.getByRole('button', { name: 'Modifier les budgets' }))
    api.projects[0]!.status = 'closed'
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect((await screen.findByRole('alert')).textContent).toContain('clos')
    expect(api.budgets.map((b) => b.amountCents)).toEqual([5_000_000, 3_000_000])
  })

  test('projet clos : pas de bouton Modifier', async () => {
    const user = userEvent.setup()
    api.projects[0]!.status = 'closed'
    await openBudget(user)
    await screen.findByRole('table', { name: 'Budget global' })
    expect(screen.queryByRole('button', { name: 'Modifier les budgets' })).toBeNull()
  })
})
