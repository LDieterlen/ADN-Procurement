// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi()
})
afterEach(() => api.restore())

describe('page Réglages', () => {
  test('enregistrer l’agence et le préfixe : un PATCH partiel, formulaire rechargé', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    const name = await screen.findByLabelText('Nom')
    await user.type(name, 'Atelier X')
    await user.type(screen.getByLabelText('Préfixe des codes projet'), 'P')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.setting.agencyName).toBe('Atelier X'))
    expect(api.setting.projectCodePrefix).toBe('P')
    const patches = api.requests.filter((r) => r.method === 'PATCH' && r.path === '/api/v1/settings')
    expect(patches).toHaveLength(1)
    expect(patches[0]?.body).toMatchObject({ agencyName: 'Atelier X', agencyAddress: null, agencyEmail: null })
    expect(await screen.findByText('Réglages enregistrés.')).toBeTruthy()
  })

  test('422 du serveur : message sous le champ, rien d’enregistré', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    await user.type(await screen.findByLabelText('E-mail'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Format invalide.')).toBeTruthy()
    expect(api.setting.agencyEmail).toBeNull()
  })

  test('« Sauvegarder maintenant » : POST, puis la date de dernière sauvegarde est rafraîchie', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    const section = await screen.findByRole('region', { name: 'Sauvegardes' })
    expect(within(section).getByText('aucune')).toBeTruthy()
    await user.click(within(section).getByRole('button', { name: 'Sauvegarder maintenant' }))
    expect(await screen.findByText('Sauvegarde faite et copiée.')).toBeTruthy()
    expect(await within(section).findByText('2026-10-10T08:00:00Z')).toBeTruthy()
    expect(within(section).getByText(/copie : \/tmp\/ffe-sauvegardes/)).toBeTruthy()
    expect(api.requests.filter((r) => r.method === 'POST' && r.path === '/api/v1/system/backup')).toHaveLength(1)
  })

  test('dossier Windows absent : avertissement et sauvegarde locale seulement', async () => {
    const user = userEvent.setup()
    api.backupDirOk = false
    renderApp('/settings')
    const section = await screen.findByRole('region', { name: 'Sauvegardes' })
    expect(await within(section).findByText(/absent ou non accessible/)).toBeTruthy()
    await user.click(within(section).getByRole('button', { name: 'Sauvegarder maintenant' }))
    expect(await screen.findByText(/copie Windows absente/)).toBeTruthy()
  })

  test('extension Chrome : générer un jeton l’affiche', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    const card = await screen.findByRole('region', { name: 'Extension Chrome' })
    expect(within(card).getByText('aucun (extension désactivée)')).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: 'Générer un jeton' }))
    await within(card).findByText(/^tok-/)
    expect(api.setting.extensionToken).toMatch(/^tok-/)
    expect(within(card).getByRole('button', { name: 'Régénérer le jeton' })).toBeTruthy()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(within(card).getByRole('button', { name: 'Copier' }))
    expect(writeText).toHaveBeenCalledWith(api.setting.extensionToken)
    expect(await screen.findByText(/Jeton copié/)).toBeTruthy()
  })
})
