// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    categories: [{ code: 'LUM', name: 'Luminaires' }],
    products: [{ name: 'Beat Light Fat', categoryId: 1 }],
  })
  api.products[0]!.files.push({
    fileId: 7,
    kind: 'image',
    isPrimary: true,
    caption: null,
    sortOrder: 0,
    sha256: 'a'.repeat(64),
    ext: 'png',
    mimeType: 'image/png',
    originalName: 'beat.png',
    sizeBytes: 100,
    licenseNote: null,
  })
})
afterEach(() => api.restore())

describe('licence des images (book PDF)', () => {
  test('saisir la note de licence sous une photo envoie un PATCH sur le fichier du produit', async () => {
    const user = userEvent.setup()
    renderApp('/products/1')
    const input = await screen.findByLabelText('Licence de beat.png')
    await user.type(input, 'Photo fournisseur, usage interne')
    await user.tab()
    await waitFor(() => expect(api.products[0]?.files[0]?.licenseNote).toBe('Photo fournisseur, usage interne'))
    const patches = api.requests.filter((r) => r.method === 'PATCH' && r.path === '/api/v1/products/1/files/7')
    expect(patches).toHaveLength(1)
    expect(patches[0]?.body).toEqual({ licenseNote: 'Photo fournisseur, usage interne' })
  })
})
