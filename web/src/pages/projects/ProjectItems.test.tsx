// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

const GBP = 1_170_000
const PNG = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], 'photo.png', { type: 'image/png' })

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

async function openPrescription(user: ReturnType<typeof userEvent.setup>, advanced = false) {
  renderApp('/projects/1', { advanced })
  await user.click(await screen.findByRole('button', { name: 'Prescription' }))
}

const cellsOf = (row: HTMLElement) => Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent)

describe('onglet Prescription', () => {
  test('ajouter depuis le catalogue dans CHA ×12 avec une localisation : colonnes de la prescription, montants (mode avancé) venus du serveur', async () => {
    const user = userEvent.setup()
    await openPrescription(user, true)
    expect(await screen.findByText('Aucune ligne.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Ajouter un produit' }))
    const drawer = await screen.findByRole('dialog', { name: 'Ajouter un produit' })
    await within(drawer).findByRole('option', { name: /Beat Light Fat/ })
    await user.selectOptions(within(drawer).getByLabelText('Produit'), '1')
    await user.selectOptions(within(drawer).getByLabelText('Zone'), '2')
    await user.selectOptions(within(drawer).getByLabelText('Localisation'), 'ceiling')
    await user.type(within(drawer).getByLabelText('Taux de change (1 unité = … €)'), '1,17')
    await user.click(within(drawer).getByRole('button', { name: 'Ajouter' }))
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    const row = await within(table).findByRole('row', { name: 'LUM-001 dans CHA' })
    const cells = cellsOf(row)
    expect(cells.slice(0, 4)).toEqual(['Luminaires', 'LUM-001', 'Beat Light Fat', 'Plafond'])
    expect(cells.slice(5, 11)).toEqual(['1', '12', '12', '1 062,50 GBP', '1 243,13', '14 917,56'])
    expect(within(table).getByText('Tom Dixon')).toBeTruthy()
    expect(within(table).getByText('8 sem.')).toBeTruthy()
    expect(api.items[0]).toMatchObject({ fxRateMicro: GBP, location: 'ceiling' })
    expect(api.requests.map((r) => r.path).some((p) => p.endsWith('/summary'))).toBe(true)
  })

  test('hors mode avancé : pas de prix dans le tableau, le bandeau budget reflète la ligne ajoutée', async () => {
    const user = userEvent.setup()
    api.budgets.push({
      id: 1,
      projectId: 1,
      zoneId: null,
      categoryId: null,
      amountCents: 5_000_000,
      notes: null,
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
    })
    await openPrescription(user)
    const strip = await screen.findByRole('region', { name: 'Synthèse budget' })
    expect(strip.textContent).toContain('Reste 50 000,00 €')
    await user.click(screen.getByRole('button', { name: 'Ajouter un produit' }))
    const drawer = await screen.findByRole('dialog', { name: 'Ajouter un produit' })
    await within(drawer).findByRole('option', { name: /Beat Light Fat/ })
    await user.selectOptions(within(drawer).getByLabelText('Produit'), '1')
    await user.selectOptions(within(drawer).getByLabelText('Zone'), '2')
    await user.type(within(drawer).getByLabelText('Taux de change (1 unité = … €)'), '1,17')
    await user.click(within(drawer).getByRole('button', { name: 'Ajouter' }))
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    const row = await within(table).findByRole('row', { name: 'LUM-001 dans CHA' })
    expect(cellsOf(row)).toEqual(['Luminaires', 'LUM-001', 'Beat Light Fat', '', '', '1', '12', '12', 'Tom Dixon', 'Brouillon', ''])
    expect(within(table).queryByText('14 917,56')).toBeNull()
    await waitFor(() => expect(strip.textContent).toContain('Prescrit HT 14 917,56 €'))
    expect(strip.textContent).toContain('Reste 35 082,44 €')
  })

  test('ligne libre avec un fournisseur créé sur place, sans quitter le projet', async () => {
    const user = userEvent.setup()
    await openPrescription(user)
    await user.click(await screen.findByRole('button', { name: 'Ajouter un produit' }))
    const drawer = await screen.findByRole('dialog', { name: 'Ajouter un produit' })
    await user.click(within(drawer).getByRole('button', { name: 'Ligne libre' }))
    await user.type(within(drawer).getByLabelText('Désignation'), 'Rideau sur mesure')
    await within(drawer).findByRole('option', { name: 'LUM — Luminaires' })
    await user.selectOptions(within(drawer).getByLabelText('Typologie'), '1')
    await user.click(within(drawer).getByRole('button', { name: 'Nouveau : fournisseur' }))
    const modal = await screen.findByRole('dialog', { name: 'Nouveau fournisseur' })
    await user.type(within(modal).getByLabelText('Nom'), 'Flos SpA')
    await user.click(within(modal).getByRole('button', { name: 'Créer' }))
    await screen.findByText('Fournisseur créé.')
    expect(api.suppliers.at(-1)?.name).toBe('Flos SpA')
    expect((within(drawer).getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe(String(api.suppliers.at(-1)?.id))
    await user.type(within(drawer).getByLabelText('Prix unitaire HT'), '450')
    await user.selectOptions(within(drawer).getByLabelText('Type'), 'custom')
    await user.click(within(drawer).getByRole('button', { name: 'Ajouter' }))
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    expect(await within(table).findByText('Rideau sur mesure')).toBeTruthy()
    expect(api.items.at(-1)).toMatchObject({ kind: 'custom', unitCostCents: 45_000, currency: 'EUR', supplierId: api.suppliers.at(-1)?.id })
    expect(api.requests.filter((r) => r.method === 'POST' && r.path.startsWith('/api/v1/suppliers'))).toHaveLength(1)
  })

  test('fiche de la ligne : photo ajoutée, placement dans une autre zone, un seul code', async () => {
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
    await openPrescription(user)
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    await user.click(within(table).getByRole('row', { name: 'LUM-001 dans CHA' }))
    const panel = await screen.findByRole('dialog', { name: 'Fiche de la ligne' })
    await user.upload(within(panel).getByLabelText('Photo à joindre'), PNG)
    await waitFor(() => expect(api.items[0]?.files).toHaveLength(1))
    expect(api.items[0]?.files[0]).toMatchObject({ kind: 'image', isPrimary: true })
    expect(await within(panel).findByText('Principale')).toBeTruthy()
    await user.selectOptions(within(panel).getByLabelText('Zone à ajouter'), '1')
    await user.clear(within(panel).getByLabelText('Quantité à ajouter'))
    await user.type(within(panel).getByLabelText('Quantité à ajouter'), '2')
    await user.click(within(panel).getByRole('button', { name: 'Ajouter' }))
    await within(table).findByRole('row', { name: 'LUM-001 dans LOB' })
    expect(api.items[0]?.placements.map((p) => [p.zoneId, p.qtyMilli])).toEqual([
      [2, 1000],
      [1, 2000],
    ])
    expect(within(table).getAllByRole('row', { name: /LUM-001/ })).toHaveLength(2)
  })
})
