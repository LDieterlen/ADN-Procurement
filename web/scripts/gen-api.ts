// Generates src/api/schema.d.ts from ../api/openapi.json (no running API needed).
// Shared with tests/schema-freshness.test.ts so both produce byte-identical output.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

export const OPENAPI_PATH = fileURLToPath(new URL('../../api/openapi.json', import.meta.url))
export const SCHEMA_PATH = fileURLToPath(new URL('../src/api/schema.d.ts', import.meta.url))

const HEADER = '// GÉNÉRÉ par `npm run gen:api` depuis api/openapi.json — ne pas éditer à la main.\n\n'

export async function generateSchema(): Promise<string> {
  const document: unknown = JSON.parse(readFileSync(OPENAPI_PATH, 'utf8'))
  const ast = await openapiTS(document as Parameters<typeof openapiTS>[0])
  return HEADER + astToString(ast)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(SCHEMA_PATH, await generateSchema(), 'utf8')
  console.log(`Écrit : ${SCHEMA_PATH}`)
}
