// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, placementRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi
const PNG = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], 'photo.png', { type: 'image/png' })

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP', contactName: 'Djamel Sabeur', phone: '01 00 00 00 00', mobile: '06 00 00 00 00' }],
    categories: [{ code: 'LUD', name: 'Luminaire décoratif' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    locations: [
      { projectId: 1, code: 'LOB', name: 'Lobby', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre typo A', multiplier: 12, sortOrder: 20 },
    ],
    items: [
      {
        projectId: 1,
        itemCode: 'CHA-LUD-01',
        name: 'Beat Light Fat',
        sourceUrl: 'https://www.tomdixon.net/beat-light-fat',
        supplierId: 1,
        unitCostCents: 125_000,
        currency: 'GBP',
        fxRateMicro: 1_170_000,
        discountBp: 1500,
        placements: [placementRow(1, 2, 1000)],
      },
    ],
  })
})
afterEach(() => api.restore())

/** « Enregistrer » is in the header and in the bottom bar: the header one. */
const saveButton = () => screen.getAllByRole('button', { name: 'Enregistrer' })[0]!

describe('page article', () => {
  test('fiche et budget en un formulaire : PATCH complet, montant total et contact fournisseur affichés', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    expect(await screen.findByRole('heading', { name: 'Beat Light Fat' })).toBeTruthy()
    expect(screen.getByText(/14 917,56 € HT/)).toBeTruthy()
    // The form mounts before the article arrives: the price text must follow the loaded value.
    await waitFor(() => expect((screen.getByLabelText('Prix unitaire HT') as HTMLInputElement).value).toBe('1 250,00'))
    expect((screen.getByLabelText('Remise') as HTMLInputElement).value).toBe('15')
    const rep = screen.getByRole('region', { name: 'Représentant' })
    expect(rep.textContent).toContain('Djamel Sabeur')
    expect(rep.textContent).toContain('06 00 00 00 00') // the mobile comes first
    await user.type(screen.getByLabelText('Référence'), 'BLS01')
    await user.type(screen.getByLabelText('Dimensions'), 'Ø 36 × H 30 cm')
    await user.selectOptions(screen.getByLabelText('Famille'), 'edition')
    await user.selectOptions(screen.getByLabelText('Usage'), 'indoor')
    await user.type(screen.getByLabelText('N° de devis'), 'DV-118')
    await user.clear(screen.getByLabelText('Remise'))
    await user.type(screen.getByLabelText('Remise'), '20')
    await user.click(saveButton())
    await screen.findByText('Article enregistré.')
    expect(api.items[0]).toMatchObject({
      reference: 'BLS01',
      dimensions: 'Ø 36 × H 30 cm',
      family: 'edition',
      usage: 'indoor',
      quoteRef: 'DV-118',
      discountBp: 2000,
      fxRateMicro: 1_170_000,
    })
    expect(api.events.some((e) => e.kind === 'price')).toBe(true)
    expect(await screen.findByText(/14 040,00 € HT/)).toBeTruthy() // 125 000 × 0,8 × 1,17 × 12
  })

  test("le lien internet est cliquable ; « Modifier » rend le champ, l'enregistrement revient au lien", async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    const link = await screen.findByRole('link', { name: 'tomdixon.net/beat-light-fat' })
    expect(link.getAttribute('href')).toBe('https://www.tomdixon.net/beat-light-fat')
    expect(link.getAttribute('target')).toBe('_blank')
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    const input = screen.getByLabelText('Lien internet') as HTMLInputElement
    expect(input.value).toBe('https://www.tomdixon.net/beat-light-fat')
    await user.clear(input)
    await user.type(input, 'https://www.tomdixon.net/beat-light-tall')
    await user.click(saveButton())
    await screen.findByText('Article enregistré.')
    expect(api.items[0]?.sourceUrl).toBe('https://www.tomdixon.net/beat-light-tall')
    expect(await screen.findByRole('link', { name: 'tomdixon.net/beat-light-tall' })).toBeTruthy()
  })

  test('implantation et photos : tout attend « Enregistrer », puis part en une fois', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    const card = await screen.findByRole('region', { name: 'Implantation' })
    await user.selectOptions(within(card).getByLabelText('Localisation à ajouter'), '1')
    await user.clear(within(card).getByLabelText('Quantité à ajouter'))
    await user.type(within(card).getByLabelText('Quantité à ajouter'), '2')
    await user.click(within(card).getByRole('button', { name: 'Ajouter' }))
    expect(within(card).getByText("à l'enregistrement")).toBeTruthy()
    const qty = within(card).getByLabelText('Quantité dans CHA')
    await user.clear(qty)
    await user.type(qty, '3')
    await user.tab()
    await user.upload(screen.getByLabelText('Photo à joindre'), PNG)
    expect(await screen.findByText('Principale')).toBeTruthy()
    // Sorted by hand: the photo becomes a finish, and stops being the main photo.
    await user.selectOptions(screen.getByLabelText('Catégorie de photo.png'), 'finish')
    expect([...(screen.getByLabelText('Catégorie de photo.png') as HTMLSelectElement).options].map((o) => o.text)).toEqual(['Photo', 'Finition', 'Plan'])
    // Nothing reached the server yet: the bar says so.
    expect(api.items[0]?.placements).toHaveLength(1)
    expect(api.items[0]?.files).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Modifications non enregistrées' })).toBeTruthy()
    await user.click(saveButton())
    await screen.findByText('Article enregistré.')
    expect(api.items[0]?.placements.map((p) => [p.locationId, p.qtyMilli])).toEqual([
      [2, 3000],
      [1, 2000],
    ])
    expect(api.items[0]?.files[0]).toMatchObject({ kind: 'finish', isPrimary: false })
    expect(api.requests.filter((r) => r.path.endsWith('/save'))).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Modifications non enregistrées' })).toBeNull()
  })

  test('quitter avec des modifications non enregistrées demande quoi faire', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    await user.type(await screen.findByLabelText('Référence'), 'BLS01')
    await user.click(screen.getByRole('button', { name: 'Retour au projet' }))
    const dialog = await screen.findByRole('dialog', { name: 'Modifications non enregistrées' })
    await user.click(within(dialog).getByRole('button', { name: 'Rester sur la page' }))
    expect(screen.getByRole('heading', { name: 'Beat Light Fat' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retour au projet' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Enregistrer et quitter' }))
    expect(await screen.findByRole('heading', { name: 'Rénovation' })).toBeTruthy()
    expect(api.items[0]?.reference).toBe('BLS01')
  })

  test('un fournisseur est créé depuis la fiche sans quitter la page', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    await user.click(await screen.findByRole('button', { name: 'Nouveau : fournisseur' }))
    const modal = await screen.findByRole('dialog', { name: 'Nouveau fournisseur' })
    await user.type(within(modal).getByLabelText('Nom'), 'Silvera')
    await user.click(within(modal).getByRole('button', { name: 'Créer' }))
    await screen.findByText('Fournisseur créé.')
    expect((screen.getByLabelText('Fournisseur') as HTMLSelectElement).value).toBe(String(api.suppliers.at(-1)?.id))
    expect(api.requests.filter((r) => r.method === 'POST' && r.path.startsWith('/api/v1/suppliers'))).toHaveLength(1)
  })

  test('supprimer un article « à chiffrer » ramène au projet ; refusé après un changement de statut', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    await user.click(await screen.findByRole('button', { name: "Supprimer l'article" }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByText('Article supprimé.')).toBeTruthy()
    expect(api.items).toHaveLength(0)
    expect(await screen.findByRole('heading', { name: 'Rénovation' })).toBeTruthy()
  })

  test('options : une nouvelle option reprend les localisations de la base, avec une lettre', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    const card = await screen.findByRole('region', { name: 'Options' })
    expect(within(card).getByText(/Aucune option/)).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: '+ Nouvelle option' }))
    expect(await screen.findByRole('heading', { name: 'Nouvelle option' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Implantation' })).toBeNull()
    await user.type(screen.getByLabelText('Nom'), 'Lampe Artemide')
    await user.click(screen.getByRole('button', { name: "Créer l'option" }))
    const options = await screen.findByRole('table', { name: "Options de l'article" })
    expect(within(options).getByText('CHA-LUD-01-A')).toBeTruthy()
    expect(api.items.at(-1)).toMatchObject({ optionOfId: 1, optionLetter: 'A', placements: [] })
  })

  test('options : un article existant se rattache, puis une option se retient à la place de la base', async () => {
    const user = userEvent.setup()
    api.items.push(itemRow({ itemCode: 'LOB-LUD-01', name: 'Lampe Poulsen', placements: [placementRow(2, 1)] }, 2))
    renderApp('/projects/1/items/1')
    const card = await screen.findByRole('region', { name: 'Options' })
    await user.click(within(card).getByRole('button', { name: 'Article existant à rattacher' }))
    await user.type(screen.getByLabelText('Rechercher un article à rattacher'), 'poulsen')
    expect(screen.getByText('1 sur 1')).toBeTruthy()
    await user.keyboard('{Enter}')
    await user.click(within(card).getByRole('button', { name: 'Rattacher comme option' }))
    expect(within(card).getByText('à enregistrer')).toBeTruthy()
    expect(api.items.find((i) => i.id === 2)?.optionOfId).toBeNull() // pending
    await user.click(saveButton())
    await screen.findByText('Article enregistré.')
    expect(api.items.find((i) => i.id === 2)?.optionOfId).toBe(1)
    const options = await screen.findByRole('table', { name: "Options de l'article" })
    await user.click(within(options).getByText('Lampe Poulsen'))
    expect(await screen.findByRole('region', { name: 'Option' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retenir cette option' }))
    await user.click(saveButton())
    await waitFor(() => expect(api.items.find((i) => i.id === 2)?.optionOfId).toBeNull())
    expect(api.items.find((i) => i.id === 1)).toMatchObject({ optionOfId: 2, optionLetter: 'A' })
    // The former base, now option A, is detached: an independent article again.
    await user.click(within(await screen.findByRole('table', { name: "Options de l'article" })).getByText('Beat Light Fat'))
    await user.click(await screen.findByRole('button', { name: 'Détacher' }))
    await user.click(saveButton())
    await waitFor(() => expect(api.items.find((i) => i.id === 1)?.optionOfId).toBeNull())
  })

  test("la localisation d'une implantation se change en place, sans la recréer", async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    await screen.findByRole('heading', { name: 'Beat Light Fat' })
    const table = screen.getByRole('table', { name: "Implantations de l'article" })
    const select = within(table).getAllByRole('combobox')[0] as HTMLSelectElement
    const target = Array.from(select.options).find((o) => o.value !== '' && o.value !== select.value)!
    await user.selectOptions(select, target.value)
    await user.click(saveButton())
    await waitFor(() => expect(api.items[0]?.placements.map((p) => p.locationId)).toContain(Number(target.value)))
    expect(api.items[0]?.placements).toHaveLength(1)
  })
})
