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
      { name: 'Tom Dixon', contactName: 'Djamel Sabeur', currency: 'GBP', defaultDiscountBp: 1500 },
      { name: 'Flos' },
      ...Array.from({ length: 60 }, (_, i) => ({ name: `Fournisseur ${String(i).padStart(2, '0')}` })),
    ],
  })
})
afterEach(() => api.restore())

describe('fournisseurs', () => {
  test('la liste est paginée et montre devise et remise', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers')
    const table = await screen.findByRole('table', { name: 'Liste des fournisseurs' })
    expect(within(table).getAllByRole('row')).toHaveLength(51) // header + 50
    expect(screen.getByText('1–50 sur 62')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(await screen.findByText('51–62 sur 62')).toBeTruthy()
    expect(screen.getByText('Tom Dixon')).toBeTruthy()
    expect(screen.getByText('15 %')).toBeTruthy()
    expect(screen.getByText('GBP')).toBeTruthy()
  })

  test('création : nom, représentant, devise et remise', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers/new')
    await user.type(await screen.findByLabelText('Nom'), 'Vitra')
    await user.type(screen.getByLabelText('Représentant'), 'Anna Rossi')
    await user.selectOptions(screen.getByLabelText('Devise'), 'CHF')
    await user.clear(screen.getByLabelText('Remise habituelle'))
    await user.type(screen.getByLabelText('Remise habituelle'), '12,5')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Fournisseurs' })
    const created = api.suppliers.at(-1)
    expect(created?.name).toBe('Vitra')
    expect(created?.contactName).toBe('Anna Rossi')
    expect(created?.currency).toBe('CHF')
    expect(created?.defaultDiscountBp).toBe(1250)
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
})
