import { describe, expect, test } from 'vitest'
import { ApiError, unwrap } from './errors'

describe('unwrap', () => {
  test('une réponse 204 sans corps (suppression) est un succès, pas « Erreur HTTP 204 »', () => {
    const result = { data: undefined, error: undefined, response: new Response(null, { status: 204 }) }
    expect(unwrap(result)).toBeUndefined()
  })

  test('une réponse en erreur typée devient une ApiError avec son code', () => {
    const result = { data: undefined, error: { code: 'conflict', message: 'Déjà là.', details: [] }, response: new Response(null, { status: 409 }) }
    expect(() => unwrap(result)).toThrow(ApiError)
    try {
      unwrap(result)
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe('conflict')
      expect((e as ApiError).message).toBe('Déjà là.')
    }
  })

  test('un 404 sans corps garde un message lisible', () => {
    const result = { data: undefined, error: undefined, response: new Response(null, { status: 404 }) }
    expect(() => unwrap(result)).toThrow('Introuvable.')
  })
})
