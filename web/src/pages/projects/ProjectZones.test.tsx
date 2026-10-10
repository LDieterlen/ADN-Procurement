// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    zones: [
      { projectId: 1, code: 'LOB', name: 'Lobby', sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre type A', kind: 'chambre', multiplier: 12, sortOrder: 20 },
    ],
  })
})
afterEach(() => api.restore())

const names = () =>
  within(screen.getByRole('table', { name: 'Zones du projet' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => (row as HTMLTableRowElement).cells[1]?.textContent)

describe('zones du projet', () => {
  test('liste ordonnée avec multiplicateur, ajout avec code dupliqué refusé', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByRole('table', { name: 'Zones du projet' })
    expect(names()).toEqual(['Lobby', 'Chambre type A'])
    expect(screen.getByText('×12')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Ajouter une zone' }))
    await user.type(screen.getByLabelText('Code'), 'cha')
    await user.type(screen.getByLabelText('Nom'), 'Doublon')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(await screen.findByText('Une zone de ce projet porte déjà ce code.')).toBeTruthy()
    await user.clear(screen.getByLabelText('Code'))
    await user.type(screen.getByLabelText('Code'), 'chb')
    await user.clear(screen.getByLabelText('Multiplicateur'))
    await user.type(screen.getByLabelText('Multiplicateur'), '8')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    await screen.findByText('×8')
    expect(api.zones.at(-1)).toMatchObject({ code: 'CHB', multiplier: 8, sortOrder: 30 })
  })

  test('réordonner, archiver, supprimer', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByRole('table', { name: 'Zones du projet' })
    await user.click(screen.getByRole('button', { name: 'Descendre Lobby' }))
    await screen.findByText('Chambre type A')
    expect(api.requests.some((r) => r.path === '/api/v1/projects/1/zones/reorder')).toBe(true)
    expect(api.zones.find((z) => z.code === 'LOB')?.sortOrder).toBe(20)
    await user.click(screen.getByRole('button', { name: 'Supprimer Lobby' }))
    await screen.findByText('Chambre type A')
    expect(api.zones.some((z) => z.code === 'LOB')).toBe(false)
  })
})
