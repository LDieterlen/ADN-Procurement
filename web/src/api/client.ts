// The only module that knows openapi-fetch (ARCHITECTURE §6). Types come from the generated schema.
import createClient from 'openapi-fetch'
import type { paths } from './schema.d.ts'

export const api = createClient<paths>({ baseUrl: '/' })
