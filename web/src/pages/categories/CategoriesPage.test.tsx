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
      { code: 'AS', name: 'Assises', sortOrder: 10 },
      { parentId: 1, name: 'Applique', sortOrder: 10 },
      { code: 'DIV', name: 'Divers', sortOrder: 130 },
    ],
  })
})
afterEach(() => api.restore())

describe('catégories', () => {
  test('arbre indenté sur deux niveaux, dans l’ordre', async () => {
    renderApp('/categories')
    const list = await screen.findByRole('list', { name: 'Arbre des catégories' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.querySelector('span')?.textContent)).toEqual(['AS', 'LUM', '·', 'DIV'])
    expect(items.map((li) => within(li).getAllByRole('button')[0]?.textContent)).toEqual(['Assises', 'Luminaires', 'Applique', 'Divers'])
    expect(items[2]?.className).toContain('pl-10')
  })

  test('ajouter une sous-catégorie depuis le parent', async () => {
    const user = userEvent.setup()
    renderApp('/categories')
    await screen.findByRole('list')
    await user.click(screen.getAllByText('+ sous-catégorie')[1]!) // under Luminaires
    expect(await screen.findByText(/Sous-catégorie de/)).toBeTruthy()
    expect(screen.queryByLabelText('Code')).toBeNull()
    await user.type(screen.getByLabelText('Nom'), 'Suspension')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Catégories' })
    const created = api.categories.at(-1)
    expect(created?.parentId).toBe(1)
    expect(created?.code).toBeNull()
    expect(created?.name).toBe('Suspension')
  })

  test('une catégorie de niveau 1 exige un code', async () => {
    const user = userEvent.setup()
    renderApp('/categories/new')
    await user.type(await screen.findByLabelText('Nom'), 'Textiles')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText(/porte un code/)).toBeTruthy()
    await user.type(screen.getByLabelText('Code'), 'TXT')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Catégories' })
    expect(api.categories.at(-1)?.code).toBe('TXT')
  })

  test('DIV refuse l’archivage, un parent avec enfant actif aussi', async () => {
    const user = userEvent.setup()
    renderApp('/categories')
    await screen.findByRole('list')
    await user.click(screen.getByRole('button', { name: 'Archiver Divers' }))
    expect(await screen.findByText(/ne s’archive pas/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Archiver Luminaires' }))
    expect(await screen.findByText(/sous-catégories actives/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Archiver Applique' }))
    await user.click(screen.getByLabelText('Afficher les archivées'))
    await screen.findByRole('button', { name: 'Restaurer Applique' })
    expect(api.categories[2]?.archivedAt).not.toBeNull()
  })
})
