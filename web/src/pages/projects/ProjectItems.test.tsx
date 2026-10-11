// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

const GBP = 1_170_000

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP', defaultDiscountBp: 1500 }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    products: [{ name: 'Beat Light Fat', categoryId: 1, supplierId: 1, listPriceCents: 125_000, listPriceCurrency: 'GBP', leadTimeWeeks: 8, finish: 'laiton' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    zones: [
      { projectId: 1, code: 'LOB', name: 'Lobby', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre type A', multiplier: 12, sortOrder: 20 },
      { projectId: 1, code: 'CHB', name: 'Chambre type B', multiplier: 8, sortOrder: 30 },
    ],
  })
})
afterEach(() => api.restore())

async function openLines(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/projects/1')
  await user.click(await screen.findByRole('button', { name: 'Lignes' }))
}

describe('onglet Lignes', () => {
  test('ajouter depuis le catalogue dans CHA ×12 : totaux venus du serveur, pas du front', async () => {
    const user = userEvent.setup()
    await openLines(user)
    expect(await screen.findByText('Aucune ligne.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Depuis le catalogue' }))
    await screen.findByRole('option', { name: /Beat Light Fat/ })
    await user.selectOptions(screen.getByLabelText('Produit'), '1')
    await user.selectOptions(screen.getByLabelText('Zone'), '2')
    await user.type(screen.getByLabelText('Taux de change (1 unité = … €)'), '1,17')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    const row = await within(table).findByRole('row', { name: 'LUM-001 dans CHA' })
    const cells = Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent)
    expect(cells.slice(5, 11)).toEqual(['1', '12', '12', '1 062,50 GBP', '1 243,13', '14 917,56'])
    expect(within(table).getByText('Tom Dixon')).toBeTruthy()
    expect(within(table).getByText('8 sem.')).toBeTruthy()
    expect(api.items[0]?.fxRateMicro).toBe(GBP)
    const requests = api.requests.map((r) => r.path)
    expect(requests.some((p) => p.endsWith('/summary'))).toBe(true)
  })

  test('ajouter à une autre zone depuis le panneau : un seul code, deux placements', async () => {
    const user = userEvent.setup()
    api.items.push(
      itemRow(
        {
          projectId: 1,
          productId: 1,
          supplierId: 1,
          name: 'Beat Light Fat',
          unitCostCents: 125_000,
          currency: 'GBP',
          fxRateMicro: GBP,
          discountBp: 1500,
          placements: [{ id: 1, projectItemId: 1, zoneId: 2, qtyMilli: 1000, sortOrder: 0, notes: null, createdAt: '', updatedAt: '' }],
        },
        1,
      ),
    )
    await openLines(user)
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    await user.click(within(table).getByRole('row', { name: 'LUM-001 dans CHA' }))
    const panel = await screen.findByRole('dialog', { name: 'Fiche de la ligne' })
    await user.selectOptions(within(panel).getByLabelText('Zone à ajouter'), '1')
    await user.clear(within(panel).getByLabelText('Quantité à ajouter'))
    await user.type(within(panel).getByLabelText('Quantité à ajouter'), '2')
    await user.click(within(panel).getByRole('button', { name: 'Ajouter' }))
    await within(table).findByRole('row', { name: 'LUM-001 dans LOB' })
    expect(api.items[0]?.placements.map((p) => [p.zoneId, p.qtyMilli])).toEqual([
      [2, 1000],
      [1, 2000],
    ])
    const rows = within(table).getAllByRole('row', { name: /LUM-001/ })
    expect(rows).toHaveLength(2)
    expect((await within(table).findAllByText('17 403,82')).length).toBeGreaterThan(0) // 14 pièces : total ligne (serveur)
  })

  test('ligne libre : désignation, catégorie, prix net', async () => {
    const user = userEvent.setup()
    await openLines(user)
    await user.click(await screen.findByRole('button', { name: 'Ligne libre' }))
    await user.type(screen.getByLabelText('Désignation'), 'Rideau sur mesure')
    await screen.findByRole('option', { name: 'LUM — Luminaires' })
    await user.selectOptions(screen.getByLabelText('Catégorie'), '1')
    await user.type(screen.getByLabelText('Prix unitaire HT'), '450')
    await user.selectOptions(screen.getByLabelText('Type'), 'custom')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    expect(await within(table).findByText('Rideau sur mesure')).toBeTruthy()
    expect(api.items.at(-1)).toMatchObject({ kind: 'custom', unitCostCents: 45_000, currency: 'EUR' })
  })
})
