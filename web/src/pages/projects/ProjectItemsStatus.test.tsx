// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi
const GBP = 1_170_000

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP' }, { name: 'Flos' }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    products: [
      { name: 'Beat Light Fat', categoryId: 1, supplierId: 1, listPriceCents: 125_000, listPriceCurrency: 'GBP' },
      { name: 'Melt', categoryId: 1, supplierId: 1, listPriceCents: 90_000, listPriceCurrency: 'GBP' },
    ],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    zones: [{ projectId: 1, code: 'CHA', name: 'Chambre type A', multiplier: 12, sortOrder: 10 }],
    items: [
      {
        projectId: 1,
        itemCode: 'LUM-001',
        productId: 1,
        supplierId: 1,
        name: 'Beat Light Fat',
        unitCostCents: 125_000,
        currency: 'GBP',
        fxRateMicro: GBP,
        discountBp: 1500,
        leadTimeWeeks: 8,
        requiredOnSite: '2026-11-15',
        status: 'quoted',
        placements: [{ id: 1, projectItemId: 1, zoneId: 1, qtyMilli: 1000, sortOrder: 0, notes: null, createdAt: '', updatedAt: '' }],
      },
      {
        projectId: 1,
        itemCode: 'FRA-001',
        kind: 'fee',
        name: 'Transport',
        supplierId: 1,
        unitCostCents: 45_000,
        currency: 'GBP',
        fxRateMicro: GBP,
        status: 'specified',
        placements: [{ id: 2, projectItemId: 2, zoneId: null, qtyMilli: 1000, sortOrder: 0, notes: null, createdAt: '', updatedAt: '' }],
      },
      {
        projectId: 1,
        itemCode: 'LUM-002',
        name: 'Applique',
        supplierId: 2,
        unitCostCents: 20_000,
        status: 'draft',
        placements: [{ id: 3, projectItemId: 3, zoneId: 1, qtyMilli: 2000, sortOrder: 0, notes: null, createdAt: '', updatedAt: '' }],
      },
    ],
  })
})
afterEach(() => api.restore())

async function openLines(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/projects/1')
  await user.click(await screen.findByRole('button', { name: 'Lignes' }))
  return screen.findByRole('table', { name: 'Lignes du projet' })
}

describe('onglet Lignes — statuts, historique, filtres, impression', () => {
  test('valider puis commander avec confirmation ; retour en brouillon refusé ; historique', async () => {
    const user = userEvent.setup()
    const table = await openLines(user)
    await user.click(within(table).getByRole('row', { name: 'LUM-001 dans CHA' }))
    const panel = await screen.findByRole('dialog', { name: 'Fiche de la ligne' })
    await user.selectOptions(within(panel).getByLabelText('Nouveau statut'), 'approved')
    await user.click(within(panel).getByRole('button', { name: 'Confirmer' }))
    await within(table).findByText('Validé')
    expect(api.items[0]?.approvedUnitNetCents).toBe(124_313)
    // ordered needs an order reference: the API refuses, the message is shown
    await user.selectOptions(within(panel).getByLabelText('Nouveau statut'), 'ordered')
    await user.click(within(panel).getByRole('button', { name: 'Confirmer' }))
    expect(await within(panel).findByText(/référence de commande/)).toBeTruthy()
    api.items[0]!.orderRef = 'PO-12'
    await user.click(within(panel).getByRole('button', { name: 'Confirmer' }))
    await within(table).findByText('Commandé')
    // no way back: the select only offers delivered / cancelled
    const options = within(within(panel).getByLabelText('Nouveau statut'))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toEqual(['Choisir…', 'Livré', 'Annulé'])
    await user.click(within(panel).getByRole('button', { name: /Historique/ }))
    const history = await within(panel).findByRole('list', { name: 'Historique de la ligne' })
    expect(within(history).getByText(/validé à 1 243,13 € l'unité × 12/)).toBeTruthy()
    expect(within(history).getByText('Chiffré → Validé')).toBeTruthy()
  })

  test('annuler exige une note ; la ligne sort des totaux', async () => {
    const user = userEvent.setup()
    const table = await openLines(user)
    await user.click(within(table).getByRole('row', { name: 'LUM-002 dans CHA' }))
    const panel = await screen.findByRole('dialog', { name: 'Fiche de la ligne' })
    await user.selectOptions(within(panel).getByLabelText('Nouveau statut'), 'cancelled')
    await user.click(within(panel).getByRole('button', { name: 'Confirmer' }))
    expect(await within(panel).findByText(/note est obligatoire/)).toBeTruthy()
    await user.type(within(panel).getByLabelText('Note de transition'), 'client renonce')
    await user.click(within(panel).getByRole('button', { name: 'Confirmer' }))
    await within(table).findByText('Annulé')
    expect(api.items[2]?.status).toBe('cancelled')
  })

  test('commander avant le : date du serveur, dépassement signalé, tri', async () => {
    const user = userEvent.setup()
    const table = await openLines(user)
    const row = within(table).getByRole('row', { name: 'LUM-001 dans CHA' })
    expect(within(row).getByText('2026-09-06 ⚠')).toBeTruthy() // 15/11 − 8 semaines − 14 jours, déjà dépassé
    expect(row.className).toContain('bg-amber-50')
    await user.click(screen.getByLabelText('Trier par « commander avant le »'))
    const rows = within(table).getAllByRole('row', { name: /dans CHA/ })
    expect(rows[0]?.getAttribute('aria-label')).toBe('LUM-001 dans CHA')
  })

  test('filtres par statut et fournisseur côté serveur', async () => {
    const user = userEvent.setup()
    await openLines(user)
    // the table remounts on every refetch (new query key): query it afresh each time
    const live = () => within(screen.getByRole('table', { name: 'Lignes du projet' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrer : statut' }), 'draft')
    await waitFor(() => expect(live().queryByRole('row', { name: 'LUM-001 dans CHA' })).toBeNull())
    expect(live().getByRole('row', { name: 'LUM-002 dans CHA' })).toBeTruthy()
    expect(api.requests.some((r) => r.path.includes('/project-items?status=draft'))).toBe(true)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrer : statut' }), '')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrer : fournisseur' }), '1')
    await waitFor(() => expect(live().queryByRole('row', { name: 'LUM-002 dans CHA' })).toBeNull())
    expect(live().getByRole('row', { name: 'LUM-001 dans CHA' })).toBeTruthy()
  })

  test('variante client : sans prix, sans fournisseur, sans frais, description client', async () => {
    const user = userEvent.setup()
    api.items[0]!.clientDescription = 'Suspension laiton noir'
    const table = await openLines(user)
    expect(within(table).getByRole('row', { name: 'FRA-001 dans non affecté' })).toBeTruthy()
    expect(within(table).getAllByText('Tom Dixon').length).toBeGreaterThan(0)
    await user.click(screen.getByLabelText('Variante client'))
    expect(within(table).queryAllByText('Tom Dixon')).toHaveLength(0)
    expect(within(table).queryByText('PU net')).toBeNull()
    expect(within(table).queryByRole('row', { name: 'FRA-001 dans non affecté' })).toBeNull()
    expect(within(table).getByText('Suspension laiton noir')).toBeTruthy()
    expect(within(table).queryByText('Prescrit HT €')).toBeNull()
  })

  test('remplacer le produit après validation crée une nouvelle ligne et bascule le panneau', async () => {
    const user = userEvent.setup()
    api.items[0]!.status = 'approved'
    api.items[0]!.approvedAt = '2026-10-01T00:00:00Z'
    api.items[0]!.approvedUnitNetCents = 124_313
    api.items[0]!.approvedTotalQtyMilli = 12_000
    const table = await openLines(user)
    await user.click(within(table).getByRole('row', { name: 'LUM-001 dans CHA' }))
    const panel = await screen.findByRole('dialog', { name: 'Fiche de la ligne' })
    await user.click(within(panel).getByRole('button', { name: /^Remplacer \(/ }))
    await within(panel).findByRole('option', { name: 'Melt' })
    await user.selectOptions(within(panel).getByLabelText('Produit de remplacement'), '2')
    await user.click(within(panel).getByRole('button', { name: 'Remplacer' }))
    await within(table).findByText('Melt') // the new line takes the code and the placements; the old one has none left
    expect(api.items[0]).toMatchObject({ itemCode: 'LUM-001.R1', status: 'replaced', replacedById: 4 })
    expect(api.items.at(-1)).toMatchObject({ itemCode: 'LUM-001', name: 'Melt', status: 'specified' })
    expect(await within(panel).findByText('Melt')).toBeTruthy()
  })
})
