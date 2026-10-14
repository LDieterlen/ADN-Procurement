// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
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
    const table = await screen.findByRole('table', { name: 'Types de produit' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((tr) => tr.querySelector('td')?.textContent)).toEqual(['AS', 'LUD'])
  })

  test('un type exige un code de 2 à 4 lettres', async () => {
    const user = userEvent.setup()
    renderApp('/categories/new')
    await user.type(await screen.findByLabelText('Nom'), 'Tapis')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('Format invalide.')).toBeTruthy()
    await user.type(screen.getByLabelText('Code'), 'tap')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Listes' })
    expect(api.categories.at(-1)).toMatchObject({ code: 'TAP', name: 'Tapis' })
  })

  test('archiver puis restaurer', async () => {
    const user = userEvent.setup()
    renderApp('/categories')
    await screen.findByRole('table', { name: 'Types de produit' })
    await user.click(screen.getByRole('button', { name: 'Archiver Assise' }))
    await user.click(screen.getByLabelText('Afficher les archivés'))
    await screen.findByRole('button', { name: 'Restaurer Assise' })
    expect(api.categories[1]?.archivedAt).not.toBeNull()
  })

  test('Listes : familles, usages et prestations sont éditables (ajout, renommage, archivage)', async () => {
    const user = userEvent.setup()
    renderApp('/categories')
    expect(await screen.findByRole('heading', { name: 'Listes' })).toBeTruthy()
    expect(screen.queryByRole('table', { name: 'Familles' })).toBeNull() // one list at a time
    await user.click(within(screen.getByRole('radiogroup', { name: 'Liste affichée' })).getByRole('radio', { name: 'Familles' }))
    const families = await screen.findByRole('table', { name: 'Familles' })
    await within(families).findByDisplayValue('Agencement')
    await user.type(screen.getByLabelText('Nouvelle valeur : Familles'), 'Luminaire d’art')
    await user.click(within(screen.getByRole('region', { name: 'Familles' })).getByRole('button', { name: 'Ajouter' }))
    await waitFor(() => expect(api.choices.some((c) => c.list === 'family' && c.name === 'Luminaire d’art')).toBe(true))
    await user.click(screen.getByRole('radio', { name: 'Usages' }))
    const usage = await screen.findByLabelText('Nom de Extérieur')
    await user.clear(usage)
    await user.type(usage, 'Terrasse')
    await user.tab()
    await waitFor(() => expect(api.choices.find((c) => c.code === 'outdoor')?.name).toBe('Terrasse'))
    await user.click(screen.getByRole('radio', { name: 'Prestations' }))
    await user.click(await screen.findByRole('button', { name: 'Archiver Artisan' }))
    await waitFor(() => expect(api.choices.find((c) => c.code === 'artisan')?.archivedAt).not.toBeNull())
  })
})
