// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    professionals: [
      { name: 'Jouffre', website: 'https://flos.com', specialty: 'Confection' },
      { name: 'Dedar', kind: 'publisher' },
    ],
  })
})
afterEach(() => api.restore())

describe('professionnels', () => {
  test('liste, recherche et ouverture de la fiche', async () => {
    const user = userEvent.setup()
    renderApp('/professionals')
    await screen.findByRole('table', { name: 'Liste des professionnels' })
    expect(screen.getByText('https://flos.com')).toBeTruthy()
    expect(screen.getAllByText('Confection').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Éditeur').length).toBeGreaterThan(0)
    await user.type(screen.getByLabelText('Rechercher'), 'ded')
    await screen.findByText('Dedar')
    expect(screen.queryByText('Jouffre')).toBeNull()
    await user.click(screen.getByText('Dedar'))
    expect(await screen.findByRole('heading', { name: 'Dedar' })).toBeTruthy()
    expect((screen.getByLabelText('Prestation') as HTMLSelectElement).value).toBe('publisher')
  })

  test('création et archivage avec confirmation', async () => {
    const user = userEvent.setup()
    renderApp('/professionals/new')
    await user.type(await screen.findByLabelText('Nom'), 'Hay')
    await user.selectOptions(screen.getByLabelText('Prestation'), 'artisan')
    await user.type(screen.getByLabelText('Savoir-faire'), 'Céramiste')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Professionnels' })
    expect(api.professionals.at(-1)?.name).toBe('Hay')
    expect(api.professionals.at(-1)?.kind).toBe('artisan')
    expect(api.professionals.at(-1)?.specialty).toBe('Céramiste')
    await user.click(await screen.findByText('Hay'))
    await user.click(await screen.findByRole('button', { name: 'Archiver' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(dialog.querySelector('button')!)
    expect(await screen.findByText('Professionnel archivé : restaurer pour modifier.')).toBeTruthy()
    expect(api.professionals.at(-1)?.archivedAt).not.toBeNull()
  })

  test('un nom vide est refusé par l’API et affiché sous le champ', async () => {
    const user = userEvent.setup()
    renderApp('/professionals/new')
    await screen.findByLabelText('Nom')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('Champ obligatoire.')).toBeTruthy()
    expect(api.professionals).toHaveLength(2)
  })

  test('filtre par prestation et par savoir-faire', async () => {
    const user = userEvent.setup()
    renderApp('/professionals')
    await screen.findByText('Jouffre')
    await user.selectOptions(screen.getByLabelText('Prestation'), 'publisher')
    await screen.findByText('Dedar')
    expect(screen.queryByText('Jouffre')).toBeNull()
    await user.selectOptions(screen.getByLabelText('Prestation'), '')
    await screen.findByRole('option', { name: 'Confection' })
    await user.selectOptions(screen.getByLabelText('Savoir-faire'), 'Confection')
    await screen.findByText('Jouffre')
    expect(screen.queryByText('Dedar')).toBeNull()
  })
})
