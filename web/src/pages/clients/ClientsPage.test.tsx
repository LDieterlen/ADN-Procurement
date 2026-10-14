// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [
      { name: 'Zèbre SA', kind: 'company', city: 'Lille' },
      { name: 'Hôtel Élysée', city: 'Paris' },
      { name: 'Ancien', archivedAt: '2026-01-01T00:00:00Z' },
    ],
  })
})
afterEach(() => api.restore())

describe('liste des clients', () => {
  test('affiche les actifs triés, cache les archivés sauf demande', async () => {
    const user = userEvent.setup()
    renderApp('/clients')
    await screen.findByRole('table', { name: 'Liste des clients' })
    // The table remounts on every refetch (new query key): query it afresh each time.
    const names = () =>
      within(screen.getByRole('table', { name: 'Liste des clients' }))
        .getAllByRole('row')
        .slice(1)
        .map((row) => (row as HTMLTableRowElement).cells[0]?.textContent)
    expect(names()).toEqual(['Hôtel Élysée', 'Zèbre SA'])
    await user.click(screen.getByLabelText('Afficher les archivés'))
    await screen.findByText('Archivé')
    expect(names()).toEqual(['Ancien', 'Hôtel Élysée', 'Zèbre SA'])
  })

  test('la recherche ignore accents et casse', async () => {
    const user = userEvent.setup()
    renderApp('/clients')
    await screen.findByRole('table')
    await user.type(screen.getByLabelText('Rechercher'), 'elysee')
    await screen.findByText('Hôtel Élysée')
    expect(screen.queryByText('Zèbre SA')).toBeNull()
  })

  test('une ligne ouvre la fiche', async () => {
    const user = userEvent.setup()
    renderApp('/clients')
    await user.click(await screen.findByText('Zèbre SA'))
    expect(await screen.findByRole('heading', { name: 'Zèbre SA' })).toBeTruthy()
  })

  test('liste vide : état vide avec invitation', async () => {
    api.clients.length = 0
    renderApp('/clients')
    expect(await screen.findByText(/Aucun client pour l’instant./)).toBeTruthy()
  })

  test('serveur coupé : message et lien vers la santé', async () => {
    api.down = true
    renderApp('/clients')
    expect(await screen.findByText('Impossible de charger les clients')).toBeTruthy()
    expect(screen.getAllByText('Voir la page Santé').length).toBeGreaterThan(0)
  })
})
