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
    categories: [
      { code: 'LUD', name: 'Luminaire décoratif', sortOrder: 10 },
      { code: 'AS', name: 'Assise', sortOrder: 5 },
    ],
    products: [{ name: 'Beat Light Fat', categoryId: 1, supplierId: 1, reference: 'BLS01', listPriceCents: 125_000, currency: 'GBP', finish: 'laiton' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    locations: [
      { projectId: 1, code: 'LOB', name: 'Lobby', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre typo A', zone: 'Hébergement', multiplier: 12, sortOrder: 20 },
    ],
    budgets: [{ projectId: 1, scope: 'global', amountCents: 5_000_000 }],
  })
})
afterEach(() => api.restore())

const cellsOf = (row: HTMLElement) => Array.from((row as HTMLTableRowElement).cells).map((c) => c.textContent)

describe('page Nouvel article', () => {
  test('article libre dans CHA ×12 : code CHA-LUD-01, produit créé au catalogue, arrivée sur la page de l’article', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await user.click(await screen.findByRole('link', { name: '+ Ajouter un article' }))
    expect(await screen.findByRole('heading', { name: 'Nouvel article' })).toBeTruthy()
    await user.type(screen.getByLabelText('Désignation'), 'Applique de chevet')
    await screen.findByRole('option', { name: 'LUD — Luminaire décoratif' })
    await user.selectOptions(screen.getByLabelText('Type'), '1')
    await user.type(screen.getByLabelText('Dimensions'), 'L 20 cm')
    await user.selectOptions(screen.getByLabelText('Famille'), 'edition')
    await user.type(screen.getByLabelText('Prix unitaire HT'), '450')
    const placement = screen.getByRole('region', { name: 'Implantation' })
    await user.selectOptions(within(placement).getByLabelText('Localisation'), '2')
    await user.clear(within(placement).getByLabelText('Quantité'))
    await user.type(within(placement).getByLabelText('Quantité'), '2')
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    expect(await screen.findByRole('heading', { name: 'Applique de chevet' })).toBeTruthy()
    expect(api.items[0]).toMatchObject({ itemCode: 'CHA-LUD-01', productId: 2, unitCostCents: 45_000, dimensions: 'L 20 cm', family: 'edition' })
    expect(api.items[0]?.placements.map((p) => [p.locationId, p.qtyMilli])).toEqual([[2, 2000]])
    expect(api.products.at(-1)?.name).toBe('Applique de chevet') // joins the catalogue by default
    expect(await screen.findByText(/10 800,00 € HT/)).toBeTruthy() // 450 × 2 × 12
    await user.click(screen.getByRole('link', { name: 'Retour au projet' }))
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    const row = await within(table).findByRole('row', { name: 'CHA-LUD-01 dans CHA' })
    expect(cellsOf(row).slice(1, 5)).toEqual(['CHA-LUD-01', 'Luminaire décoratif', 'Applique de chevet', '2 × 12'])
    const strip = screen.getByRole('region', { name: 'Synthèse budget' })
    await waitFor(() => expect(strip.textContent).toContain('Prescrit HT10 800,00 €'))
  })

  test('« ne pas ajouter au catalogue » laisse le catalogue intact', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    await user.type(await screen.findByLabelText('Désignation'), 'Tête de lit')
    await screen.findByRole('option', { name: 'AS — Assise' })
    await user.selectOptions(screen.getByLabelText('Type'), '2')
    await user.click(screen.getByLabelText('Ne pas ajouter au catalogue'))
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    await screen.findByRole('heading', { name: 'Tête de lit' })
    expect(api.items[0]?.productId).toBeNull()
    expect(api.products).toHaveLength(1)
  })

  test('depuis le catalogue en GBP : la fiche est pré-remplie, le taux demandé, le montant 14 917,56 € apparaît', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    await screen.findByRole('option', { name: /Beat Light Fat/ })
    await user.selectOptions(screen.getByLabelText('Produit du catalogue'), '1')
    expect((screen.getByLabelText('Désignation') as HTMLInputElement).value).toBe('Beat Light Fat')
    expect((screen.getByLabelText('Référence') as HTMLInputElement).value).toBe('BLS01')
    expect((screen.getByLabelText('Prix unitaire HT') as HTMLInputElement).value).toBe('1 250,00')
    expect(screen.queryByLabelText('Ne pas ajouter au catalogue')).toBeNull()
    await user.type(screen.getByLabelText('Taux (1 GBP = … €)'), '1,17')
    const placement = screen.getByRole('region', { name: 'Implantation' })
    await user.selectOptions(within(placement).getByLabelText('Localisation'), '2')
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    await screen.findByRole('heading', { name: 'Beat Light Fat' })
    expect(api.items[0]).toMatchObject({ productId: 1, fxRateMicro: 1_170_000, discountBp: 1500, reference: 'BLS01', finish: 'laiton', currency: 'GBP' })
    expect(await screen.findByText(/14 917,56 € HT/)).toBeTruthy()
  })

  test('un fournisseur se crée depuis la page sans la quitter', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    await user.click(await screen.findByRole('button', { name: 'Nouveau : fournisseur' }))
    const modal = await screen.findByRole('dialog', { name: 'Nouveau fournisseur' })
    await user.type(within(modal).getByLabelText('Nom'), 'Silvera')
    await user.click(within(modal).getByRole('button', { name: 'Créer' }))
    await screen.findByText('Fournisseur créé.')
    expect((screen.getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe(String(api.suppliers.at(-1)?.id))
  })

  test('coller une adresse : la fiche est pré-remplie, le fournisseur créé, la photo jointe à la création', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const box = await screen.findByRole('region', { name: 'Coller une adresse' })
    await user.type(within(box).getByLabelText('Adresse de la fiche produit'), 'https://www.tikamoon.com/art-chaise-7718.htm')
    await user.click(within(box).getByRole('button', { name: 'Lire la page' }))
    expect(await within(box).findByText('Santino - Chaise en chêne massif et cuir')).toBeTruthy()
    expect(within(box).getByText(/Tikamoon · réf. 7718 · 399,00 EUR affiché/)).toBeTruthy()
    await user.click(within(box).getByRole('button', { name: 'Utiliser' }))
    await screen.findByText(/Fiche pré-remplie/)
    expect((screen.getByLabelText('Désignation') as HTMLInputElement).value).toBe('Santino - Chaise en chêne massif et cuir')
    expect((screen.getByLabelText('Référence') as HTMLInputElement).value).toBe('7718')
    expect((screen.getByLabelText('Prix unitaire HT') as HTMLInputElement).value).toBe('399,00')
    expect((screen.getByLabelText('Lien internet') as HTMLInputElement).value).toBe('https://www.tikamoon.com/art-chaise-7718.htm')
    expect(api.suppliers.at(-1)?.name).toBe('Tikamoon') // the brand is a supplier here
    expect((screen.getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe(String(api.suppliers.at(-1)?.id))
    expect(api.files).toHaveLength(1) // the image was downloaded by the server on « Utiliser »
    const photo = within(screen.getByRole('region', { name: 'Article' })).getByRole('img', { name: 'Photo' })
    expect(photo.getAttribute('src')).toBe('/api/v1/files/1/content') // visible before « Créer »
    await screen.findByRole('option', { name: 'AS — Assise' })
    await user.selectOptions(screen.getByLabelText('Type'), '2')
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    await screen.findByRole('heading', { name: 'Santino - Chaise en chêne massif et cuir' })
    expect(api.items[0]).toMatchObject({
      reference: '7718',
      unitCostCents: 39_900,
      supplierId: api.suppliers.at(-1)?.id,
      sourceUrl: 'https://www.tikamoon.com/art-chaise-7718.htm',
    })
    expect(api.items[0]?.files[0]).toMatchObject({ fileId: 1, isPrimary: true })
  })

  test('une page illisible affiche le message du serveur', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const box = await screen.findByRole('region', { name: 'Coller une adresse' })
    await user.type(within(box).getByLabelText('Adresse de la fiche produit'), 'https://shop.example.com/nothing')
    await user.click(within(box).getByRole('button', { name: 'Lire la page' }))
    expect(await within(box).findByRole('alert')).toHaveProperty('textContent', 'Aucune fiche produit lisible sur cette page.')
  })
})
