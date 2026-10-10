// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

const PNG = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], 'photo.png', { type: 'image/png' })
const PDF = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2])], 'fiche.pdf', { type: 'application/pdf' })
const GIF = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], 'faux.png', { type: 'image/png' }) // GIF bytes under a PNG name: the API sniffs

beforeEach(() => {
  api = installFakeApi({
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    products: [{ name: 'Beat Light Fat', categoryId: 1 }],
  })
})
afterEach(() => api.restore())

describe('fiche produit : fichiers', () => {
  test('déposer une image puis un PDF : la première image devient principale', async () => {
    const user = userEvent.setup()
    renderApp('/products/1')
    const input = await screen.findByLabelText('Fichiers à joindre')
    await user.upload(input, [PNG, PDF])
    const list = await screen.findByRole('list', { name: 'Fichiers joints' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('Principale')).toBeTruthy()
    expect(within(items[1]!).getByText('Fiche technique')).toBeTruthy()
    expect(api.requests.filter((r) => r.method === 'POST' && r.path === '/api/v1/files')).toHaveLength(2)
    expect(api.products[0]?.files.map((f) => f.kind)).toEqual(['image', 'datasheet'])
  })

  test('un type refusé affiche l’erreur de l’API sans casser la page', async () => {
    const user = userEvent.setup()
    renderApp('/products/1')
    await user.upload(await screen.findByLabelText('Fichiers à joindre'), GIF)
    expect(await screen.findByText(/Type de fichier refusé/)).toBeTruthy()
    expect(api.products[0]?.files).toHaveLength(0)
  })

  test('changer la principale et retirer un fichier', async () => {
    const user = userEvent.setup()
    renderApp('/products/1')
    const input = await screen.findByLabelText('Fichiers à joindre')
    await user.upload(input, PNG)
    const JPG = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9])], 'autre.jpg', { type: 'image/jpeg' })
    await user.upload(input, JPG)
    const list = await screen.findByRole('list', { name: 'Fichiers joints' })
    await within(list)
      .findByText('autre.jpg', { exact: false })
      .catch(() => undefined)
    const buttons = await within(list).findAllByRole('button', { name: 'Principale' })
    await user.click(buttons[0]!)
    expect(api.products[0]?.files.map((f) => f.isPrimary)).toEqual([false, true])
    await user.click(within(list).getByRole('button', { name: 'Retirer photo.png' }))
    expect(api.products[0]?.files).toHaveLength(1)
    expect(await within(list).findAllByRole('listitem')).toHaveLength(1)
  })
})
