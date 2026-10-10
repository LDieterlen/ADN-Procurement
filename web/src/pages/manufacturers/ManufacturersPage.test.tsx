// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({ manufacturers: [{ name: 'Flos', website: 'https://flos.com' }, { name: 'Vitra' }] })
})
afterEach(() => api.restore())

describe('fabricants', () => {
  test('liste, recherche et ouverture de la fiche', async () => {
    const user = userEvent.setup()
    renderApp('/manufacturers')
    await screen.findByRole('table', { name: 'Liste des fabricants' })
    expect(screen.getByText('https://flos.com')).toBeTruthy()
    await user.type(screen.getByLabelText('Rechercher'), 'vit')
    await screen.findByText('Vitra')
    expect(screen.queryByText('Flos')).toBeNull()
    await user.click(screen.getByText('Vitra'))
    expect(await screen.findByRole('heading', { name: 'Vitra' })).toBeTruthy()
  })

  test('création et archivage avec confirmation', async () => {
    const user = userEvent.setup()
    renderApp('/manufacturers/new')
    await user.type(await screen.findByLabelText('Nom'), 'Hay')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Fabricants' })
    expect(api.manufacturers.at(-1)?.name).toBe('Hay')
    await user.click(await screen.findByText('Hay'))
    await user.click(await screen.findByRole('button', { name: 'Archiver' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(dialog.querySelector('button')!)
    expect(await screen.findByText('Fabricant archivé : restaurer pour modifier.')).toBeTruthy()
    expect(api.manufacturers.at(-1)?.archivedAt).not.toBeNull()
  })

  test('un nom vide est refusé par l’API et affiché sous le champ', async () => {
    const user = userEvent.setup()
    renderApp('/manufacturers/new')
    await screen.findByLabelText('Nom')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('Champ obligatoire.')).toBeTruthy()
    expect(api.manufacturers).toHaveLength(2)
  })
})
