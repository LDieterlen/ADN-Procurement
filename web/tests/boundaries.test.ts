// Import boundaries of web/src (ARCHITECTURE §6), checked by regex on Prettier-formatted code.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return listSources(full)
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts') && !name.endsWith('.test.tsx') ? [full] : []
  })
}

const files = listSources(SRC).map((full) => ({ path: relative(SRC, full), text: readFileSync(full, 'utf8') }))
const imports = (text: string) => [...text.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1] ?? '')

describe('frontières de web/src', () => {
  test('seul api/client.ts importe openapi-fetch', () => {
    const offenders = files.filter((f) => f.path !== 'api/client.ts' && imports(f.text).includes('openapi-fetch'))
    expect(offenders.map((f) => f.path)).toEqual([])
  })

  test("pages/ et components/ n'importent pas client.ts", () => {
    const offenders = files.filter(
      (f) => (f.path.startsWith('pages/') || f.path.startsWith('components/')) && imports(f.text).some((i) => /\/client$/.test(i) || /\/client\.ts$/.test(i)),
    )
    expect(offenders.map((f) => f.path)).toEqual([])
  })

  test('aucun fetch( hors api/client.ts', () => {
    const offenders = files.filter((f) => f.path !== 'api/client.ts' && /\bfetch\(/.test(f.text))
    expect(offenders.map((f) => f.path)).toEqual([])
  })

  test('aucune URL http externe dans src/', () => {
    const offenders = files.filter((f) => /https?:\/\//.test(f.text))
    expect(offenders.map((f) => f.path)).toEqual([])
  })
})
