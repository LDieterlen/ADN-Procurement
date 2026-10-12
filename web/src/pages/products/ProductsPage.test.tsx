// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    categories: [
      { code: 'LUM', name: 'Luminaires', sortOrder: 50 },
      { code: 'TAB', name: 'Tables', sortOrder: 20 },
    ],
    products: [
      { name: 'Beat Light Fat', categoryId: 1, reference: 'BLS03', listPriceCents: 125000, currency: 'GBP' },
      { name: 'Table Tulip', categoryId: 2 },
    ],
  })
})
afterEach(() => api.restore())

describe('produits', () => {
  test('liste avec type, prix catalogue et filtre', async () => {
    const user = userEvent.setup()
    renderApp('/products')
    const table = await screen.findByRole('table', { name: 'Liste des produits' })
    expect(within(table).getByText('1 250,00 GBP')).toBeTruthy()
    await within(table).findByText('Luminaires')
    await user.selectOptions(screen.getByLabelText('Type'), '2')
    await screen.findByText('Table Tulip')
    expect(screen.queryByText('Beat Light Fat')).toBeNull()
    await user.type(screen.getByLabelText('Rechercher'), 'bls')
    expect(await screen.findByText('Aucun produit ne correspond.')).toBeTruthy()
  })

  test('création : nom + type + prix HT', async () => {
    const user = userEvent.setup()
    renderApp('/products/new')
    await user.type(await screen.findByLabelText('Nom'), 'Arco')
    await screen.findByRole('option', { name: 'LUM — Luminaires' })
    await user.selectOptions(screen.getByLabelText('Type'), '1')
    await user.type(screen.getByLabelText('Prix HT'), '2 400')
    await user.type(screen.getByLabelText('Dimensions'), 'H 240 cm')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByRole('heading', { name: 'Arco' })).toBeTruthy()
    const created = api.products.at(-1)
    expect(created?.listPriceCents).toBe(240000)
    expect(created?.dimensions).toBe('H 240 cm')
    expect(created?.categoryId).toBe(1)
  })

  test('création depuis une adresse : fiche pré-remplie, photo jointe au produit créé', async () => {
    const user = userEvent.setup()
    renderApp('/products/new')
    const box = await screen.findByRole('region', { name: 'Coller une adresse' })
    await user.type(within(box).getByLabelText('Adresse de la fiche produit'), 'https://www.tikamoon.com/art-chaise-7718.htm')
    await user.click(within(box).getByRole('button', { name: 'Lire la page' }))
    await user.click(await within(box).findByRole('button', { name: 'Utiliser' }))
    await screen.findByText(/Fiche pré-remplie/)
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Santino - Chaise en chêne massif et cuir')
    expect((screen.getByLabelText('Prix HT') as HTMLInputElement).value).toBe('399,00')
    expect(screen.getByRole('img', { name: 'Photo' }).getAttribute('src')).toBe('/api/v1/files/1/content') // visible before « Créer »
    await screen.findByRole('option', { name: 'LUM — Luminaires' })
    await user.selectOptions(screen.getByLabelText('Type'), '1')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByRole('heading', { name: 'Santino - Chaise en chêne massif et cuir' })).toBeTruthy()
    expect(api.products.at(-1)).toMatchObject({ reference: '7718', listPriceCents: 39900, sourceUrl: 'https://www.tikamoon.com/art-chaise-7718.htm' })
    expect(api.products.at(-1)?.files[0]).toMatchObject({ fileId: 1, isPrimary: true })
    expect(api.manufacturers.at(-1)?.name).toBe('Tikamoon')
  })
})
