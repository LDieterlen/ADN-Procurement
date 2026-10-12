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

// An issued order at Tom Dixon : LUM-001 × 12 (1 062,50 GBP net) and LUM-002 × 2 (100 GBP).
beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP', defaultDiscountBp: 1500 }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
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
        status: 'ordered',
        orderRef: 'PO-2026-001',
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
        status: 'ordered',
        orderRef: 'PO-2026-001',
        placements: [placement(2, 1, 2000)],
      },
      2,
    ),
  )
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
    totalCents: 1_295_000,
    totalEurCents: 1_515_156,
    vatByRateBp: { 2000: 303_031 },
    vatCents: 303_031,
    ttcEurCents: 1_818_187,
    invoicedHtCents: 0,
    paidHtCents: 0,
    deliveriesCount: 0,
    lines: [
      {
        id: 11,
        purchaseOrderId: 1,
        projectItemId: 1,
        itemCode: 'LUM-001',
        itemStatus: 'ordered',
        description: 'Beat Light Fat',
        qtyMilli: 12_000,
        unitCostCents: 125_000,
        discountBp: 1500,
        vatRateBp: 2000,
        sortOrder: 0,
        netUnitCents: 106_250,
        totalCents: 1_275_000,
        netUnitEurCents: 124_313,
        totalEurCents: 1_491_756,
        receivedQtyMilli: 0,
      },
      {
        id: 12,
        purchaseOrderId: 1,
        projectItemId: 2,
        itemCode: 'LUM-002',
        itemStatus: 'ordered',
        description: 'Applique',
        qtyMilli: 2_000,
        unitCostCents: 10_000,
        discountBp: 0,
        vatRateBp: 2000,
        sortOrder: 1,
        netUnitCents: 10_000,
        totalCents: 20_000,
        netUnitEurCents: 11_700,
        totalEurCents: 23_400,
        receivedQtyMilli: 0,
      },
    ],
    files: [],
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  })
})
afterEach(() => api.restore())

async function openOrders(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/projects/1', { advanced: true })
  await user.click(await screen.findByRole('button', { name: 'Commandes' }))
  return screen.findByRole('article', { name: 'Bon de commande PO-2026-001' })
}

describe('réceptions et factures d’un bon de commande', () => {
  test('réception partielle puis totale : statut du BC, lignes livrées, quantités reçues', async () => {
    const user = userEvent.setup()
    const card = await openOrders(user)
    const receipts = within(card).getByRole('region', { name: 'Réceptions PO-2026-001' })
    await user.click(within(receipts).getByRole('button', { name: 'Réceptionner' }))
    await user.type(within(receipts).getByLabelText('Date de réception PO-2026-001'), '2026-11-02')
    await user.type(within(receipts).getByLabelText('Référence de réception PO-2026-001'), 'BL-1')
    const lamp = within(receipts).getByLabelText('Quantité reçue LUM-001')
    expect((lamp as HTMLInputElement).value).toBe('12')
    await user.clear(lamp)
    await user.type(lamp, '6')
    await user.clear(within(receipts).getByLabelText('Quantité reçue LUM-002'))
    await user.click(within(receipts).getByRole('button', { name: 'Enregistrer la réception' }))
    expect(await screen.findByText('Réception enregistrée.')).toBeTruthy()
    await waitFor(() => expect(api.purchaseOrders[0]?.status).toBe('partially_delivered'))
    expect(api.items[0]?.status).toBe('ordered')
    expect(await within(card).findByText('Partiellement livré')).toBeTruthy()
    expect(within(card).getByText('6 / 12')).toBeTruthy()

    await user.click(within(card).getByRole('button', { name: 'Réceptionner' }))
    await user.type(within(card).getByLabelText('Date de réception PO-2026-001'), '2026-11-20')
    await user.click(within(card).getByRole('button', { name: 'Enregistrer la réception' }))
    await waitFor(() => expect(api.purchaseOrders[0]?.status).toBe('closed'))
    expect(api.items.map((i) => i.status)).toEqual(['delivered', 'delivered'])
    expect(api.events.filter((e) => e.toStatus === 'delivered')).toHaveLength(2)
    expect(await within(card).findByText('Clos')).toBeTruthy()
    expect(within(card).queryByRole('button', { name: 'Réceptionner' })).toBeNull()
  })

  test('facture d’acompte puis paiement : Facturé et Payé du budget suivent', async () => {
    const user = userEvent.setup()
    const card = await openOrders(user)
    const invoices = within(card).getByRole('region', { name: 'Factures PO-2026-001' })
    await user.click(within(invoices).getByRole('button', { name: 'Ajouter une facture' }))
    await user.selectOptions(within(invoices).getByLabelText('Type de facture'), 'deposit')
    await user.type(within(invoices).getByLabelText('Référence de facture'), 'F-0101')
    await user.type(within(invoices).getByLabelText('Date de facture'), '2026-10-15')
    await user.type(within(invoices).getByLabelText('Montant HT de facture'), '3885')
    await user.click(within(invoices).getByRole('button', { name: 'Enregistrer la facture' }))
    expect(await screen.findByText('Facture enregistrée.')).toBeTruthy()
    const line = await within(card).findByLabelText('Facture F-0101')
    expect(line.textContent).toContain('Acompte')
    expect(line.textContent).toContain('3 885,00 HT + 0,00 TVA = 3 885,00 GBP')
    await user.click(within(line).getByRole('button', { name: 'Payer F-0101' }))
    await user.type(within(card).getByLabelText('Date de paiement F-0101'), '2026-10-20')
    await user.click(within(card).getByRole('button', { name: 'Confirmer' }))
    expect(await screen.findByText('Facture F-0101 payée.')).toBeTruthy()
    await waitFor(() => expect(api.invoices[0]?.paidOn).toBe('2026-10-20'))
    await user.click(screen.getByRole('button', { name: 'Budget' }))
    const global = await screen.findByRole('table', { name: 'Budget global' })
    const cells = Array.from((within(global).getByRole('row', { name: /Global/ }) as HTMLTableRowElement).cells).map((c) => c.textContent?.trim())
    // Engagé 15 151,56 (issued order) ; facturé = payé = 3 885 × 1,17 = 4 545,45 €.
    expect(cells.slice(5, 8)).toEqual(['15 151,56', '4 545,45', '4 545,45'])
  })
})
