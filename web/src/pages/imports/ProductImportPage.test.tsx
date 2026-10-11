// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    suppliers: [{ name: 'Tom Dixon', currency: 'GBP' }],
    categories: [{ code: 'LUM', name: 'Luminaires' }],
  })
})
afterEach(() => api.restore())

describe('page Import tarifs', () => {
  test('prévisualiser puis importer : plan du serveur, mapping modifiable, bilan et historique', async () => {
    const user = userEvent.setup()
    renderApp('/imports/products')
    await screen.findByRole('option', { name: 'Tom Dixon' })
    await user.selectOptions(screen.getByLabelText('Fournisseur'), '1')
    const file = new File(['Réf;Désignation;Prix HT\nBLS01;Beat Light Fat;1180\n'], 'tarif-2026.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('Fichier de tarifs'), file)
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }))
    expect(await screen.findByText(/3 ligne\(s\) : 1 à créer, 1 à mettre à jour, 0 inchangée\(s\), 1 ignorée\(s\)/)).toBeTruthy()
    const plan = screen.getByRole('table', { name: 'Plan d’import' })
    expect(within(plan).getByText('Mettre à jour')).toBeTruthy()
    expect(within(plan).getByText('prix illisible : « n/a »')).toBeTruthy()
    expect(within(plan).getByText('1 180,00')).toBeTruthy()
    expect((screen.getByLabelText('Colonne pour Prix catalogue') as HTMLSelectElement).value).toBe('Prix HT')
    expect(screen.getByText(/deviné : à vérifier/)).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('Colonne pour Finition'), 'Désignation')
    await user.click(screen.getByRole('button', { name: 'Appliquer le mapping' }))
    await screen.findByText(/3 ligne\(s\)/)
    await user.click(screen.getByLabelText('Marquer les absents comme arrêtés'))
    await user.click(screen.getByRole('button', { name: /Importer \(2 écriture\(s\)\)/ }))
    expect(await screen.findByText(/Import tarif-2026\.csv : 1 créé\(s\), 1 mis à jour/)).toBeTruthy()
    const posts = api.requests.filter((r) => r.method === 'POST' && r.path.startsWith('/api/v1/imports/products/'))
    expect(posts.map((r) => r.path)).toEqual(['/api/v1/imports/products/preview', '/api/v1/imports/products/preview', '/api/v1/imports/products/commit'])
    const history = await screen.findByRole('region', { name: 'Imports précédents' })
    expect(history.textContent).toContain('tarif-2026.csv : 1 créé(s), 1 mis à jour')
  })
})
