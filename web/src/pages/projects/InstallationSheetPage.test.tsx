// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { article, installInstallationApi, SHEET, type InstallationFake } from '../../../tests/helpers/installationApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi
let fake: InstallationFake

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Famille Martin' }],
    projects: [{ name: 'Villa', clientId: 1, status: 'active' }],
    locations: [{ projectId: 1, code: 'SAL', name: 'Salon', zone: null, level: 'R0', multiplier: 1, sortOrder: 10 }],
  })
  fake = installInstallationApi()
})
afterEach(() => api.restore())

describe('planche d’installation', () => {
  test('↑ ↓ réordonnent, « Ajouter » prend un article de la pièce, Enregistrer envoie la liste dans l’ordre', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/installation/7')
    const list = await screen.findByRole('table', { name: 'Articles de la planche' })
    expect(within(list).getByText(/Aussi sur : Cheminée/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Monter SAL-AS-03' }))
    // The room's articles on no sheet come first.
    const pool = screen.getByRole('table', { name: 'Articles de la pièce à ajouter' })
    expect(within(pool).getAllByRole('row')[0]?.textContent).toContain('SAL-AS-04')
    await user.click(screen.getByRole('button', { name: 'Ajouter SAL-AS-04' }))
    const codes = within(list)
      .getAllByRole('row')
      .map((row) => /SAL-AS-\d+/.exec(row.textContent ?? '')?.[0])
    expect(codes).toEqual(['SAL-AS-01', 'SAL-AS-03', 'SAL-AS-02', 'SAL-AS-04'])
    expect(screen.getByLabelText('Aperçu de la page 1').textContent).toContain('SAL-AS-04')
    expect(within(list).getAllByText('à enregistrer')).toHaveLength(1) // the added article
    const bar = screen.getByRole('region', { name: 'Modifications non enregistrées' })
    await user.click(within(bar).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(fake.sent).toHaveLength(1))
    expect(fake.sent[0]).toEqual({
      method: 'PUT',
      path: '/api/v1/installation-sheets/7/items',
      body: { cells: [1, 3, 2, 4].map((placementId) => ({ placementId, markers: [] })) },
    })
  })

  test('le nom se modifie dans un champ, « Annuler les modifications » revient à la planche, « Retour au projet » ramène à l’onglet', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/installation/7')
    expect((await screen.findByRole('link', { name: 'Installation' })).getAttribute('href')).toBe('/projects/1?vue=installation')
    const name = screen.getByLabelText('Nom')
    await user.clear(name)
    await user.type(name, 'Coin lecture')
    await user.click(screen.getByRole('button', { name: 'Retirer SAL-AS-01' }))
    const bar = screen.getByRole('region', { name: 'Modifications non enregistrées' })
    await user.click(within(bar).getByRole('button', { name: 'Annuler les modifications' }))
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Coin TV')
    expect(screen.getByRole('button', { name: 'Retirer SAL-AS-01' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Modifications non enregistrées' })).toBeNull()
    await user.type(screen.getByLabelText('Nom'), ' bis')
    await user.click(within(screen.getByRole('region', { name: 'Modifications non enregistrées' })).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(fake.sent).toHaveLength(1))
    expect(fake.sent[0]).toEqual({
      method: 'PATCH',
      path: '/api/v1/installation-sheets/7',
      body: { name: 'Coin TV bis', planId: null, perPage: 12, colorByType: false, arrangement: 'ring', planRotation: 0 },
    })
    await user.click(screen.getByRole('link', { name: 'Retour au projet' }))
    expect(await screen.findByRole('region', { name: 'Salon' })).toBeTruthy()
  })

  test('une case vide se place dans la liste et part à l’API, la position et l’orientation se règlent', async () => {
    const user = userEvent.setup()
    renderApp('/projects/1/installation/7')
    await screen.findByRole('table', { name: 'Articles de la planche' })
    await user.click(screen.getByRole('button', { name: '+ Case vide' }))
    await user.click(screen.getByRole('button', { name: 'Monter la case vide n° 4' }))
    await user.click(screen.getByRole('button', { name: 'Monter la case vide n° 3' }))
    expect(screen.getByLabelText('Aperçu de la page 1').textContent).toContain('2 · vide')
    await user.selectOptions(screen.getByLabelText('Position des articles'), 'right')
    await user.selectOptions(screen.getByLabelText('Orientation du plan'), '90')
    expect(screen.getByText('à droite du plan, ligne par ligne')).toBeTruthy()
    const bar = screen.getByRole('region', { name: 'Modifications non enregistrées' })
    await user.click(within(bar).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(fake.sent).toHaveLength(2))
    expect(fake.sent[0]?.body).toMatchObject({ arrangement: 'right', planRotation: 90 })
    expect(fake.sent[1]?.body).toEqual({
      cells: [{ placementId: 1, markers: [] }, null, { placementId: 2, markers: [] }, { placementId: 3, markers: [] }],
    })
  })

  test('« Mettre les repères » : la fenêtre s’ouvre sur l’article choisi, un repère se sélectionne et se supprime, « Terminé » garde le brouillon', async () => {
    const user = userEvent.setup()
    fake.plans = [{ id: 3, projectId: 1, name: 'RDC', fileId: 9, sourceFileId: null, createdAt: '2026-10-16T10:00:00Z', updatedAt: '2026-10-16T10:00:00Z' }]
    fake.sheet = {
      ...SHEET,
      planId: 3,
      items: [
        {
          ...article(1, 'SAL-AS-01'),
          markers: [
            { x: 100, y: 200 },
            { x: 500, y: 500 },
          ],
        },
        article(2, 'SAL-AS-02'),
      ],
    }
    renderApp('/projects/1/installation/7')
    const list = await screen.findByRole('table', { name: 'Articles de la planche' })
    expect(within(list).getByText('2 repère(s)')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Repères de SAL-AS-02' }))
    const editor = screen.getByRole('dialog', { name: 'Mettre les repères' })
    const side = within(editor).getByRole('list', { name: 'Articles de la page' })
    expect(within(side).getByRole('button', { pressed: true }).textContent).toContain('SAL-AS-02')
    expect(within(editor).getByRole('status').textContent).toContain('placer le repère 2 (SAL-AS-02)')
    const dot = within(editor).getAllByRole('button', { name: 'Repère 1 (SAL-AS-01)' })[0]!
    fireEvent.pointerDown(dot, { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(within(editor).getByLabelText('Plan à repérer'), { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
    await user.click(within(editor).getByRole('button', { name: 'Supprimer le repère' }))
    expect(within(side).getByText('1 repère(s)')).toBeTruthy()
    await user.click(within(editor).getByRole('button', { name: 'Terminé' }))
    expect(screen.queryByRole('dialog', { name: 'Mettre les repères' })).toBeNull()
    expect(within(list).getByText('1 repère(s)')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Modifications non enregistrées' })).toBeTruthy()
  })
})
