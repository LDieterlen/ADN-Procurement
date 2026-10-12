// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, placementRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA', kind: 'company' }],
    categories: [{ code: 'LUD', name: 'Luminaire décoratif' }],
    projects: [
      { name: 'Rénovation étages', clientId: 1, status: 'active', dueOn: '2027-06-30' },
      { name: 'Ancien chantier', clientId: 1, status: 'closed' },
    ],
    locations: [{ projectId: 1, code: 'CHA', name: 'Chambre typo A', zone: 'Hébergement', multiplier: 12 }],
    budgets: [{ projectId: 1, scope: 'global', amountCents: 5_000_000 }],
    items: [{ projectId: 1, name: 'Lampe', unitCostCents: 10_000, placements: [placementRow(1, 1, 2000)] }],
  })
})
afterEach(() => api.restore())

describe('projets', () => {
  test('liste : client, statut, budget et prescrit venus du serveur, filtre', async () => {
    const user = userEvent.setup()
    renderApp('/projects')
    const table = await screen.findByRole('table', { name: 'Liste des projets' })
    await within(table).findAllByText('Hôtel X SA')
    expect(within(table).getByText('En cours')).toBeTruthy()
    expect(within(table).getByText('2027-06-30')).toBeTruthy()
    expect(within(table).getByText('50 000,00 €')).toBeTruthy()
    expect(within(table).getByText('2 400,00 €')).toBeTruthy() // 100 € × 2 × 12
    await user.selectOptions(screen.getByRole('combobox'), 'closed')
    await screen.findByText('Ancien chantier')
    expect(screen.queryByText('Rénovation étages')).toBeNull()
  })

  test('création : nom + client + budget, code généré, puis arrivée sur la page du projet', async () => {
    const user = userEvent.setup()
    renderApp('/projects/new')
    await user.type(await screen.findByLabelText('Nom'), 'Spa')
    await screen.findByRole('option', { name: 'Hôtel X SA' })
    await user.selectOptions(screen.getByLabelText('Client'), '1')
    await user.type(screen.getByLabelText('Budget global HT (€)'), '50 000')
    await user.click(screen.getByRole('button', { name: 'Créer le projet' }))
    expect(await screen.findByRole('heading', { name: 'Spa' })).toBeTruthy()
    expect(api.projects.at(-1)?.name).toBe('Spa')
    expect(api.budgets.at(-1)).toMatchObject({ projectId: 3, scope: 'global', amountCents: 5_000_000 })
    const strip = await screen.findByRole('region', { name: 'Synthèse budget' })
    expect(strip.textContent).toContain('50 000,00 €')
    expect(await screen.findByText(/Aucune localisation/)).toBeTruthy()
  })

  test('un client peut être créé depuis le formulaire du projet', async () => {
    const user = userEvent.setup()
    renderApp('/projects/new')
    await user.click(await screen.findByRole('button', { name: 'Nouveau : client' }))
    const modal = await screen.findByRole('dialog', { name: 'Nouveau client' })
    await user.type(within(modal).getByLabelText('Nom'), 'Belvédère Hospitality')
    await user.click(within(modal).getByRole('button', { name: 'Créer' }))
    await screen.findByText('Client créé.')
    expect((screen.getByLabelText('Client') as HTMLSelectElement).value).toBe(String(api.clients.at(-1)?.id))
  })

  test('un projet clos est en lecture seule et se rouvre par le statut', async () => {
    const user = userEvent.setup()
    renderApp('/projects/2')
    expect(await screen.findByText(/lecture seule/)).toBeTruthy()
    expect(screen.queryByText('Ajouter une localisation')).toBeNull()
    await user.selectOptions(screen.getByLabelText('Changer le statut'), 'active')
    await user.click(await screen.findByRole('button', { name: 'Confirmer' }))
    expect(await screen.findByText('Ajouter une localisation')).toBeTruthy()
    expect(api.projects[1]?.status).toBe('active')
  })
})
