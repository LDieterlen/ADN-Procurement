// The only module that knows openapi-fetch (ARCHITECTURE §6). Types come from the generated schema.
// Absolute base URL: the Request constructor refuses relative URLs under Node (tests in jsdom).
// `fetch` is resolved at call time so tests can replace globalThis.fetch after this module loaded.
import createClient from 'openapi-fetch'
import type { paths } from './schema.d.ts'

export const api = createClient<paths>({ baseUrl: window.location.origin, fetch: (request) => globalThis.fetch(request) })
