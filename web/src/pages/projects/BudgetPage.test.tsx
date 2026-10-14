// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, placementRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon' }, { name: 'Atelier Bois' }],
    categories: [{ code: 'LUD', name: 'Luminaire décoratif' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    locations: [
      { projectId: 1, code: 'LOB', name: 'Lobby', zone: 'Zones communes', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre typo A', zone: 'Hébergement', multiplier: 12, sortOrder: 20 },
    ],
    budgets: [
      { projectId: 1, scope: 'global', amountCents: 2_000_000 },
      { projectId: 1, scope: 'zone', zone: 'Hébergement', amountCents: 1_500_000 },
    ],
    items: [
      {
        projectId: 1,
        itemCode: 'CHA-LUD-01',
        name: 'Lampe',
        supplierId: 1,
        family: 'edition',
        unitCostCents: 100_000,
        status: 'approved',
        placements: [placementRow(1, 2, 1000)],
      },
      {
        projectId: 1,
        itemCode: 'LOB-LUD-01',
        name: 'Table',
        supplierId: 2,
        family: 'custom',
        unitCostCents: 50_000,
        status: 'quoted',
        placements: [placementRow(2, 1, 1000)],
      },
    ],
  })
})
afterEach(() => api.restore())

const rowsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent))

describe('page Budget', () => {
  test('répartition par état et compilation par zone avec le prévisionnel', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/budget')
    const strip = await screen.findByRole('region', { name: 'Synthèse budget' })
    expect(strip.textContent).toContain('Prescrit HT12 500,00 €')
    expect(strip.textContent).toContain('Validé HT12 000,00 €')
    const statuses = await screen.findByRole('list', { name: 'Parts par état' })
    const approved = within(statuses).getByText('Validé · 1').closest('li')!
    expect(approved.textContent).toContain('12 000,00 €')
    expect(approved.textContent).toContain('96 %')
    const zones = screen.getByRole('table', { name: 'Compilation par zone' })
    const hosting = rowsOf(zones).find((r) => r[0] === 'Hébergement')
    expect(hosting?.slice(2)).toEqual(['12 000,00 €', '12 000,00 €', '12 000,00 €', '3 000,00 €'])
    expect((within(zones).getByLabelText('Prévisionnel Hébergement') as HTMLInputElement).value).toBe('15 000,00')
    await user.click(within(screen.getByRole('radiogroup', { name: 'Axe de compilation' })).getByRole('radio', { name: 'Fournisseur' }))
    const suppliers = await screen.findByRole('table', { name: 'Compilation par fournisseur' })
    expect(rowsOf(suppliers).map((r) => r[0])).toEqual(['Atelier Bois', 'Tom Dixon'])
  })

  test('saisir un prévisionnel par fournisseur envoie un PUT qui conserve les autres enveloppes', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/budget')
    await screen.findByRole('table', { name: 'Compilation par zone' })
    await user.click(within(screen.getByRole('radiogroup', { name: 'Axe de compilation' })).getByRole('radio', { name: 'Fournisseur' }))
    const input = await screen.findByLabelText('Prévisionnel Tom Dixon')
    await user.type(input, '20 000')
    await user.tab()
    await waitFor(() => expect(api.budgets.some((b) => b.scope === 'supplier' && b.supplierId === 1 && b.amountCents === 2_000_000)).toBe(true))
    expect(api.budgets.map((b) => b.scope).sort()).toEqual(['global', 'supplier', 'zone'])
    const table = screen.getByRole('table', { name: 'Compilation par fournisseur' })
    await waitFor(() => expect(rowsOf(table).find((r) => r[0] === 'Tom Dixon')?.[5]).toBe('8 000,00 €'))
  })

  test('filtrer par zone restreint les montants et bloque l’édition du prévisionnel', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/budget')
    await screen.findByRole('table', { name: 'Compilation par zone' })
    await user.selectOptions(screen.getByLabelText('Filtrer par zone'), 'Zones communes')
    const strip = screen.getByRole('region', { name: 'Synthèse budget' })
    await waitFor(() => expect(screen.getByText(/Filtres actifs/)).toBeTruthy())
    const table = screen.getByRole('table', { name: 'Compilation par zone' })
    await waitFor(() => expect(rowsOf(table).map((r) => r[0])).toEqual(['Hébergement', 'Zones communes']))
    expect(rowsOf(table)[1]?.[2]).toBe('500,00 €')
    expect(rowsOf(table)[0]?.[2]).toBe('0,00 €')
    expect(screen.queryByLabelText('Prévisionnel Zones communes')).toBeNull()
    expect(strip.textContent).toContain('Prescrit HT12 500,00 €') // the strip stays unfiltered
  })
})
