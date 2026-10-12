// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

const GBP = 1_170_000
const placement = (id: number, zoneId: number, qtyMilli: number) => ({
  id,
  projectItemId: id,
  zoneId,
  qtyMilli,
  sortOrder: 0,
  notes: null,
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
})

// Three approved lines at Tom Dixon (GBP, fx 1,17) : LUM-001 1 250 −15 % × 12, LUM-002 100 × 2, LUM-003 50 × 1.
beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP', defaultDiscountBp: 1500 }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active', deliveryAddress: '12 rue du Chantier' }],
    zones: [
      { projectId: 1, code: 'LOB', name: 'Lobby', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre type A', multiplier: 12, sortOrder: 20 },
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
        status: 'approved',
        placements: [placement(1, 2, 1000)],
      },
      1,
    ),
    itemRow(
      {
        projectId: 1,
        itemCode: 'LUM-002',
        name: 'Applique',
        supplierId: 1,
        unitCostCents: 10_000,
        currency: 'GBP',
        fxRateMicro: GBP,
        status: 'approved',
        placements: [placement(2, 1, 2000)],
      },
      2,
    ),
    itemRow(
      {
        projectId: 1,
        itemCode: 'LUM-003',
        name: 'Ampoule',
        supplierId: 1,
        unitCostCents: 5_000,
        currency: 'GBP',
        fxRateMicro: GBP,
        status: 'approved',
        placements: [placement(3, 1, 1000)],
      },
      3,
    ),
  )
})
afterEach(() => api.restore())

async function openOrders(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/projects/1', { advanced: true })
  await user.click(await screen.findByRole('button', { name: 'Commandes' }))
}

describe('onglet Commandes', () => {
  test('créer un BC sur 3 lignes validées : totaux du serveur, puis émettre verrouille les lignes', async () => {
    const user = userEvent.setup()
    await openOrders(user)
    expect(await screen.findByText('Aucun bon de commande.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Nouveau bon de commande' }))
    await screen.findByRole('option', { name: 'Tom Dixon' })
    await user.selectOptions(screen.getByLabelText('Fournisseur du bon de commande'), '1')
    for (const code of ['LUM-001', 'LUM-002', 'LUM-003']) await user.click(await screen.findByLabelText(`Commander ${code}`))
    await user.click(screen.getByRole('button', { name: 'Créer le bon de commande' }))
    const card = await screen.findByRole('article', { name: 'Bon de commande PO-2026-001' })
    expect(within(card).getByText('Brouillon')).toBeTruthy()
    const row = within(card).getByRole('row', { name: 'LUM-001 sur PO-2026-001' })
    expect(
      Array.from((row as HTMLTableRowElement).cells)
        .map((c) => c.textContent?.trim())
        .slice(4, 7),
    ).toEqual(['15 %', '12 750,00', '14 917,56'])
    // 12 750 + 200 + 50 = 13 000,00 GBP ; 14 917,56 + 234,00 + 58,50 = 15 210,06 €
    const foot = within(card).getAllByRole('row').at(-1)!
    expect(Array.from((foot as HTMLTableRowElement).cells).map((c) => c.textContent?.trim())).toEqual(['Total HT', '13 000,00', '15 210,06', '', ''])
    expect(api.purchaseOrders[0]?.deliveryAddress).toBe('12 rue du Chantier')

    await user.click(within(card).getByRole('button', { name: 'Émettre' }))
    const dialog = await screen.findByRole('dialog', { name: /Émettre PO-2026-001/ })
    await user.click(within(dialog).getByRole('button', { name: 'Émettre' }))
    expect(await screen.findByText('PO-2026-001 émis : lignes commandées.')).toBeTruthy()
    await waitFor(() => expect(api.items.map((i) => i.status)).toEqual(['ordered', 'ordered', 'ordered']))
    expect(api.items.map((i) => i.orderRef)).toEqual(['PO-2026-001', 'PO-2026-001', 'PO-2026-001'])
    expect(await within(card).findByText('Émis')).toBeTruthy()
    expect(within(card).queryByRole('button', { name: 'Émettre' })).toBeNull()
    expect(within(card).queryByLabelText('Quantité LUM-001')).toBeNull()
    // Budget: « Engagé » now equals the order.
    await user.click(screen.getByRole('button', { name: 'Budget' }))
    const global = await screen.findByRole('table', { name: 'Budget global' })
    const globalRow = within(global).getByRole('row', { name: /Global/ })
    expect(Array.from((globalRow as HTMLTableRowElement).cells).map((c) => c.textContent?.trim())[5]).toBe('15 210,06')
  })

  test('document imprimable : en-tête de l’agence, fournisseur, adresse de livraison, lignes et total', async () => {
    const user = userEvent.setup()
    api.setting.agencyName = 'Atelier X'
    await openOrders(user)
    await user.click(screen.getByRole('button', { name: 'Nouveau bon de commande' }))
    await screen.findByRole('option', { name: 'Tom Dixon' })
    await user.selectOptions(screen.getByLabelText('Fournisseur du bon de commande'), '1')
    await user.click(await screen.findByLabelText('Commander LUM-002'))
    await user.click(screen.getByRole('button', { name: 'Créer le bon de commande' }))
    const card = await screen.findByRole('article', { name: 'Bon de commande PO-2026-001' })
    await user.click(within(card).getByRole('button', { name: 'Document' }))
    expect(within(card).getByRole('link', { name: 'PDF' }).getAttribute('href')).toBe('/api/v1/purchase-orders/1/pdf')
    const doc = await screen.findByRole('document', { name: 'Bon de commande PO-2026-001' })
    expect(within(doc).getByText('Atelier X')).toBeTruthy()
    expect(within(doc).getByText('Tom Dixon')).toBeTruthy()
    expect(within(doc).getByText('12 rue du Chantier')).toBeTruthy()
    expect(within(doc).getByText('Applique')).toBeTruthy()
    expect(within(doc).getAllByText('200,00').length).toBeGreaterThanOrEqual(2)
    expect(within(doc).getByText(/Contre-valeur HT EUR/)).toBeTruthy()
  })

  test('annuler un BC émis : note obligatoire, lignes annulées', async () => {
    const user = userEvent.setup()
    api.purchaseOrders.push({
      id: 1,
      projectId: 1,
      supplierId: 1,
      supplierName: 'Tom Dixon',
      number: 'PO-2026-001',
      status: 'issued',
      currency: 'GBP',
      fxRateMicro: GBP,
      issuedOn: '2026-10-10',
      expectedDeliveryOn: null,
      supplierRef: null,
      deliveryAddress: null,
      deliveryContact: null,
      paymentTerms: null,
      notes: null,
      internalNotes: null,
      totalCents: 5_000,
      totalEurCents: 5_850,
      vatByRateBp: { 2000: 1170 },
      vatCents: 1170,
      ttcEurCents: 7_020,
      invoicedHtCents: 0,
      paidHtCents: 0,
      deliveriesCount: 0,
      lines: [
        {
          id: 99,
          purchaseOrderId: 1,
          projectItemId: 3,
          itemCode: 'LUM-003',
          itemStatus: 'ordered',
          description: 'Ampoule',
          qtyMilli: 1000,
          unitCostCents: 5_000,
          discountBp: 0,
          vatRateBp: 2000,
          sortOrder: 0,
          netUnitCents: 5_000,
          totalCents: 5_000,
          netUnitEurCents: 5_850,
          totalEurCents: 5_850,
          receivedQtyMilli: 0,
        },
      ],
      files: [],
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
    })
    api.items[2]!.status = 'ordered'
    await openOrders(user)
    const card = await screen.findByRole('article', { name: 'Bon de commande PO-2026-001' })
    await user.click(within(card).getByRole('button', { name: 'Annuler le BC' }))
    await user.type(await screen.findByLabelText('Note d’annulation'), 'fournisseur défaillant')
    await user.click(screen.getByRole('button', { name: 'Annuler le bon de commande' }))
    expect(await screen.findByText('PO-2026-001 annulé.')).toBeTruthy()
    await waitFor(() => expect(api.items[2]?.status).toBe('cancelled'))
    expect(api.events.at(-1)?.note).toBe('BC PO-2026-001 annulé : fournisseur défaillant')
  })
})
