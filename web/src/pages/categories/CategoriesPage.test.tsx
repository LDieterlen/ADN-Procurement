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
      { code: 'LUD', name: 'Luminaire décoratif', sortOrder: 50 },
      { code: 'AS', name: 'Assise', sortOrder: 10 },
    ],
  })
})
afterEach(() => api.restore())

describe('types de produit', () => {
  test('liste ordonnée avec les codes', async () => {
    renderApp('/categories')
    const list = await screen.findByRole('list', { name: 'Types de produit' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.querySelector('span')?.textContent)).toEqual(['AS', 'LUD'])
  })

  test('un type exige un code de 2 à 4 lettres', async () => {
    const user = userEvent.setup()
    renderApp('/categories/new')
    await user.type(await screen.findByLabelText('Nom'), 'Tapis')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('Format invalide.')).toBeTruthy()
    await user.type(screen.getByLabelText('Code'), 'tap')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Types de produit' })
    expect(api.categories.at(-1)).toMatchObject({ code: 'TAP', name: 'Tapis' })
  })

  test('archiver puis restaurer', async () => {
    const user = userEvent.setup()
    renderApp('/categories')
    await screen.findByRole('list')
    await user.click(screen.getByRole('button', { name: 'Archiver Assise' }))
    await user.click(screen.getByLabelText('Afficher les archivés'))
    await screen.findByRole('button', { name: 'Restaurer Assise' })
    expect(api.categories[1]?.archivedAt).not.toBeNull()
  })
})
