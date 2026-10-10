// In-memory stand-in for the FFE API, installed on globalThis.fetch for component tests (D5.10).
// It mirrors the server rules the UI reacts to: 422 by field, 409 duplicate/archived, 404, archive,
// catalogue pagination `{items, total}` and the two-level category rules (D6a.9).
import type { components } from '../../src/api/schema.d.ts'

type ClientRead = components['schemas']['ClientRead']
type SupplierRead = components['schemas']['SupplierRead']
type ManufacturerRead = components['schemas']['ManufacturerRead']
type CategoryRead = components['schemas']['CategoryRead']

const NOW = '2026-10-10T12:00:00Z'
const LATER = '2026-10-10T13:00:00Z'

export type FakeApi = {
  clients: ClientRead[]
  suppliers: SupplierRead[]
  manufacturers: ManufacturerRead[]
  categories: CategoryRead[]
  requests: { method: string; path: string; body: unknown }[]
  down: boolean
  restore: () => void
}

type Named = { id: number; name: string; archivedAt: string | null; updatedAt: string }

const normalize = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function error(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return json(status, { code, message, details: [], ...extra })
}

function validation(field: string, message: string) {
  return json(422, { code: 'validation_error', message: 'Données invalides.', details: [{ field, message }] })
}

const base = { archivedAt: null, createdAt: NOW, updatedAt: NOW }

export function clientRow(c: Partial<ClientRead>, id: number): ClientRead {
  return {
    id,
    name: 'Client',
    kind: 'individual',
    contactName: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    countryCode: 'FR',
    siren: null,
    notes: null,
    ...base,
    ...c,
  }
}

export function supplierRow(s: Partial<SupplierRead>, id: number): SupplierRead {
  return {
    id,
    name: 'Fournisseur',
    legalName: null,
    countryCode: 'FR',
    siren: null,
    siret: null,
    vatNumber: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    contactName: null,
    email: null,
    phone: null,
    website: null,
    currency: 'EUR',
    defaultDiscountBp: 0,
    paymentTerms: null,
    notes: null,
    ...base,
    ...s,
  }
}

export function manufacturerRow(m: Partial<ManufacturerRead>, id: number): ManufacturerRead {
  return { id, name: 'Fabricant', website: null, notes: null, ...base, ...m }
}

export function categoryRow(c: Partial<CategoryRead>, id: number): CategoryRead {
  return { id, parentId: null, code: null, name: 'Catégorie', sortOrder: 0, ...base, ...c }
}

/** Generic named resource with the `client` template rules; `paginated` wraps lists in {items, total}. */
function handleNamed<T extends Named>(
  rows: T[],
  make: (payload: Partial<T>, id: number) => T,
  paginated: boolean,
  url: URL,
  method: string,
  rest: string | undefined,
  body: unknown,
): Response | undefined {
  const payload = (body ?? {}) as Partial<T> & { name?: string }
  if (rest === undefined && method === 'GET') {
    const q = url.searchParams.get('q')
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const all = rows
      .filter((r) => includeArchived || r.archivedAt === null)
      .filter((r) => !q || normalize(r.name).includes(normalize(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
    return paginated ? json(200, { items: all.slice(offset, offset + limit), total: all.length }) : json(200, all)
  }
  if (rest === undefined && method === 'POST') {
    const name = (payload.name ?? '').trim()
    if (!name) return validation('name', 'Champ obligatoire.')
    const twin = rows.find((r) => normalize(r.name) === normalize(name))
    if (twin?.archivedAt) return error(409, 'conflict', 'Un élément archivé porte déjà ce nom.', { archivedId: twin.id })
    if (twin && url.searchParams.get('force') !== 'true') return error(409, 'duplicate', 'Un élément actif porte déjà ce nom.', { existingId: twin.id })
    const created = make({ ...payload, name }, rows.length + 1)
    rows.push(created)
    return json(201, created)
  }
  const match = /^(\d+)(?:\/(archive|unarchive))?$/.exec(rest ?? '')
  if (!match) return undefined
  const row = rows.find((r) => r.id === Number(match[1]))
  if (!row) return error(404, 'not_found', `Élément n° ${match[1]} introuvable.`)
  const action = match[2]
  if (action === 'archive' && method === 'POST') {
    if (row.archivedAt) return error(409, 'conflict', 'Déjà archivé.')
    row.archivedAt = NOW
    return json(200, row)
  }
  if (action === 'unarchive' && method === 'POST') {
    if (!row.archivedAt) return error(409, 'conflict', "N'est pas archivé.")
    row.archivedAt = null
    return json(200, row)
  }
  if (!action && method === 'GET') return json(200, row)
  if (!action && method === 'PATCH') {
    if (row.archivedAt) return error(409, 'conflict', 'Archivé : le restaurer avant de le modifier.')
    Object.assign(row, body, { updatedAt: LATER })
    return json(200, row)
  }
  return undefined
}

function handleCategories(rows: CategoryRead[], url: URL, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const payload = (body ?? {}) as Partial<CategoryRead>
  if (rest === undefined && method === 'GET') {
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const visible = rows.filter((c) => includeArchived || c.archivedAt === null)
    const parents = visible.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder)
    const ordered = parents.flatMap((p) => [p, ...visible.filter((c) => c.parentId === p.id).sort((a, b) => a.sortOrder - b.sortOrder)])
    return json(200, ordered)
  }
  if (rest === undefined && method === 'POST') {
    const name = (payload.name ?? '').trim()
    if (!name) return validation('name', 'Champ obligatoire.')
    if (payload.parentId == null && !payload.code) return validation('code', 'Une catégorie de niveau 1 porte un code (2 à 4 lettres majuscules).')
    if (payload.parentId != null) {
      const parent = rows.find((c) => c.id === payload.parentId)
      if (!parent) return validation('parentId', 'Catégorie parente introuvable.')
      if (parent.parentId !== null) return validation('parentId', "Deux niveaux seulement : une sous-catégorie ne peut pas avoir d'enfant.")
    }
    if (rows.some((c) => c.parentId === (payload.parentId ?? null) && normalize(c.name) === normalize(name))) {
      return validation('name', 'Une catégorie porte déjà ce nom sous le même parent.')
    }
    const created = categoryRow(
      { ...payload, name, parentId: payload.parentId ?? null, code: payload.parentId != null ? null : (payload.code ?? null) },
      rows.length + 1,
    )
    rows.push(created)
    return json(201, created)
  }
  const match = /^(\d+)(?:\/(archive|unarchive))?$/.exec(rest ?? '')
  if (!match) return undefined
  const row = rows.find((c) => c.id === Number(match[1]))
  if (!row) return error(404, 'not_found', `Catégorie n° ${match[1]} introuvable.`)
  const action = match[2]
  if (action === 'archive' && method === 'POST') {
    if (row.code === 'DIV') return error(409, 'conflict', 'La catégorie « Divers » (DIV) ne s’archive pas.')
    if (rows.some((c) => c.parentId === row.id && c.archivedAt === null)) return error(409, 'conflict', 'Archiver d’abord les sous-catégories actives.')
    row.archivedAt = NOW
    return json(200, row)
  }
  if (action === 'unarchive' && method === 'POST') {
    row.archivedAt = null
    return json(200, row)
  }
  if (!action && method === 'GET') return json(200, row)
  if (!action && method === 'PATCH') {
    const changes = body as Partial<CategoryRead>
    if (changes.name !== undefined) row.name = changes.name
    if (changes.sortOrder !== undefined) row.sortOrder = changes.sortOrder
    row.updatedAt = LATER
    return json(200, row)
  }
  return undefined
}

export function installFakeApi(
  seed: {
    clients?: Partial<ClientRead>[]
    suppliers?: Partial<SupplierRead>[]
    manufacturers?: Partial<ManufacturerRead>[]
    categories?: Partial<CategoryRead>[]
  } = {},
): FakeApi {
  const originalFetch = globalThis.fetch
  const state: FakeApi = {
    clients: (seed.clients ?? []).map((c, i) => clientRow(c, i + 1)),
    suppliers: (seed.suppliers ?? []).map((s, i) => supplierRow(s, i + 1)),
    manufacturers: (seed.manufacturers ?? []).map((m, i) => manufacturerRow(m, i + 1)),
    categories: (seed.categories ?? []).map((c, i) => categoryRow(c, i + 1)),
    requests: [],
    down: false,
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    const method = request.method.toUpperCase()
    const body: unknown = ['POST', 'PATCH'].includes(method) && request.headers.get('content-type')?.includes('json') ? await request.json() : undefined
    state.requests.push({ method, path: url.pathname + url.search, body })
    if (state.down) throw new TypeError('Failed to fetch')

    if (url.pathname === '/api/v1/health') {
      return json(200, { ok: true, dbPath: '/tmp/ffe.sqlite', isDevDb: true, schemaRevision: '0002', lastBackupAt: null, backupDirOk: true })
    }
    const route = /^\/api\/v1\/(clients|suppliers|manufacturers|categories)(?:\/(.+))?$/.exec(url.pathname)
    if (route) {
      const [, collection, rest] = route
      let response: Response | undefined
      if (collection === 'clients') response = handleNamed(state.clients, clientRow, false, url, method, rest, body)
      if (collection === 'suppliers') response = handleNamed(state.suppliers, supplierRow, true, url, method, rest, body)
      if (collection === 'manufacturers') response = handleNamed(state.manufacturers, manufacturerRow, true, url, method, rest, body)
      if (collection === 'categories') response = handleCategories(state.categories, url, method, rest, body)
      if (response) return response
    }
    return error(404, 'not_found', `Route inconnue : ${method} ${url.pathname}`)
  }

  return state
}
