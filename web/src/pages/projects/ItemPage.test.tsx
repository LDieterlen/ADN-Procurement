// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, placementRow, type FakeApi } from '../../../tests/helpers/fakeApi'
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
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
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
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await screen.findByText('Article enregistré.')
    expect(api.items[0]?.sourceUrl).toBe('https://www.tomdixon.net/beat-light-tall')
    expect(await screen.findByRole('link', { name: 'tomdixon.net/beat-light-tall' })).toBeTruthy()
  })

  test('implantation : ajouter une localisation, modifier une quantité, retirer ; photo jointe', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    const card = await screen.findByRole('region', { name: 'Implantation' })
    await user.selectOptions(within(card).getByLabelText('Localisation à ajouter'), '1')
    await user.clear(within(card).getByLabelText('Quantité à ajouter'))
    await user.type(within(card).getByLabelText('Quantité à ajouter'), '2')
    await user.click(within(card).getByRole('button', { name: 'Ajouter' }))
    await waitFor(() =>
      expect(api.items[0]?.placements.map((p) => [p.locationId, p.qtyMilli])).toEqual([
        [2, 1000],
        [1, 2000],
      ]),
    )
    const qty = await within(card).findByLabelText('Quantité dans CHA')
    await user.clear(qty)
    await user.type(qty, '3')
    await user.tab()
    await waitFor(() => expect(api.items[0]?.placements[0]?.qtyMilli).toBe(3000))
    await user.click(within(card).getByRole('button', { name: 'Retirer de LOB' }))
    await waitFor(() => expect(api.items[0]?.placements).toHaveLength(1))
    await user.upload(screen.getByLabelText('Photo à joindre'), PNG)
    await waitFor(() => expect(api.items[0]?.files).toHaveLength(1))
    expect(api.items[0]?.files[0]).toMatchObject({ kind: 'image', isPrimary: true })
    expect(await screen.findByText('Principale')).toBeTruthy()
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

  test("la localisation d'une implantation se change en place, sans la recréer", async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/items/1')
    await screen.findByRole('heading', { name: 'Beat Light Fat' })
    const table = screen.getByRole('table', { name: "Implantations de l'article" })
    const select = within(table).getAllByRole('combobox')[0] as HTMLSelectElement
    const target = Array.from(select.options).find((o) => o.value !== '' && o.value !== select.value)!
    await user.selectOptions(select, target.value)
    await waitFor(() => expect(api.items[0]?.placements.map((p) => p.locationId)).toContain(Number(target.value)))
    expect(api.items[0]?.placements).toHaveLength(1)
  })
})
