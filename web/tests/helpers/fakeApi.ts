// In-memory stand-in for the FFE API, installed on globalThis.fetch for component tests (D5.10).
// It mirrors the server rules the UI reacts to: 422 by field, 409 duplicate/archived, 404, archive,
// catalogue pagination `{items, total}` and the two-level category rules (D6a.9).
import type { components } from '../../src/api/schema.d.ts'

type ClientRead = components['schemas']['ClientRead']
type SupplierRead = components['schemas']['SupplierRead']
type ManufacturerRead = components['schemas']['ManufacturerRead']
type CategoryRead = components['schemas']['CategoryRead']
type ProductRead = components['schemas']['ProductRead']
type ProductFileRead = components['schemas']['ProductFileRead']
type FileRead = components['schemas']['FileRead']

const NOW = '2026-10-10T12:00:00Z'
const LATER = '2026-10-10T13:00:00Z'

export type FakeApi = {
  clients: ClientRead[]
  suppliers: SupplierRead[]
  manufacturers: ManufacturerRead[]
  categories: CategoryRead[]
  products: ProductRead[]
  files: FileRead[]
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

export function productRow(p: Partial<ProductRead>, id: number): ProductRead {
  return {
    id,
    name: 'Produit',
    description: null,
    categoryId: 1,
    manufacturerId: null,
    manufacturerRef: null,
    gtin: null,
    supplierId: null,
    supplierRef: null,
    unit: 'piece',
    listPriceCents: null,
    listPriceCurrency: 'EUR',
    listPriceTaxMode: 'ht',
    listPriceVatBp: null,
    listPriceOn: null,
    leadTimeWeeks: null,
    widthMm: null,
    depthMm: null,
    heightMm: null,
    diameterMm: null,
    materials: null,
    finish: null,
    color: null,
    sourceUrl: null,
    sourceKind: 'manual',
    discontinuedOn: null,
    notes: null,
    files: [],
    ...base,
    ...p,
  }
}

/** Minimal multipart/form-data reader: the first `file` part, as bytes plus its filename. */
async function readMultipartFile(request: Request): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const contentType = request.headers.get('content-type') ?? ''
  const boundary = /boundary=([^;]+)/.exec(contentType)?.[1]
  if (!boundary) return null
  const raw = new Uint8Array(await request.arrayBuffer())
  let text = '' // one char per byte (a WHATWG 'latin1' decoder would remap 0x80–0x9F)
  for (const byte of raw) text += String.fromCharCode(byte)
  const marker = `--${boundary}`
  for (const section of text.split(marker)) {
    const headerEnd = section.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headers = section.slice(0, headerEnd)
    if (!/name="file"/.test(headers)) continue
    const filename = /filename="([^"]*)"/.exec(headers)?.[1] ?? 'fichier'
    const bodyText = section.slice(headerEnd + 4).replace(/\r\n$/, '')
    return { bytes: Uint8Array.from(bodyText, (c) => c.charCodeAt(0)), filename }
  }
  return null
}

async function handleFiles(state: FakeApi, request: Request, method: string, rest: string | undefined): Promise<Response | undefined> {
  if (rest === undefined && method === 'POST') {
    // undici cannot parse the multipart body Vitest builds from a jsdom File: read the raw bytes instead.
    const part = await readMultipartFile(request)
    if (!part) return validation('file', 'Fichier vide.')
    const { bytes, filename } = part
    if (bytes.length === 0) return validation('file', 'Fichier vide.')
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50
    if (!isPng && !isJpeg && !isPdf) return validation('file', 'Type de fichier refusé : images JPEG, PNG, WebP ou PDF seulement.')
    const sha256 = Array.from(bytes.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .padEnd(64, '0')
    const existing = state.files.find((f) => f.sha256 === sha256)
    if (existing) return json(200, existing)
    const file: FileRead = {
      id: state.files.length + 1,
      sha256,
      ext: isPng ? 'png' : isJpeg ? 'jpg' : 'pdf',
      mimeType: isPng ? 'image/png' : isJpeg ? 'image/jpeg' : 'application/pdf',
      sizeBytes: bytes.length,
      originalName: filename,
      sourceUrl: null,
      createdAt: NOW,
    }
    state.files.push(file)
    return json(201, file)
  }
  const match = /^(\d+)\/content$/.exec(rest ?? '')
  if (match && method === 'GET') {
    const file = state.files.find((f) => f.id === Number(match[1]))
    return file ? new Response('bytes', { status: 200, headers: { 'Content-Type': file.mimeType } }) : error(404, 'not_found', 'Fichier introuvable.')
  }
  return undefined
}

function handleProductFiles(state: FakeApi, product: ProductRead, method: string, sub: string, body: unknown): Response | undefined {
  const payload = (body ?? {}) as Partial<ProductFileRead> & { fileId?: number }
  const fileMatch = /^files(?:\/(\d+))?$/.exec(sub)
  if (!fileMatch) return undefined
  const fileId = fileMatch[1] ? Number(fileMatch[1]) : undefined
  if (fileId === undefined && method === 'POST') {
    const file = state.files.find((f) => f.id === payload.fileId)
    if (!file) return error(404, 'not_found', `Fichier n° ${payload.fileId} introuvable.`)
    if (product.files.some((f) => f.fileId === file.id)) return error(409, 'conflict', 'Ce fichier est déjà joint au produit.')
    if (payload.isPrimary) product.files.forEach((f) => (f.isPrimary = false))
    product.files.push({
      fileId: file.id,
      kind: payload.kind ?? 'image',
      isPrimary: payload.isPrimary ?? false,
      caption: payload.caption ?? null,
      sortOrder: payload.sortOrder ?? 0,
      sha256: file.sha256,
      ext: file.ext,
      mimeType: file.mimeType,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
    })
    return json(201, product)
  }
  const junction = product.files.find((f) => f.fileId === fileId)
  if (!junction) return error(409, 'conflict', "Ce fichier n'est pas joint au produit.")
  if (method === 'PATCH') {
    if (payload.isPrimary) product.files.forEach((f) => (f.isPrimary = false))
    Object.assign(junction, payload)
    return json(200, product)
  }
  if (method === 'DELETE') {
    product.files = product.files.filter((f) => f.fileId !== fileId)
    return json(200, product)
  }
  return undefined
}

function handleProducts(state: FakeApi, url: URL, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const payload = (body ?? {}) as Partial<ProductRead>
  if (rest === undefined && method === 'GET') {
    const q = url.searchParams.get('q')
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const categoryId = url.searchParams.get('categoryId')
    const rows = state.products
      .filter((p) => includeArchived || p.archivedAt === null)
      .filter((p) => !categoryId || p.categoryId === Number(categoryId))
      .filter((p) => !q || normalize(p.name).includes(normalize(q)) || normalize(p.manufacturerRef ?? '').includes(normalize(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
    return json(200, { items: rows, total: rows.length })
  }
  if (rest === undefined && method === 'POST') {
    const name = (payload.name ?? '').trim()
    if (!name) return validation('name', 'Champ obligatoire.')
    if (!payload.categoryId) return validation('categoryId', 'Champ obligatoire.')
    if (payload.listPriceTaxMode === 'ttc' && payload.listPriceVatBp == null) return validation('listPriceVatBp', 'Un prix TTC exige le taux de TVA à déduire.')
    const created = productRow({ ...payload, name }, state.products.length + 1)
    state.products.push(created)
    return json(201, created)
  }
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const product = state.products.find((p) => p.id === Number(match[1]))
  if (!product) return error(404, 'not_found', `Produit n° ${match[1]} introuvable.`)
  const sub = match[2]
  if (sub?.startsWith('files')) return handleProductFiles(state, product, method, sub, body)
  if (sub === 'archive' && method === 'POST') {
    product.archivedAt = NOW
    return json(200, product)
  }
  if (sub === 'unarchive' && method === 'POST') {
    product.archivedAt = null
    return json(200, product)
  }
  if (!sub && method === 'GET') return json(200, product)
  if (!sub && method === 'PATCH') {
    Object.assign(product, body, { updatedAt: LATER })
    return json(200, product)
  }
  return undefined
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
    products?: Partial<ProductRead>[]
  } = {},
): FakeApi {
  const originalFetch = globalThis.fetch
  const state: FakeApi = {
    clients: (seed.clients ?? []).map((c, i) => clientRow(c, i + 1)),
    suppliers: (seed.suppliers ?? []).map((s, i) => supplierRow(s, i + 1)),
    manufacturers: (seed.manufacturers ?? []).map((m, i) => manufacturerRow(m, i + 1)),
    categories: (seed.categories ?? []).map((c, i) => categoryRow(c, i + 1)),
    products: (seed.products ?? []).map((p, i) => productRow(p, i + 1)),
    files: [],
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
    const body: unknown = ['POST', 'PATCH'].includes(method) && request.headers.get('content-type')?.includes('json') ? await request.clone().json() : undefined
    state.requests.push({ method, path: url.pathname + url.search, body })
    if (state.down) throw new TypeError('Failed to fetch')

    if (url.pathname === '/api/v1/health') {
      return json(200, { ok: true, dbPath: '/tmp/ffe.sqlite', isDevDb: true, schemaRevision: '0002', lastBackupAt: null, backupDirOk: true })
    }
    const route = /^\/api\/v1\/(clients|suppliers|manufacturers|categories|products|files)(?:\/(.+))?$/.exec(url.pathname)
    if (route) {
      const [, collection, rest] = route
      let response: Response | undefined
      if (collection === 'clients') response = handleNamed(state.clients, clientRow, false, url, method, rest, body)
      if (collection === 'suppliers') response = handleNamed(state.suppliers, supplierRow, true, url, method, rest, body)
      if (collection === 'manufacturers') response = handleNamed(state.manufacturers, manufacturerRow, true, url, method, rest, body)
      if (collection === 'categories') response = handleCategories(state.categories, url, method, rest, body)
      if (collection === 'products') response = handleProducts(state, url, method, rest, body)
      if (collection === 'files') response = await handleFiles(state, request, method, rest)
      if (response) return response
    }
    return error(404, 'not_found', `Route inconnue : ${method} ${url.pathname}`)
  }

  return state
}
