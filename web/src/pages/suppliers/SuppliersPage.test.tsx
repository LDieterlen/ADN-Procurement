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
      { name: 'Tom Dixon', legalName: 'Tom Dixon Limited', countryCode: 'GB', currency: 'GBP', defaultDiscountBp: 1500 },
      { name: 'Flos', countryCode: 'IT' },
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

  test('création avec le bloc Identité légale replié puis déplié', async () => {
    const user = userEvent.setup()
    renderApp('/suppliers/new')
    await screen.findByLabelText('Nom')
    expect(screen.queryByLabelText('SIRET')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Identité légale/ }))
    await user.type(screen.getByLabelText('Nom'), 'Vitra')
    await user.type(screen.getByLabelText('SIREN'), '123456789')
    await user.selectOptions(screen.getByLabelText('Devise de facturation'), 'CHF')
    await user.clear(screen.getByLabelText('Remise habituelle'))
    await user.type(screen.getByLabelText('Remise habituelle'), '12,5')
    await user.click(screen.getByRole('button', { name: 'Créer' }))
    await screen.findByRole('heading', { name: 'Fournisseurs' })
    const created = api.suppliers.at(-1)
    expect(created?.name).toBe('Vitra')
    expect(created?.siren).toBe('123456789')
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
    expect((screen.getByLabelText('Raison sociale') as HTMLInputElement).value).toBe('Tom Dixon Limited') // legal block opened: data present
  })
})
