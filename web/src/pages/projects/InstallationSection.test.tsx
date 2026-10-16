// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { installInstallationApi } from '../../../tests/helpers/installationApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    clients: [{ name: 'Famille Martin' }],
    projects: [{ name: 'Villa', clientId: 1, status: 'active' }],
    locations: [{ projectId: 1, code: 'SAL', name: 'Salon', zone: null, level: 'R0', multiplier: 1, sortOrder: 10 }],
  })
  installInstallationApi()
})
afterEach(() => api.restore())

describe('onglet Installation', () => {
  test('l’onglet Installation range les planches par pièce, avec leur PDF', async () => {
    renderApp('/projects/1?vue=installation')
    const room = await screen.findByRole('region', { name: 'Salon' })
    expect(within(room).getByRole('link', { name: 'Coin TV' }).getAttribute('href')).toBe('/projects/1/installation/7')
    expect(within(room).getByText(/3 article\(s\) · 1 page\(s\)/)).toBeTruthy()
    expect(within(room).getByRole('link', { name: 'PDF de la pièce' }).getAttribute('href')).toBe('/api/v1/projects/1/installation.pdf?locationId=1')
  })
})
