// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'
import { designationOf } from './ItemForm'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP' }, { name: 'La Redoute / AM PM' }, { name: 'AM.PM Contract' }],
    categories: [
      { code: 'LUD', name: 'Luminaire décoratif', sortOrder: 10 },
      { code: 'AS', name: 'Assise', sortOrder: 5 },
    ],
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
  test('article dans CHA ×12 : code CHA-LUD-01, retour sur le projet', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await user.click(await screen.findByRole('link', { name: '+ Ajouter un article' }))
    expect(await screen.findByRole('heading', { name: 'Nouvel article' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    expect(await screen.findByText('Un nom est nécessaire.')).toBeTruthy() // the name, not the designation
    expect(api.items).toHaveLength(0)
    await user.type(screen.getByLabelText('Nom'), 'Applique de chevet')
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
    // Back on the project page, the new article in its list.
    expect(await screen.findByRole('heading', { name: 'Rénovation' })).toBeTruthy()
    expect(api.items[0]).toMatchObject({
      name: 'Applique de chevet',
      productName: 'Applique de chevet',
      itemCode: 'CHA-LUD-01',
      unitCostCents: 45_000,
      dimensions: 'L 20 cm',
      family: 'edition',
    })
    expect(api.items[0]?.placements.map((p) => [p.locationId, p.qtyMilli])).toEqual([[2, 2000]])
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    const row = await within(table).findByRole('row', { name: 'CHA-LUD-01 dans CHA' })
    expect(cellsOf(row).slice(1, 5)).toEqual(['CHA-LUD-01', 'Luminaire décoratif', 'Applique de chevet', '2 × 12'])
    const strip = screen.getByRole('region', { name: 'Synthèse budget' })
    await waitFor(() => expect(strip.textContent).toContain('Prescrit HT10 800,00 €'))
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

  test('coller une adresse : la fiche est pré-remplie, aucun fournisseur créé, la photo jointe à la création', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const box = await screen.findByRole('region', { name: 'Coller une adresse' })
    await user.type(within(box).getByLabelText('Adresse de la fiche produit'), 'https://www.tikamoon.com/art-chaise-7718.htm')
    await user.click(within(box).getByRole('button', { name: 'Lire la page' }))
    expect(await within(box).findByText('Santino - Chaise en chêne massif et cuir')).toBeTruthy()
    expect(within(box).getByText(/Tikamoon · réf. 7718 · 399,00 EUR affiché/)).toBeTruthy()
    await user.click(within(box).getByRole('button', { name: 'Utiliser' }))
    await screen.findByText(/Fiche pré-remplie/)
    expect((screen.getByLabelText('Désignation') as HTMLInputElement).value).toBe('Santino') // the first part of the name
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Santino - Chaise en chêne massif et cuir')
    expect((screen.getByLabelText('Référence') as HTMLInputElement).value).toBe('7718')
    expect((screen.getByLabelText('Prix unitaire HT') as HTMLInputElement).value).toBe('399,00')
    expect(screen.getByRole('link', { name: 'tikamoon.com/art-chaise-7718.htm' }).getAttribute('href')).toBe('https://www.tikamoon.com/art-chaise-7718.htm')
    expect((screen.getByLabelText('Dimensions') as HTMLInputElement).value).toBe('H 78 × L 56.10 × P 60.50 cm')
    expect((screen.getByLabelText('Délai') as HTMLInputElement).value).toBe('3 semaines')
    expect((screen.getByLabelText('Finitions') as HTMLInputElement).value).toBe('Chêne et cuir')
    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('2') // AS — Assise, guessed
    expect(api.suppliers.some((s) => s.name === 'Tikamoon')).toBe(false) // a brand never creates a supplier
    expect(screen.getByRole('note').textContent).toContain('Marque lue sur la page : Tikamoon. Aucun fournisseur ne lui ressemble')
    expect((screen.getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe('')
    expect(api.files).toHaveLength(2) // every photo of the page downloaded by the server on « Utiliser »
    const photo = within(screen.getByRole('region', { name: 'Article' })).getByRole('img', { name: 'Photo' })
    expect(photo.getAttribute('src')).toBe('/api/v1/files/1/content?v=111111111111') // visible before « Créer »
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(api.items[0]).toMatchObject({
      name: 'Santino',
      productName: 'Santino - Chaise en chêne massif et cuir',
      reference: '7718',
      unitCostCents: 39_900,
      supplierId: null,
      categoryId: 2,
      dimensions: 'H 78 × L 56.10 × P 60.50 cm',
      leadTime: '3 semaines',
      sourceUrl: 'https://www.tikamoon.com/art-chaise-7718.htm',
    })
    expect(api.items[0]?.files.map((f) => [f.fileId, f.isPrimary])).toEqual([
      [1, true],
      [2, false],
    ])
  })

  test('capture envoyée depuis Chrome : « Utiliser » pré-remplit la fiche, la capture est consommée à la création', async () => {
    const image = {
      id: 7,
      sha256: 'd'.repeat(64),
      ext: 'jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 10,
      originalName: 'armento.jpg',
      sourceUrl: null,
      createdAt: '2026-10-13T08:00:00Z',
    }
    const second = { ...image, id: 8, sha256: 'e'.repeat(64), originalName: 'armento-2.jpg' }
    api.files.push(image, second)
    api.captures.push({
      id: 1,
      preview: {
        url: 'https://www.laredoute.fr/ppdp/prod-602505402.aspx',
        name: 'Armento - Canapé',
        brand: 'AM.PM',
        reference: '602505402',
        imageUrl: null,
        imageUrls: [],
        priceCents: 89_900,
        currency: 'EUR',
        description: null,
        source: 'json-ld',
      },
      images: [image, second],
      createdAt: '2026-10-13T08:00:00Z',
    })
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const inbox = await screen.findByRole('region', { name: 'Envoyées depuis Chrome' })
    expect(within(inbox).getByText(/AM.PM · réf. 602505402 · 899,00 EUR affiché/)).toBeTruthy()
    await user.click(within(inbox).getByRole('button', { name: 'Utiliser' }))
    await screen.findByText(/Fiche pré-remplie/)
    expect((screen.getByLabelText('Désignation') as HTMLInputElement).value).toBe('Armento')
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Armento - Canapé')
    const note = screen.getByRole('note')
    expect(note.textContent).toContain('Fournisseurs proches')
    expect((screen.getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe('')
    await user.click(within(note).getByRole('button', { name: 'La Redoute / AM PM' }))
    expect((screen.getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe('2')
    const photo = within(screen.getByRole('region', { name: 'Article' })).getByRole('img', { name: 'Photo' })
    expect(photo.getAttribute('src')).toBe('/api/v1/files/7/content?v=dddddddddddd')
    await screen.findByRole('option', { name: 'AS — Assise' })
    await user.selectOptions(screen.getByLabelText('Type'), '2')
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(api.items[0]?.files.map((f) => [f.fileId, f.isPrimary])).toEqual([
      [7, true],
      [8, false],
    ]) // every photo of the capture, the first as main
    expect(api.captures).toHaveLength(0) // consumed
  })

  test('une capture se supprime sans être utilisée', async () => {
    api.captures.push({
      id: 1,
      preview: {
        url: 'https://x.example.com/p',
        name: 'Lampe',
        brand: null,
        reference: null,
        imageUrl: null,
        imageUrls: [],
        priceCents: null,
        currency: null,
        description: null,
        source: 'title',
      },
      images: [],
      createdAt: '2026-10-13T08:00:00Z',
    })
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const inbox = await screen.findByRole('region', { name: 'Envoyées depuis Chrome' })
    await user.click(within(inbox).getByRole('button', { name: 'Supprimer Lampe' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Envoyées depuis Chrome' })).toBeNull())
    expect(api.captures).toHaveLength(0)
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

describe('fournisseur parmi une longue liste', () => {
  test('la recherche ouvre la liste filtrée, le choix remplit le champ, la croix l’efface', async () => {
    api.restore()
    api = installFakeApi({
      clients: [{ name: 'Hôtel X SA' }],
      suppliers: [{ name: 'La Redoute / AM PM' }, ...Array.from({ length: 40 }, (_, i) => ({ name: `Fournisseur ${String(i).padStart(2, '0')}` }))],
      categories: [{ code: 'AS', name: 'Assise', sortOrder: 5 }],
      projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    })
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const box = await screen.findByRole('combobox', { name: 'Fournisseur' })
    await user.type(box, 'redoute')
    const list = await screen.findByRole('listbox')
    expect(within(list).getAllByRole('option')).toHaveLength(1)
    await user.click(within(list).getByRole('option', { name: 'La Redoute / AM PM' }))
    expect((box as HTMLInputElement).value).toBe('La Redoute / AM PM')
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.type(screen.getByLabelText('Nom'), 'Canapé')
    await user.selectOptions(screen.getByLabelText('Type'), '1')
    await user.click(screen.getByRole('button', { name: "Créer l'article" }))
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(api.items[0]?.supplierId).toBe(1)
  })

  test('taper un texte sans résultat laisse le choix précédent ; vider la case efface', async () => {
    api.restore()
    api = installFakeApi({
      clients: [{ name: 'Hôtel X SA' }],
      suppliers: Array.from({ length: 35 }, (_, i) => ({ name: `Fournisseur ${String(i).padStart(2, '0')}` })),
      categories: [{ code: 'AS', name: 'Assise', sortOrder: 5 }],
      projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    })
    const user = userEvent.setup()
    renderApp('/projects/1/items/new')
    const box = await screen.findByRole('combobox', { name: 'Fournisseur' })
    await user.type(box, '07{Enter}')
    expect((box as HTMLInputElement).value).toBe('Fournisseur 07')
    await user.type(box, 'zzz')
    expect(await screen.findByText('Aucun résultat.')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect((box as HTMLInputElement).value).toBe('Fournisseur 07') // unknown text: previous choice kept
    await user.click(screen.getByRole('button', { name: 'Effacer le choix' }))
    expect((box as HTMLInputElement).value).toBe('')
  })
})

test('la désignation est la première partie du nom, avant une virgule ou un séparateur', () => {
  expect(designationOf('Banquette modulable 2 places, capitonnée, en velours')).toBe('Banquette modulable 2 places')
  expect(designationOf('Lampe Bic noir design / LED - H 178 cm - Seletti')).toBe('Lampe Bic noir design')
  expect(designationOf('Beat Light Fat | Tom Dixon')).toBe('Beat Light Fat')
  expect(designationOf('Lave-mains Ondine (blanc)')).toBe('Lave-mains Ondine') // a hyphen in a word stays
  expect(designationOf("Canapé d'angle Armento")).toBe("Canapé d'angle Armento")
  expect(designationOf('(Édition limitée) Vase')).toBe('(Édition limitée) Vase') // nothing before: the whole name
})
