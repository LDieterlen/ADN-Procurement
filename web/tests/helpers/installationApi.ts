// The installation routes (ADR-0024) for the component tests, answered in memory around the fake API: one project,
// one room « Salon », one sheet (n° 7) whose detail the tests change; writes are recorded in `sent`.
import type { components } from '../../src/api/schema.d.ts'

type Article = components['schemas']['InstallationArticle']
type Detail = components['schemas']['InstallationSheetDetail']
type PlanRead = components['schemas']['InstallationPlanRead']

export function article(placementId: number, code: string, otherSheets: string[] = []): Article {
  return {
    placementId,
    itemId: placementId,
    code,
    name: `Article ${code}`,
    color: '#46667f',
    markers: [],
    typeName: 'Assise',
    qtyMilli: 1000,
    photoFileId: null,
    otherSheets,
    outOfRoom: false,
  }
}

// A plain grid: the articles on rows 0 and 3, the plan between.
function layout(arrangement: 'ring' | 'sides' | 'ends' | 'right', perPage: number): components['schemas']['InstallationLayout'] {
  const slots = Array.from({ length: perPage }, (_, i) => ({ row: i < perPage / 2 ? 0 : 3, col: i % (perPage / 2) }))
  return {
    arrangement,
    perPage,
    colWidths: Array<number>(perPage / 2).fill(100),
    rowHeights: [200, 265, 265, 200],
    plan: { row: 1, col: 0, rows: 2, cols: perPage / 2 },
    slots,
  }
}

export const SHEET: Detail = {
  id: 7,
  projectId: 1,
  locationId: 1,
  planId: null,
  name: 'Coin TV',
  perPage: 12,
  arrangement: 'ring',
  planRotation: 0,
  colorByType: false,
  sortOrder: 10,
  itemCount: 3,
  pageCount: 1,
  createdAt: '2026-10-16T10:00:00Z',
  updatedAt: '2026-10-16T10:00:00Z',
  items: [article(1, 'SAL-AS-01'), article(2, 'SAL-AS-02', ['Cheminée']), article(3, 'SAL-AS-03')],
  candidates: [article(5, 'SAL-AS-05', ['Cheminée']), article(4, 'SAL-AS-04')],
  layouts: (['ring', 'sides', 'ends', 'right'] as const).flatMap((a) => [layout(a, 8), layout(a, 12), layout(a, 16)]),
}

export type InstallationFake = { sheet: Detail; plans: PlanRead[]; sent: { method: string; path: string; body: unknown }[] }

/** Installed after `installFakeApi` (it restores the original fetch). */
export function installInstallationApi(): InstallationFake {
  const state: InstallationFake = { sheet: SHEET, plans: [], sent: [] }
  const fake = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), 'http://localhost'), init)
    const path = new URL(request.url).pathname
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (path === '/api/v1/installation-sheets/7' || path === '/api/v1/installation-sheets/7/items') {
      if (request.method === 'GET') return json(state.sheet)
      const body: unknown = await request.clone().json()
      state.sent.push({ method: request.method, path, body })
      return json(SHEET)
    }
    if (path === '/api/v1/projects/1/installation-plans') return json(state.plans)
    if (path === '/api/v1/projects/1/installation-sheets') return json([{ ...SHEET, items: undefined }])
    return fake(input, init)
  }
  return state
}
