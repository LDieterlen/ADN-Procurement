// Contract freshness, front side: src/api/schema.d.ts must equal what gen:api produces (ARCHITECTURE §4).
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { SCHEMA_PATH, generateSchema } from '../scripts/gen-api'

test('schema.d.ts est à jour par rapport à api/openapi.json', async () => {
  const committed = readFileSync(SCHEMA_PATH, 'utf8')
  const fresh = await generateSchema()
  expect(committed, 'schema.d.ts périmé : lancer `uv run ffe openapi` dans api/ puis `npm run gen:api`').toBe(fresh)
})
