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
})
