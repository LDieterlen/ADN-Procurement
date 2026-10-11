// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

const GBP = 1_170_000

// LUM-001 Beat Light Fat, 1 250,00 GBP −15 % (fx 1,17) ; deux devis : Tom Dixon 1 180 GBP −15 %, Flos 1 100 EUR.
beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [
      { name: 'Tom Dixon', currency: 'GBP', defaultDiscountBp: 1500 },
      { name: 'Flos SpA', currency: 'EUR' },
    ],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    zones: [{ projectId: 1, code: 'CHA', name: 'Chambre type A', multiplier: 12, sortOrder: 20 }],
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

async function openQuotes(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/projects/1')
  await user.click(await screen.findByRole('button', { name: 'Devis' }))
}

describe('onglet Devis', () => {
  test('créer deux devis avec une ligne chacun : net et net € viennent du serveur', async () => {
    const user = userEvent.setup()
    await openQuotes(user)
    expect(await screen.findByText('Aucun devis.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Nouveau devis' }))
    await screen.findByRole('option', { name: 'Tom Dixon' })
    await user.selectOptions(screen.getByLabelText('Fournisseur du devis'), '1')
    await user.type(screen.getByLabelText('Référence du devis'), 'TD-2026-118')
    await user.click(screen.getByRole('button', { name: 'Créer le devis' }))
    const card = await screen.findByRole('article', { name: 'Devis TD-2026-118' })
    expect(within(card).getByText(/GBP \(1 = 1,17 €\)/)).toBeTruthy()
    await user.selectOptions(within(card).getByLabelText('Article à chiffrer (TD-2026-118)'), '1')
    await user.type(within(card).getByLabelText('Prix unitaire (TD-2026-118)'), '1180')
    await user.clear(within(card).getByLabelText('Remise (TD-2026-118)'))
    await user.type(within(card).getByLabelText('Remise (TD-2026-118)'), '15')
    await user.type(within(card).getByLabelText('Délai (TD-2026-118)'), '10')
    await user.click(within(card).getByRole('button', { name: 'Ajouter la ligne' }))
    const row = await within(card).findByRole('row', { name: 'LUM-001 chez Tom Dixon' })
    const cells = Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent?.trim())
    expect(cells.slice(1, 6)).toEqual(['1 180,00', '15 %', '1 003,00', '1 173,51', '10 sem.'])
    expect(api.requests.filter((r) => r.method === 'POST' && r.path === '/api/v1/quotes/1/lines')).toHaveLength(1)
  })

  test('retenir une ligne : la ligne du projet prend le prix, passe en chiffré, l’historique l’enregistre', async () => {
    const user = userEvent.setup()
    api.quotes.push({
      id: 1,
      projectId: 1,
      supplierId: 2,
      supplierName: 'Flos SpA',
      reference: 'FL-1',
      quotedOn: null,
      validUntil: null,
      currency: 'EUR',
      fxRateMicro: 1_000_000,
      declinedAt: null,
      notes: null,
      retainedCount: 0,
      lines: [
        {
          id: 1,
          quoteId: 1,
          projectItemId: 1,
          itemCode: 'LUM-001',
          itemName: 'Beat Light Fat',
          unitCostCents: 110_000,
          discountBp: 0,
          leadTimeWeeks: null,
          description: null,
          notes: null,
          retainedAt: null,
          netUnitCents: 110_000,
          netUnitEurCents: 110_000,
          createdAt: '2026-10-10T00:00:00Z',
          updatedAt: '2026-10-10T00:00:00Z',
        },
      ],
      files: [],
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
    })
    await openQuotes(user)
    const card = await screen.findByRole('article', { name: 'Devis FL-1' })
    await user.click(within(card).getByRole('button', { name: 'Retenir LUM-001 chez Flos SpA' }))
    expect(await screen.findByText('Devis FL-1 retenu pour LUM-001.')).toBeTruthy()
    await waitFor(() =>
      expect(api.items[0]).toMatchObject({
        supplierId: 2,
        unitCostCents: 110_000,
        currency: 'EUR',
        fxRateMicro: 1_000_000,
        status: 'quoted',
        quoteRef: 'FL-1',
      }),
    )
    expect(await within(card).findByText('retenue')).toBeTruthy()
    expect(within(card).getByText('1 retenue(s)')).toBeTruthy()
    expect(api.events.map((e) => e.kind)).toEqual(['quote', 'status'])
    expect(api.events[0]?.note).toBe('Devis FL-1 (Flos SpA) retenu.')
    // Comparison in the line panel shows it as retained.
    await user.click(screen.getByRole('button', { name: 'Lignes' }))
    const table = await screen.findByRole('table', { name: 'Lignes du projet' })
    await user.click(within(table).getByRole('row', { name: 'LUM-001 dans CHA' }))
    const panel = await screen.findByRole('dialog', { name: 'Fiche de la ligne' })
    const section = await within(panel).findByRole('region', { name: 'Devis de la ligne' })
    expect(within(section).getByText('retenu')).toBeTruthy()
    expect(section.textContent).toContain('1 100,00 EUR')
    expect(section.textContent).toContain('Flos SpA')
    await user.click(within(panel).getByRole('button', { name: /Historique/ }))
    const history = await within(panel).findByRole('list', { name: 'Historique de la ligne' })
    expect(within(history).getByText(/Devis FL-1 \(Flos SpA\) retenu\./)).toBeTruthy()
  })

  test('projet clos : ni nouveau devis ni bouton Retenir', async () => {
    const user = userEvent.setup()
    api.projects[0]!.status = 'closed'
    await openQuotes(user)
    expect(await screen.findByText('Aucun devis.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nouveau devis' })).toBeNull()
  })
})
