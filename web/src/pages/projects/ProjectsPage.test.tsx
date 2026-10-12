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

  test('création : nom + client + budget, code généré, puis arrivée sur la prescription', async () => {
    const user = userEvent.setup()
    renderApp('/projects/new')
    await user.type(await screen.findByLabelText('Nom'), 'Spa')
    await screen.findByRole('option', { name: 'Hôtel X SA' })
    await user.selectOptions(screen.getByLabelText('Client'), '1')
    await user.type(screen.getByLabelText('Budget global HT (€)'), '50 000')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    expect(await screen.findByText('2026-003')).toBeTruthy()
    expect(api.projects.at(-1)?.name).toBe('Spa')
    expect(api.budgets.at(-1)).toMatchObject({ projectId: 3, zoneId: null, amountCents: 5_000_000 })
    expect(await screen.findByText('Aucune ligne.')).toBeTruthy()
    const strip = await screen.findByRole('region', { name: 'Synthèse budget' })
    expect(strip.textContent).toContain('50 000,00 €')
  })

  test('un projet clos est en lecture seule et se rouvre par le statut', async () => {
    const user = userEvent.setup()
    renderApp('/projects/2')
    expect(await screen.findByText(/lecture seule/)).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('Changer le statut'), 'active')
    await user.click(await screen.findByRole('button', { name: 'Confirmer' }))
    await user.click(await screen.findByRole('button', { name: 'Zones' }))
    await screen.findByRole('button', { name: 'Ajouter une zone' })
    expect(api.projects[1]?.status).toBe('active')
  })
})
