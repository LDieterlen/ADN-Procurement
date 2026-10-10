// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA', kind: 'company' }],
    projects: [
      { name: 'Rénovation étages', clientId: 1, status: 'active', dueOn: '2027-06-30' },
      { name: 'Ancien chantier', clientId: 1, status: 'closed' },
    ],
  })
})
afterEach(() => api.restore())

describe('projets', () => {
  test('liste avec client, statut et filtre', async () => {
    const user = userEvent.setup()
    renderApp('/projects')
    const table = await screen.findByRole('table', { name: 'Liste des projets' })
    await within(table).findAllByText('Hôtel X SA')
    expect(within(table).getByText('Actif')).toBeTruthy()
    expect(within(table).getByText('2027-06-30')).toBeTruthy()
    await user.selectOptions(screen.getByRole('combobox'), 'closed')
    await screen.findByText('Ancien chantier')
    expect(screen.queryByText('Rénovation étages')).toBeNull()
  })

  test('création : nom + client, code généré, puis arrivée sur les zones', async () => {
    const user = userEvent.setup()
    renderApp('/projects/new')
    await user.type(await screen.findByLabelText('Nom'), 'Spa')
    await screen.findByRole('option', { name: 'Hôtel X SA' })
    await user.selectOptions(screen.getByLabelText('Client'), '1')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('2026-003')).toBeTruthy()
    expect(api.projects.at(-1)?.name).toBe('Spa')
    expect(await screen.findByText('Aucune zone.')).toBeTruthy()
  })

  test('un projet clos est en lecture seule et se rouvre par le statut', async () => {
    const user = userEvent.setup()
    renderApp('/projects/2')
    expect(await screen.findByText(/lecture seule/)).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('Changer le statut'), 'active')
    await user.click(await screen.findByRole('button', { name: 'Confirmer' }))
    await screen.findByRole('button', { name: 'Ajouter une zone' })
    expect(api.projects[1]?.status).toBe('active')
  })
})
