// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
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
  test('articles : une option suit sa base, avec la lettre et un montant entre parenthèses, hors compteur', async () => {
    api.items.push(
      itemRow({ itemCode: 'CHA-LUD-01', name: 'Lampe Flos', unitCostCents: 10_000, placements: [placementRow(1, 2)] }, 1),
      itemRow({ itemCode: 'CHA-LUD-01-A', name: 'Lampe Artemide', unitCostCents: 20_000, optionOfId: 1, optionLetter: 'A' }, 2),
    )
    renderApp('/projects/1')
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    const rows = within(table)
      .getAllByRole('row')
      .map((r) => r.getAttribute('aria-label'))
    expect(rows.indexOf('CHA-LUD-01-A dans CHA')).toBe(rows.indexOf('CHA-LUD-01 dans CHA') + 1)
    const option = within(table).getByRole('row', { name: 'CHA-LUD-01-A dans CHA' })
    expect(within(option).getByText('Option A')).toBeTruthy()
    expect(option.textContent).toMatch(/\(2\s?400,00\s€\)/) // 200 € × 12, indicative
    expect(screen.getByText(/^1 article/)).toBeTruthy()
  })

  test('articles : filtres par localisation, zone, niveau et code article, combinés', async () => {
    const user = userEvent.setup()
    api.items.push(
      itemRow({ itemCode: 'LOB-AS-01', name: 'Fauteuil lobby', categoryId: 2, placements: [placementRow(1, 1)] }, 1),
      itemRow({ itemCode: 'CHA-LUD-01', name: 'Lampe chambre', placements: [placementRow(2, 2)] }, 2),
    )
    renderApp('/projects/1')
    const table = await screen.findByRole('table', { name: 'Articles du projet' })
    await within(table).findByText('Fauteuil lobby')
    await user.click(screen.getByRole('button', { name: 'Zone' }))
    await user.click(within(screen.getByRole('group', { name: 'Zone : choix' })).getByLabelText('Hébergement'))
    expect(within(table).queryByText('Fauteuil lobby')).toBeNull()
    expect(within(table).getByText('Lampe chambre')).toBeTruthy()
    expect(screen.getByText(/1 sur 2 articles/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }))
    await user.click(screen.getByRole('button', { name: 'Niveau' }))
    await user.click(within(screen.getByRole('group', { name: 'Niveau : choix' })).getByLabelText('R0'))
    expect(within(table).getByText('Fauteuil lobby')).toBeTruthy()
    expect(within(table).queryByText('Lampe chambre')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }))
    await user.click(screen.getByRole('button', { name: 'Localisation' }))
    await user.click(within(screen.getByRole('group', { name: 'Localisation : choix' })).getByLabelText('LOB — Lobby'))
    expect(within(table).getByText('Fauteuil lobby')).toBeTruthy()
    expect(within(table).queryByText('Lampe chambre')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }))
    await user.type(screen.getByLabelText('Code article'), 'lud')
    expect(within(table).queryByText('Fauteuil lobby')).toBeNull()
    expect(within(table).getByText('Lampe chambre')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Niveau' }))
    await user.click(within(screen.getByRole('group', { name: 'Niveau : choix' })).getByLabelText('R0'))
    expect(screen.getByText('Aucun article ne correspond aux filtres.')).toBeTruthy()
  })

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
    // Typing the note stays in the dialog: the row behind does not open the article (audit 2026-10-15).
    await user.type(within(modal).getByLabelText(/Note/), 'Hors budget')
    expect(screen.getByRole('dialog', { name: 'Annuler LOB-AS-01' })).toBeTruthy()
    await user.click(within(modal).getByRole('button', { name: "Annuler l'article" }))
    await waitFor(() => expect(api.items[0]?.status).toBe('cancelled'))
    expect(screen.getByRole('heading', { name: 'Rénovation' })).toBeTruthy()
    expect(api.events.filter((e) => e.kind === 'status').map((e) => e.toStatus)).toEqual(['approved', 'cancelled'])
  })

  test('« Listing PDF » : le profil et le papier choisis, le PDF téléchargé', async () => {
    const user = userEvent.setup()
    const clicked: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.getAttribute('href') ?? '')
    })
    renderApp('/projects/1')
    await screen.findByRole('heading', { name: 'Rénovation' })
    await user.click(screen.getByRole('button', { name: 'Listing PDF' }))
    const dialog = await screen.findByRole('dialog', { name: 'Listing PDF' })
    await user.selectOptions(await within(dialog).findByLabelText('Profil du listing'), 'Client')
    const chips = within(dialog).getByRole('list', { name: 'Colonnes imprimées' })
    expect(
      within(chips)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['photo', 'code', 'type', 'Désignation', 'dimensions', 'finish', 'Qté', 'status', 'indice'])
    await user.click(within(dialog).getByRole('radio', { name: 'Blanc' }))
    await user.click(within(dialog).getByLabelText('Inclure les options'))
    await user.click(within(dialog).getByRole('button', { name: 'Générer' }))
    expect(clicked).toEqual(['/api/v1/projects/1/exports/list.pdf?print=true&profile=2&options=true'])
    click.mockRestore()
  })

  test('« Fiches PDF » : document de travail, puis diffusion sur les deux papiers', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1')
    await screen.findByRole('heading', { name: 'Rénovation' })
    expect(screen.getByText('Non diffusé')).toBeTruthy()
    // A working document: no diffusion, nothing changes.
    await user.click(screen.getByRole('button', { name: 'Fiches PDF' }))
    let dialog = await screen.findByRole('dialog', { name: 'Fiches PDF' })
    await user.click(within(dialog).getByRole('button', { name: 'Générer' }))
    await screen.findByText('Fiches émises (document de travail).')
    expect(api.projects[0]?.diffusionCount).toBe(0)
    // The first official diffusion, on both papers, options included.
    await user.click(screen.getByRole('button', { name: 'Fiches PDF' }))
    dialog = await screen.findByRole('dialog', { name: 'Fiches PDF' })
    await user.click(within(dialog).getByLabelText(/Diffusion officielle/))
    await user.click(within(dialog).getByRole('radio', { name: 'Les deux' }))
    await user.click(within(dialog).getByLabelText('Inclure les options'))
    await user.click(within(dialog).getByText('Options avancées'))
    await user.click(within(dialog).getByLabelText('Masquer Racoon Studio'))
    await user.click(within(dialog).getByRole('button', { name: 'Diffuser (diffusion 1)' }))
    await screen.findByText('Diffusion 1 faite.')
    expect(api.requests.filter((r) => r.path.endsWith('/exports/sheets')).at(-1)?.body).toEqual({
      diffuse: true,
      papers: ['color', 'white'],
      includeOptions: true,
      hideAgencyName: false,
      hideStudio: true,
      hideAgencyLogo: false,
    })
    expect(await screen.findByText('Diffusion 1')).toBeTruthy()
    expect(api.exports.slice(0, 2).map((e) => e.originalName)).toEqual([
      '2026-001-fiches-diffusion1-impression-2026-10-10.pdf',
      '2026-001-fiches-diffusion1-2026-10-10.pdf',
    ])
  })

  test('Historique : documents de travail et diffusions ; la dernière diffusion s’annule', async () => {
    const user = userEvent.setup()
    await fetch('http://localhost/api/v1/projects/1/exports/sheets', {
      method: 'POST',
      body: JSON.stringify({ diffuse: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    await fetch('http://localhost/api/v1/projects/1/exports/sheets', {
      method: 'POST',
      body: JSON.stringify({ diffuse: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    renderApp('/projects/1?vue=historique')
    const docs = await screen.findByRole('list', { name: 'Documents émis' })
    expect(within(docs).getByText('Diffusion 1')).toBeTruthy()
    expect(within(docs).getByText('Document de travail')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Annuler la diffusion 1' }))
    const confirm = await screen.findByRole('dialog', { name: 'Annuler la diffusion 1 ?' })
    await user.click(within(confirm).getByRole('button', { name: 'Annuler la diffusion 1' }))
    expect(await within(docs).findByText('Diffusion 1 annulée')).toBeTruthy()
    expect(api.projects[0]?.diffusionCount).toBe(0)
    expect(screen.getByText('Non diffusé')).toBeTruthy()
  })
})
