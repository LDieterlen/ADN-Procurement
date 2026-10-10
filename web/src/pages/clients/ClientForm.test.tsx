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
      { name: 'Famille Martin', city: 'Paris' },
      { name: 'Ancien Client', archivedAt: '2026-01-01T00:00:00Z' },
    ],
  })
})
afterEach(() => api.restore())

describe('formulaire client', () => {
  test('un 422 de l’API s’affiche sous le champ et dans le bandeau, la saisie est conservée', async () => {
    const user = userEvent.setup()
    renderApp('/clients/new')
    await user.type(await screen.findByLabelText('Ville'), 'Lyon')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('Champ obligatoire.')).toBeTruthy()
    expect(screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('Données invalides.'))).toBe(true)
    expect((screen.getByLabelText('Ville') as HTMLInputElement).value).toBe('Lyon')
    expect(api.clients).toHaveLength(2)
  })

  test('une création valide envoie les champs vides à null et revient à la liste', async () => {
    const user = userEvent.setup()
    renderApp('/clients/new')
    await user.type(await screen.findByLabelText('Nom'), '  Hôtel X ')
    await user.selectOptions(screen.getByLabelText('Type'), 'company')
    await user.type(screen.getByLabelText('SIREN'), '123456789')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Clients' })
    const created = api.clients.at(-1)
    expect(created?.name).toBe('Hôtel X')
    expect(created?.kind).toBe('company')
    expect(created?.siren).toBe('123456789')
    expect(created?.city).toBeNull()
    expect(await screen.findByText('Hôtel X')).toBeTruthy()
  })

  test('un doublon actif propose d’ouvrir l’existant ou de créer quand même', async () => {
    const user = userEvent.setup()
    renderApp('/clients/new')
    await user.type(await screen.findByLabelText('Nom'), 'famille martin')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('porte déjà ce nom')
    await user.click(screen.getByRole('button', { name: 'Créer quand même' }))
    await screen.findByRole('heading', { name: 'Clients' })
    expect(api.clients.filter((c) => c.name.toLowerCase() === 'famille martin')).toHaveLength(2)
    expect(api.requests.some((r) => r.path === '/api/v1/clients?force=true')).toBe(true)
  })

  test('un doublon archivé propose de restaurer', async () => {
    const user = userEvent.setup()
    renderApp('/clients/new')
    await user.type(await screen.findByLabelText('Nom'), 'ancien client')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Restaurer' }))
    await screen.findByRole('heading', { name: 'Ancien Client' })
    expect(api.clients[1]?.archivedAt).toBeNull()
  })

  test('la modification envoie un PATCH et un archivage demande confirmation', async () => {
    const user = userEvent.setup()
    renderApp('/clients/1')
    const city = await screen.findByLabelText('Ville')
    expect((city as HTMLInputElement).value).toBe('Paris')
    await user.clear(city)
    await user.type(city, 'Lyon')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await screen.findByRole('heading', { name: 'Clients' })
    expect(api.clients[0]?.city).toBe('Lyon')
    expect(api.requests.some((r) => r.method === 'PATCH' && r.path === '/api/v1/clients/1')).toBe(true)
  })

  test('archiver puis restaurer depuis la fiche', async () => {
    const user = userEvent.setup()
    renderApp('/clients/1')
    await user.click(await screen.findByRole('button', { name: 'Archiver' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Archiver' }))
    expect(await screen.findByText('Client archivé : restaurer pour modifier.')).toBeTruthy()
    expect(api.clients[0]?.archivedAt).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Restaurer' }))
    expect(await screen.findByLabelText('Nom')).toBeTruthy()
    expect(api.clients[0]?.archivedAt).toBeNull()
  })

  test('serveur coupé : message, pas d’écran blanc', async () => {
    api.down = true
    renderApp('/clients/1')
    expect(await screen.findByText("L'API ne répond pas.")).toBeTruthy()
    expect(screen.getByText('Retour à la liste')).toBeTruthy()
  })
})
