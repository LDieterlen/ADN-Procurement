// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { installFakeApi, type FakeApi } from '../../../tests/helpers/fakeApi'
import { renderApp } from '../../../tests/helpers/render'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi({
    suppliers: [
      { name: 'Tom Dixon', contactName: 'Djamel Sabeur', currency: 'GBP', phone: '01 00 00 00 00', mobile: '06 00 00 00 00', specialty: 'Luminaire' },
      { name: 'Flos' },
      ...Array.from({ length: 60 }, (_, i) => ({ name: `Fournisseur ${String(i).padStart(2, '0')}` })),
    ],
  })
})
afterEach(() => api.restore())

describe('fournisseurs', () => {
  test('la liste est paginée et montre le savoir-faire et le portable', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers')
    const table = await screen.findByRole('table', { name: 'Liste des fournisseurs' })
    expect(within(table).getAllByRole('row')).toHaveLength(51) // header + 50
    expect(screen.getByText('1–50 sur 62')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(await screen.findByText('51–62 sur 62')).toBeTruthy()
    expect(screen.getByText('Tom Dixon')).toBeTruthy()
    expect(screen.getAllByText('Luminaire').length).toBeGreaterThan(0)
    expect(screen.getByText('06 00 00 00 00')).toBeTruthy()
  })

  test('création : nom, représentant et portable', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers/new')
    await user.type(await screen.findByLabelText('Nom'), 'Vitra')
    await user.type(screen.getByLabelText('Représentant'), 'Anna Rossi')
    await user.type(screen.getByLabelText('Portable'), '06 11 22 33 44')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Fournisseurs' })
    const created = api.suppliers.at(-1)
    expect(created?.name).toBe('Vitra')
    expect(created?.contactName).toBe('Anna Rossi')
    expect(created?.currency).toBe('EUR') // hidden from the form, kept in the database
    expect(created?.mobile).toBe('06 11 22 33 44')
  })

  test('un doublon propose d’ouvrir l’existant', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers/new')
    await user.type(await screen.findByLabelText('Nom'), 'tom dixon')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: "Ouvrir l'existant" }))
    expect(await screen.findByRole('heading', { name: 'Tom Dixon' })).toBeTruthy()
    expect((screen.getByLabelText('Représentant') as HTMLInputElement).value).toBe('Djamel Sabeur')
  })

  test('filtre par savoir-faire', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers')
    await screen.findByRole('table', { name: 'Liste des fournisseurs' })
    await screen.findByRole('option', { name: 'Luminaire' })
    await user.selectOptions(screen.getByLabelText('Savoir-faire'), 'Luminaire')
    await screen.findByText('Tom Dixon')
    expect(screen.queryByText('Flos')).toBeNull()
    expect(screen.queryByText('1–50 sur 62')).toBeNull()
  })
})
