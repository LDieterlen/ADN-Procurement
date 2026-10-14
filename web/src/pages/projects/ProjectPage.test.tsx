// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, itemRow, placementRow, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Hôtel X SA' }],
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP' }],
    categories: [
      { code: 'LUD', name: 'Luminaire décoratif', sortOrder: 10 },
      { code: 'AS', name: 'Assise', sortOrder: 5 },
    ],
    projects: [{ name: 'Rénovation', clientId: 1, status: 'active' }],
    locations: [
      { projectId: 1, code: 'LOB', name: 'Lobby', zone: 'Zones communes', level: 'R0', multiplier: 1, sortOrder: 10 },
      { projectId: 1, code: 'CHA', name: 'Chambre typo A', zone: 'Hébergement', level: 'R+1', multiplier: 12, sortOrder: 20 },
    ],
    budgets: [{ projectId: 1, scope: 'global', amountCents: 5_000_000 }],
  })
})
afterEach(() => api.restore())

describe('page projet', () => {
  test('localisations : liste avec zone, niveau et nombre ; ajout en bas de tableau ; code dupliqué refusé', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    const table = await screen.findByRole('table', { name: 'Localisations du projet' })
    expect(within(table).getByText('Hébergement')).toBeTruthy()
    expect(within(table).getByText('R+1')).toBeTruthy()
    expect(within(table).getByText('× 12')).toBeTruthy()
    expect(screen.queryByLabelText('Code')).toBeNull() // the form is folded until asked
    await user.click(screen.getByRole('button', { name: '+ Ajouter une localisation' }))
    await user.type(screen.getByLabelText('Code'), 'cha')
    await user.type(screen.getByLabelText('Nom'), 'Doublon')
    await user.click(screen.getByRole('button', { name: 'Ajouter la localisation' }))
    expect(await screen.findByText('Une localisation de ce projet porte déjà ce code.')).toBeTruthy()
    await user.clear(screen.getByLabelText('Code'))
    await user.type(screen.getByLabelText('Code'), 'sui')
    await user.clear(screen.getByLabelText('Nom'))
    await user.type(screen.getByLabelText('Nom'), 'Junior suite')
    await user.type(screen.getByLabelText('Zone'), 'Hébergement')
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), '4')
    await user.click(screen.getByRole('button', { name: 'Ajouter la localisation' }))
    await within(table).findByText('Junior suite')
    expect(screen.queryByLabelText('Code')).toBeNull() // folded again after the add
    expect(api.locations.at(-1)).toMatchObject({ code: 'SUI', zone: 'Hébergement', multiplier: 4, sortOrder: 30 })
    await user.click(screen.getByRole('button', { name: 'Descendre Lobby' }))
    await waitFor(() => expect(api.locations.find((l) => l.code === 'LOB')?.sortOrder).toBe(20))
    await user.click(screen.getByRole('button', { name: 'Supprimer Junior suite' }))
    await waitFor(() => expect(api.locations.some((l) => l.code === 'SUI')).toBe(false))
  })

  test("le statut se change dans la liste et l'article annulé sort des totaux", async () => {
    const user = userEvent.setup()
    api.items.push(itemRow({ projectId: 1, itemCode: 'LOB-AS-01', categoryId: 2, name: 'Tabouret', placements: [placementRow(1, 1, 1000)] }, 1))
    renderApp('/projects/1')
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    await within(table).findByRole('row', { name: 'LOB-AS-01 dans LOB' })
    await user.selectOptions(within(table).getByLabelText('Statut de LOB-AS-01'), 'approved')
    await waitFor(() => expect(api.items[0]?.status).toBe('approved'))
    await user.selectOptions(within(table).getByLabelText('Statut de LOB-AS-01'), 'cancelled')
    const modal = await screen.findByRole('dialog', { name: 'Annuler LOB-AS-01' })
    await user.click(within(modal).getByRole('button', { name: "Annuler l'article" }))
    await waitFor(() => expect(api.items[0]?.status).toBe('cancelled'))
    expect(api.events.filter((e) => e.kind === 'status').map((e) => e.toStatus)).toEqual(['approved', 'cancelled'])
  })

  test('les PDF sont émis et listés dans « Documents émis »', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(screen.getByRole('link', { name: 'Fiches PDF' }).getAttribute('href')).toBe('/api/v1/projects/1/exports/sheets.pdf')
    expect(screen.getByRole('link', { name: 'Listing PDF' }).getAttribute('href')).toBe('/api/v1/projects/1/exports/list.pdf')
    expect((await screen.findByRole('link', { name: 'Budget détaillé →' })).getAttribute('href')).toBe('/projects/1/budget')
    expect(screen.getByRole('link', { name: '+ Ajouter un article' }).getAttribute('href')).toBe('/projects/1/items/new')
    await user.click(screen.getByRole('link', { name: 'Modifier' }))
    expect(await screen.findByRole('heading', { name: 'Modifier Rénovation' })).toBeTruthy()
  })

  test('« Nouvel indice » : confirmation, pastille Indice A, et la dernière fiche émise depuis devient la référence', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(screen.getByText('Sans indice')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Nouvel indice' }))
    const dialog = await screen.findByRole('dialog', { name: 'Première diffusion : indice A ?' })
    await user.click(within(dialog).getByRole('button', { name: 'Déclarer l’indice A' }))
    await screen.findByText('Indice A')
    expect(api.projects[0]?.indice).toBe('A')
    expect(api.items.every((i) => i.indice === 'A')).toBe(true)
    await fetch('http://localhost/api/v1/projects/1/exports/sheets.pdf') // a first PDF, then a second: the latest is the reference
    await fetch('http://localhost/api/v1/projects/1/exports/sheets.pdf')
    await fetch('http://localhost/api/v1/projects/1/exports/list.pdf')
    await user.click(screen.getByRole('link', { name: 'Budget détaillé →' }))
    await user.click(await screen.findByRole('link', { name: 'Rénovation' }))
    const docs = await screen.findByRole('list', { name: 'Documents émis' })
    const rows = within(docs).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]!).getByText('Fiches de référence, indice A')).toBeTruthy()
    expect(within(rows[2]!).queryByText(/Fiches de référence/)).toBeNull()
    await user.click(screen.getByRole('button', { name: "Retirer l'indice A" }))
    const undo = await screen.findByRole('dialog', { name: "Retirer l'indice A ?" })
    await user.click(within(undo).getByRole('button', { name: "Retirer l'indice A" }))
    await screen.findByText('Sans indice')
    expect(api.projects[0]?.indice).toBeNull()
    expect(api.items.every((i) => i.indice === null)).toBe(true)
  })
})
