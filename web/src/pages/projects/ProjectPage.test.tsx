// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP', defaultDiscountBp: 1500 }],
    manufacturers: [{ name: 'Flos' }],
    categories: [
      { code: 'LUD', name: 'Luminaire décoratif', sortOrder: 10 },
      { code: 'AS', name: 'Assise', sortOrder: 5 },
    ],
    products: [{ name: 'Beat Light Fat', categoryId: 1, supplierId: 1, reference: 'BLS01', listPriceCents: 125_000, currency: 'GBP', finish: 'laiton' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    locations: [
      { projectId: 1, code: 'LOB', name: 'Lobby', zone: 'Zones communes', level: 'R0', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre typo A', zone: 'Hébergement', level: 'R+1', multiplier: 12, sortOrder: 20 },
    ],
    budgets: [{ projectId: 1, scope: 'global', amountCents: 5_000_000 }],
  })
})
afterEach(() => api.restore())

const cellsOf = (row: HTMLElement) => Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent)

describe('page projet', () => {
  test('localisations : liste avec zone, niveau et nombre ; ajout en bas de tableau ; code dupliqué refusé', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    const table = await screen.findByRole('table', { name: 'Localisations du projet' })
    expect(within(table).getByText('Hébergement')).toBeTruthy()
    expect(within(table).getByText('R+1')).toBeTruthy()
    expect(within(table).getByText('×12')).toBeTruthy()
    await user.type(screen.getByLabelText('Code'), 'cha')
    await user.type(screen.getByLabelText('Nom'), 'Doublon')
    await user.click(screen.getByRole('button', { name: 'Ajouter la localisation' }))
    expect(await screen.findByText('Une localisation de ce projet porte déjà ce code.')).toBeTruthy()
    await user.clear(screen.getByLabelText('Code'))
    await user.type(screen.getByLabelText('Code'), 'sui')
    await user.clear(screen.getByLabelText('Nom'))
    await user.type(screen.getByLabelText('Nom'), 'Junior suite')
    await user.type(screen.getByLabelText('Zone'), 'Hébergement')
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), '4')
    await user.click(screen.getByRole('button', { name: 'Ajouter la localisation' }))
    await within(table).findByText('Junior suite')
    expect(api.locations.at(-1)).toMatchObject({ code: 'SUI', zone: 'Hébergement', multiplier: 4, sortOrder: 30 })
    await user.click(screen.getByRole('button', { name: 'Descendre Lobby' }))
    await waitFor(() => expect(api.locations.find((l) => l.code === 'LOB')?.sortOrder).toBe(20))
    await user.click(screen.getByRole('button', { name: 'Supprimer Junior suite' }))
    await waitFor(() => expect(api.locations.some((l) => l.code === 'SUI')).toBe(false))
  })

  test('ajouter un article libre dans CHA ×12 : code CHA-LUD-01, montant du serveur, bandeau budget, produit créé au catalogue', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    expect(await screen.findByText(/Aucun article/)).toBeTruthy()
    const strip = screen.getByRole('region', { name: 'Synthèse budget' })
    expect(strip.textContent).toContain('Reste50 000,00 €')
    await user.type(screen.getByLabelText('Désignation'), 'Applique de chevet')
    await screen.findByRole('option', { name: 'LUD — Luminaire décoratif' })
    await user.selectOptions(screen.getByLabelText('Type'), '1')
    await user.selectOptions(screen.getByLabelText('Localisation'), '2')
    await user.clear(screen.getByLabelText('Quantité'))
    await user.type(screen.getByLabelText('Quantité'), '2')
    await user.click(screen.getByRole('button', { name: "Ajouter l'article" }))
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    const row = await within(table).findByRole('row', { name: 'CHA-LUD-01 dans CHA' })
    expect(cellsOf(row).slice(1, 5)).toEqual(['CHA-LUD-01', 'Luminaire décoratif', 'Applique de chevet', '2 × 12'])
    expect(api.items[0]).toMatchObject({ itemCode: 'CHA-LUD-01', productId: 2, unitCostCents: 0 })
    expect(api.products.at(-1)?.name).toBe('Applique de chevet') // joins the catalogue by default
    expect((screen.getByLabelText('Désignation') as HTMLInputElement).value).toBe('') // form reset
  })

  test('ajouter depuis le catalogue en GBP : le taux est demandé, puis le montant 14 917,56 € apparaît', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByText(/Aucun article/)
    await screen.findByRole('option', { name: /Beat Light Fat/ })
    await user.selectOptions(screen.getByLabelText('Produit'), '1')
    await user.selectOptions(screen.getByLabelText('Localisation'), '2')
    await user.type(await screen.findByLabelText('Taux (1 GBP = … €)'), '1,17')
    await user.click(screen.getByRole('button', { name: "Ajouter l'article" }))
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    const row = await within(table).findByRole('row', { name: 'CHA-LUD-01 dans CHA' })
    expect(cellsOf(row).slice(3, 7)).toEqual(['Beat Light Fat', '1 × 12', 'Tom Dixon', '14 917,56 €'])
    expect(api.items[0]).toMatchObject({ fxRateMicro: 1_170_000, discountBp: 1500, reference: 'BLS01', finish: 'laiton', productId: 1 })
    const strip = screen.getByRole('region', { name: 'Synthèse budget' })
    await waitFor(() => expect(strip.textContent).toContain('Prescrit HT14 917,56 €'))
    expect(strip.textContent).toContain('Reste35 082,44 €')
  })

  test("le statut se change dans la liste et l'article annulé sort des totaux", async () => {
    const user = userEvent.setup()
    api.items.push({ ...api.items[0]!, id: 1 } as never)
    api.items.length = 0
    renderApp('/projects/1')
    await screen.findByText(/Aucun article/)
    await user.type(screen.getByLabelText('Désignation'), 'Tabouret')
    await screen.findByRole('option', { name: 'AS — Assise' })
    await user.selectOptions(screen.getByLabelText('Type'), '2')
    await user.click(screen.getByRole('button', { name: "Ajouter l'article" }))
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    await within(table).findByRole('row', { name: 'LOB-AS-01 dans LOB' })
    await user.selectOptions(within(table).getByLabelText('Statut de LOB-AS-01'), 'approved')
    await waitFor(() => expect(api.items[0]?.status).toBe('approved'))
    await user.selectOptions(within(table).getByLabelText('Statut de LOB-AS-01'), 'cancelled')
    const modal = await screen.findByRole('dialog', { name: 'Annuler LOB-AS-01' })
    await user.click(within(modal).getByRole('button', { name: "Annuler l'article" }))
    await waitFor(() => expect(api.items[0]?.status).toBe('cancelled'))
    expect(api.events.filter((e) => e.kind === 'status').map((e) => e.toStatus)).toEqual(['approved', 'cancelled'])
  })

  test('les PDF sont émis et listés dans « Documents émis »', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(screen.getByRole('link', { name: 'Fiches PDF' }).getAttribute('href')).toBe('/api/v1/projects/1/exports/sheets.pdf')
    expect(screen.getByRole('link', { name: 'Listing PDF' }).getAttribute('href')).toBe('/api/v1/projects/1/exports/list.pdf')
    expect(screen.getByRole('link', { name: 'Budget' }).getAttribute('href')).toBe('/projects/1/budget')
    await user.click(screen.getByRole('link', { name: 'Modifier' }))
    expect(await screen.findByRole('heading', { name: 'Modifier Rénovation' })).toBeTruthy()
  })
})
