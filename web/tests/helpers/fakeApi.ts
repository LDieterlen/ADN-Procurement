// In-memory stand-in for the FFE API, installed on globalThis.fetch for component tests (D5.10).
// It mirrors the server rules the UI reacts to (ADR-0013): 422 by field, 409 duplicate/archived,
// 404, archive, catalogue pagination `{items, total}`, item codes `<LOC>-<TYPE>-NN`, the free
// article joining the catalogue, the summary computed with the integer formulas of money.py.
import type { components } from '../../src/api/schema.d.ts'

type ClientRead = components['schemas']['ClientRead']
type SupplierRead = components['schemas']['SupplierRead']
type ProfessionalRead = components['schemas']['ProfessionalRead']
type CategoryRead = components['schemas']['CategoryRead']
type ProductRead = components['schemas']['ProductRead']
type ProductFileRead = components['schemas']['ProductFileRead']
type FileRead = components['schemas']['FileRead']
type ProjectRead = components['schemas']['ProjectRead']
type LocationRead = components['schemas']['LocationRead']
type ProjectItemRead = components['schemas']['ProjectItemRead']
type ProjectSummaryRead = components['schemas']['ProjectSummaryRead']
type SummaryRowRead = components['schemas']['SummaryRowRead']
type BudgetLineRead = components['schemas']['BudgetLineRead']
type BudgetLineIn = components['schemas']['BudgetLineIn']
type SettingRead = components['schemas']['SettingRead']
type ProjectFileRead = components['schemas']['ProjectFileRead']
type EventRead = components['schemas']['EventRead']

const NOW = '2026-10-10T12:00:00Z'
const LATER = '2026-10-10T13:00:00Z'
const FAMILIES = ['custom', 'joinery', 'ose', 'edition', 'gallery', 'artwork', 'textile']
const FAMILY_LABELS: Record<string, string> = {
  custom: 'Pièce sur-mesure',
  joinery: 'Agencement',
  ose: 'OS&E',
  edition: "Pièce d'édition",
  gallery: 'Pièce de galerie',
  artwork: 'Artwork',
  textile: 'Confection',
}
const STATUSES = ['to_quote', 'quoted', 'to_review', 'approved', 'deposit', 'purchased', 'cancelled'] as const
const RANK: Record<string, number> = { to_quote: 0, quoted: 1, to_review: 1, approved: 2, deposit: 3, purchased: 4, cancelled: -1 }

export type FakeApi = {
  clients: ClientRead[]
  suppliers: SupplierRead[]
  professionals: ProfessionalRead[]
  categories: CategoryRead[]
  products: ProductRead[]
  files: FileRead[]
  projects: ProjectRead[]
  locations: LocationRead[]
  items: ProjectItemRead[]
  budgets: BudgetLineRead[]
  setting: SettingRead
  exports: ProjectFileRead[]
  events: EventRead[]
  sequences: Record<string, number>
  lastBackupAt: string | null
  backupDirOk: boolean
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
    specialty: null,
    contactName: null,
    email: null,
    phone: null,
    mobile: null,
    contact2Name: null,
    contact2Phone: null,
    contact2Email: null,
    website: null,
    currency: 'EUR',
    notes: null,
    ...base,
    ...s,
  }
}

export function professionalRow(m: Partial<ProfessionalRead>, id: number): ProfessionalRead {
  return {
    id,
    name: 'Professionnel',
    kind: 'manufacturer',
    specialty: null,
    contactName: null,
    phone: null,
    mobile: null,
    email: null,
    contact2Name: null,
    contact2Phone: null,
    contact2Email: null,
    website: null,
    notes: null,
    ...base,
    ...m,
  }
}

export function categoryRow(c: Partial<CategoryRead>, id: number): CategoryRead {
  return { id, code: 'DIV', name: 'Type', sortOrder: 0, ...base, ...c }
}

export function productRow(p: Partial<ProductRead>, id: number): ProductRead {
  return {
    id,
    name: 'Produit',
    categoryId: 1,
    reference: null,
    supplierId: null,
    listPriceCents: null,
    currency: 'EUR',
    dimensions: null,
    finish: null,
    sourceUrl: null,
    notes: null,
    files: [],
    ...base,
    ...p,
  }
}

export function projectRow(p: Partial<ProjectRead>, id: number): ProjectRead {
  return {
    id,
    code: `2026-${String(id).padStart(3, '0')}`,
    name: 'Projet',
    clientId: 1,
    status: 'prospect',
    siteAddress: null,
    dueOn: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  }
}

export function locationRow(l: Partial<LocationRead>, id: number): LocationRead {
  return { id, projectId: 1, code: 'LOC', name: 'Localisation', zone: null, level: null, multiplier: 1, sortOrder: id * 10, ...base, ...l }
}

export function itemRow(i: Partial<ProjectItemRead>, id: number): ProjectItemRead {
  return {
    id,
    projectId: 1,
    itemCode: `LUD-${String(id).padStart(2, '0')}`,
    kind: 'product',
    categoryId: 1,
    productId: null,
    supplierId: null,
    name: 'Article',
    reference: null,
    family: null,
    usage: null,
    finish: null,
    dimensions: null,
    sourceUrl: null,
    comments: null,
    unitCostCents: 0,
    currency: 'EUR',
    fxRateMicro: 1_000_000,
    discountBp: 0,
    quoteRef: null,
    quoteIndice: null,
    quoteUrl: null,
    status: 'to_quote',
    indice: null,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    placements: [],
    files: [],
    catalogueImageFileId: null,
    ...i,
  }
}

export function placementRow(itemId: number, locationId: number | null, qtyMilli = 1000) {
  return { id: placementSeq++, projectItemId: itemId, locationId, qtyMilli, sortOrder: 0, createdAt: NOW, updatedAt: NOW }
}

/** Minimal multipart/form-data reader: the first `file` part, as bytes plus its filename. */
async function readMultipartFile(request: Request): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const contentType = request.headers.get('content-type') ?? ''
  const boundary = /boundary=([^;]+)/.exec(contentType)?.[1]
  if (!boundary) return null
  const raw = new Uint8Array(await request.arrayBuffer())
  let text = ''
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

type Junction = {
  fileId: number
  kind: string
  isPrimary: boolean
  caption: string | null
  sortOrder: number
  sha256: string
  ext: string
  mimeType: string
  originalName: string
  sizeBytes: number
}

function handleJunctions(state: FakeApi, owner: { files: Junction[] }, method: string, sub: string, body: unknown, defaultKind: string): Response | undefined {
  const payload = (body ?? {}) as Partial<ProductFileRead> & { fileId?: number }
  const fileMatch = /^files(?:\/(\d+))?$/.exec(sub)
  if (!fileMatch) return undefined
  const fileId = fileMatch[1] ? Number(fileMatch[1]) : undefined
  if (fileId === undefined && method === 'POST') {
    const file = state.files.find((f) => f.id === payload.fileId)
    if (!file) return error(404, 'not_found', `Fichier n° ${payload.fileId} introuvable.`)
    if (owner.files.some((f) => f.fileId === file.id)) return error(409, 'conflict', 'Ce fichier est déjà joint.')
    if (payload.isPrimary) owner.files.forEach((f) => (f.isPrimary = false))
    owner.files.push({
      fileId: file.id,
      kind: payload.kind ?? defaultKind,
      isPrimary: payload.isPrimary ?? false,
      caption: payload.caption ?? null,
      sortOrder: payload.sortOrder ?? 0,
      sha256: file.sha256,
      ext: file.ext,
      mimeType: file.mimeType,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
    })
    return json(201, owner)
  }
  const junction = owner.files.find((f) => f.fileId === fileId)
  if (!junction) return error(409, 'conflict', "Ce fichier n'est pas joint.")
  if (method === 'PATCH') {
    if (payload.isPrimary) owner.files.forEach((f) => (f.isPrimary = false))
    Object.assign(junction, payload)
    return json(200, owner)
  }
  if (method === 'DELETE') {
    owner.files = owner.files.filter((f) => f.fileId !== fileId)
    return json(200, owner)
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
      .filter((p) => !q || normalize(p.name).includes(normalize(q)) || normalize(p.reference ?? '').includes(normalize(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
    return json(200, { items: rows, total: rows.length })
  }
  if (rest === undefined && method === 'POST') {
    const name = (payload.name ?? '').trim()
    if (!name) return validation('name', 'Champ obligatoire.')
    if (!payload.categoryId) return validation('categoryId', 'Champ obligatoire.')
    const created = productRow({ ...payload, name }, state.products.length + 1)
    state.products.push(created)
    return json(201, created)
  }
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const product = state.products.find((p) => p.id === Number(match[1]))
  if (!product) return error(404, 'not_found', `Produit n° ${match[1]} introuvable.`)
  const sub = match[2]
  if (sub?.startsWith('files')) {
    const response = handleJunctions(state, product as { files: Junction[] }, method, sub, body, 'image')
    if (response && method === 'PATCH' && typeof (body as { licenseNote?: string | null }).licenseNote !== 'undefined') {
      const junction = product.files.find((f) => f.fileId === Number(/files\/(\d+)/.exec(sub)?.[1]))
      if (junction) junction.licenseNote = (body as { licenseNote: string | null }).licenseNote
      return json(200, product)
    }
    return response
  }
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

const CLOSED = ['closed', 'cancelled']
let placementSeq = 1000

function typeCode(state: FakeApi, categoryId: number | null): string {
  return state.categories.find((c) => c.id === categoryId)?.code ?? 'DIV'
}

function nextCode(state: FakeApi, projectId: number, locationCode: string, prefix: string): string {
  const key = `${projectId}:${locationCode}:${prefix}`
  const n = (state.sequences[key] ?? 0) + 1
  state.sequences[key] = n
  return `${locationCode ? `${locationCode}-` : ''}${prefix}-${String(n).padStart(2, '0')}`
}

function pushEvent(state: FakeApi, itemId: number, kind: string, extra: Partial<EventRead> = {}) {
  state.events.push({
    id: state.events.length + 1,
    projectItemId: itemId,
    kind,
    fromStatus: null,
    toStatus: null,
    oldValue: null,
    newValue: null,
    changedAt: LATER,
    note: null,
    ...extra,
  })
}

function createItem(state: FakeApi, project: ProjectRead, p: Record<string, unknown>): Response {
  const kind = (p.kind as string) ?? 'product'
  const product = typeof p.productId === 'number' ? state.products.find((x) => x.id === p.productId) : undefined
  if (p.productId && !product) return validation('productId', 'Produit introuvable.')
  if (kind === 'fee' && !p.supplierId) return validation('supplierId', 'Une ligne de frais est rattachée à un fournisseur.')
  const categoryId = (p.categoryId as number | null) ?? product?.categoryId ?? null
  if (kind === 'product' && categoryId === null) return validation('categoryId', 'Un type de produit est nécessaire.')
  if (kind === 'product' && categoryId !== null && !state.categories.some((c) => c.id === categoryId))
    return validation('categoryId', `Type de produit n° ${categoryId} introuvable.`)
  const name = ((p.name as string | null) ?? product?.name ?? '').trim()
  if (!name) return validation('name', 'Une désignation est nécessaire.')
  const supplierId = (p.supplierId as number | null) ?? product?.supplierId ?? null
  const supplier = supplierId ? state.suppliers.find((s) => s.id === supplierId) : undefined
  if (supplierId && !supplier) return validation('supplierId', `Fournisseur n° ${supplierId} introuvable.`)
  const currency = (p.currency as string | null) ?? (product?.listPriceCents != null ? product.currency : null) ?? supplier?.currency ?? 'EUR'
  const known = state.items.find((i) => i.projectId === project.id && i.currency === currency)?.fxRateMicro
  const fx = currency === 'EUR' ? 1_000_000 : ((p.fxRateMicro as number | null) ?? known)
  if (fx === undefined) return validation('fxRateMicro', "Un taux de change est nécessaire pour une devise autre que l'euro.")
  if (currency === 'EUR' && typeof p.fxRateMicro === 'number' && p.fxRateMicro !== 1_000_000)
    return validation('fxRateMicro', 'En euros, le taux de change vaut 1 000 000 (parité).')
  const id = state.items.length + 1
  const placementsIn =
    kind === 'fee' ? [] : ((p.placements as { locationId: number | null; qtyMilli: number }[] | null) ?? [{ locationId: null, qtyMilli: 1000 }])
  for (const pl of placementsIn) {
    if (pl.locationId !== null && !state.locations.some((l) => l.id === pl.locationId && l.projectId === project.id))
      return validation('locationId', "La localisation n'appartient pas à ce projet.")
  }
  const first = placementsIn[0]?.locationId ?? null
  const locationCode = first ? (state.locations.find((l) => l.id === first)?.code.toUpperCase() ?? '') : ''
  const itemCode =
    (p.itemCode as string | null) ??
    (kind === 'fee' ? nextCode(state, project.id, '', 'FR') : nextCode(state, project.id, locationCode, typeCode(state, categoryId)))
  if (p.itemCode && state.items.some((i) => i.projectId === project.id && i.itemCode === p.itemCode))
    return validation('itemCode', 'Ce code FF&E est déjà utilisé dans le projet.')
  const reference = (p.reference as string | null) ?? product?.reference ?? null
  let productId = product?.id ?? null
  let note: string | null = null
  if (kind === 'product' && !product && (p.addToCatalogue as boolean | undefined) !== false) {
    const twin = state.products.find(
      (x) => x.archivedAt === null && x.supplierId === supplierId && supplierId !== null && reference && normalize(x.reference ?? '') === normalize(reference),
    )
    const linked =
      twin ??
      (() => {
        const created = productRow(
          {
            name,
            categoryId: categoryId ?? 1,
            reference,
            supplierId,
            listPriceCents: (p.unitCostCents as number | null) || null,
            currency,
            dimensions: (p.dimensions as string | null) ?? null,
            finish: (p.finish as string | null) ?? null,
            sourceUrl: (p.sourceUrl as string | null) ?? null,
          },
          state.products.length + 1,
        )
        state.products.push(created)
        return created
      })()
    productId = linked.id
    note = `lié au produit n° ${linked.id} du catalogue`
  }
  const created = itemRow(
    {
      projectId: project.id,
      itemCode,
      kind: kind as ProjectItemRead['kind'],
      categoryId: kind === 'fee' ? null : categoryId,
      productId,
      supplierId,
      name,
      reference,
      family: (p.family as ProjectItemRead['family']) ?? null,
      usage: (p.usage as ProjectItemRead['usage']) ?? null,
      finish: (p.finish as string | null) ?? product?.finish ?? null,
      dimensions: (p.dimensions as string | null) ?? product?.dimensions ?? null,
      sourceUrl: (p.sourceUrl as string | null) ?? product?.sourceUrl ?? null,
      comments: (p.comments as string | null) ?? null,
      unitCostCents: (p.unitCostCents as number | null) ?? product?.listPriceCents ?? 0,
      currency,
      fxRateMicro: fx,
      discountBp: (p.discountBp as number | null) ?? 0,
      quoteRef: (p.quoteRef as string | null) ?? null,
      quoteIndice: (p.quoteIndice as string | null) ?? null,
      quoteUrl: (p.quoteUrl as string | null) ?? null,
      placements: placementsIn.map((pl) => placementRow(id, pl.locationId, pl.qtyMilli)),
      files: (product?.files ?? []).filter((f) => f.isPrimary).map((f) => ({ ...f, kind: 'image' as const })),
      catalogueImageFileId: product?.files.find((f) => f.isPrimary)?.fileId ?? null,
    },
    id,
  )
  state.items.push(created)
  pushEvent(state, id, 'created', { toStatus: 'to_quote', changedAt: NOW, note })
  return json(201, created)
}

function handleProjects(state: FakeApi, url: URL, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const payload = (body ?? {}) as Partial<ProjectRead>
  if (rest === undefined && method === 'GET') {
    const status = url.searchParams.get('status')
    return json(
      200,
      state.projects
        .filter((p) => !status || p.status === status)
        .sort((a, b) => b.code.localeCompare(a.code))
        .map((p) => {
          const s = summaryOf(state, p.id, url)
          return { ...p, budgetCents: s.budgetCents, specifiedCents: s.specifiedCents, itemCount: s.lines.filter((l) => l.counted).length }
        }),
    )
  }
  if (rest === undefined && method === 'POST') {
    if (!(payload.name ?? '').trim()) return validation('name', 'Champ obligatoire.')
    if (!payload.clientId) return validation('clientId', 'Champ obligatoire.')
    const id = state.projects.length + 1
    const { globalBudgetCents, ...projectPayload } = payload as typeof payload & { globalBudgetCents?: number | null }
    if (typeof globalBudgetCents === 'number')
      state.budgets.push(budgetRow({ projectId: id, scope: 'global', amountCents: globalBudgetCents }, state.budgets.length + 100))
    const created = projectRow({ ...projectPayload, code: payload.code ?? `2026-${String(id).padStart(3, '0')}` }, id)
    state.projects.push(created)
    return json(201, created)
  }
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const project = state.projects.find((p) => p.id === Number(match[1]))
  if (!project) return error(404, 'not_found', `Projet n° ${match[1]} introuvable.`)
  const sub = match[2]
  const readOnly = () => error(409, 'conflict', `Projet n° ${project.id} clos : le rouvrir (statut) avant de le modifier.`)
  if (sub === 'status' && method === 'POST') {
    project.status = (body as { status: ProjectRead['status'] }).status
    return json(200, project)
  }
  if (sub === 'project-items' && method === 'GET') {
    const status = url.searchParams.get('status')
    const supplierId = url.searchParams.get('supplierId')
    const q = url.searchParams.get('q')
    return json(
      200,
      state.items.filter(
        (i) =>
          i.projectId === project.id &&
          (!status || i.status === status) &&
          (!supplierId || i.supplierId === Number(supplierId)) &&
          (!q || normalize(i.name).includes(normalize(q)) || normalize(i.itemCode).includes(normalize(q))),
      ),
    )
  }
  if (sub === 'project-items' && method === 'POST') {
    if (CLOSED.includes(project.status)) return readOnly()
    return createItem(state, project, body as Record<string, unknown>)
  }
  if (sub === 'summary' && method === 'GET') return json(200, summaryOf(state, project.id, url))
  if (sub === 'exports' && method === 'GET')
    return json(
      200,
      state.exports.filter((e) => e.projectId === project.id),
    )
  if ((sub === 'exports/sheets.pdf' || sub === 'exports/list.pdf') && method === 'GET') {
    const sheets = sub === 'exports/sheets.pdf'
    const indice = sheets ? String.fromCharCode(65 + state.exports.filter((e) => e.projectId === project.id && e.kind === 'sheets_pdf').length) : null
    if (sheets) for (const item of state.items.filter((i) => i.projectId === project.id)) item.indice = item.indice ?? indice
    const name = sheets ? `${project.code}-fiches-${indice}-2026-10-10.pdf` : `${project.code}-listing-2026-10-10.pdf`
    state.exports.unshift({
      id: state.exports.length + 1,
      projectId: project.id,
      fileId: 900 + state.exports.length,
      kind: sheets ? 'sheets_pdf' : 'list_pdf',
      issuedAt: LATER,
      indice,
      originalName: name,
      sizeBytes: 4,
    })
    return new Response('%PDF', { status: 200, headers: { 'Content-Type': 'application/pdf' } })
  }
  if (sub === 'budget-lines' && method === 'GET')
    return json(
      200,
      state.budgets.filter((b) => b.projectId === project.id),
    )
  if (sub === 'budget-lines' && method === 'PUT') {
    if (CLOSED.includes(project.status)) return readOnly()
    const incoming = (body as { lines: BudgetLineIn[] }).lines
    const scopes = new Set<string>()
    for (const [index, l] of incoming.entries()) {
      const refs = { location: l.locationId ?? null, zone: l.zone ?? null, family: l.family ?? null, supplier: l.supplierId ?? null }
      for (const [scope, value] of Object.entries(refs))
        if ((value !== null) !== (l.scope === scope)) return validation(`lines.${index}.scope`, 'La référence ne correspond pas au périmètre.')
      if (l.scope === 'family' && !FAMILIES.includes(l.family ?? '')) return validation(`lines.${index}.family`, 'La référence ne correspond pas au périmètre.')
      const key = `${l.scope}:${l.locationId ?? ''}:${l.zone ?? ''}:${l.family ?? ''}:${l.supplierId ?? ''}`
      if (scopes.has(key)) return error(409, 'conflict', 'Deux budgets pour le même périmètre.')
      scopes.add(key)
    }
    state.budgets = state.budgets.filter((b) => b.projectId !== project.id)
    incoming.forEach((l, i) => state.budgets.push(budgetRow({ projectId: project.id, ...l }, 100 + i)))
    return json(
      200,
      state.budgets.filter((b) => b.projectId === project.id),
    )
  }
  if (sub === 'locations' && method === 'GET') {
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    return json(
      200,
      state.locations.filter((l) => l.projectId === project.id && (includeArchived || l.archivedAt === null)).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }
  if (sub === 'locations' && method === 'POST') {
    if (CLOSED.includes(project.status)) return readOnly()
    const l = body as Partial<LocationRead>
    if (!(l.code ?? '').trim()) return validation('code', 'Champ obligatoire.')
    if (!(l.name ?? '').trim()) return validation('name', 'Champ obligatoire.')
    if (state.locations.some((o) => o.projectId === project.id && o.code.toLowerCase() === l.code!.toLowerCase()))
      return validation('code', 'Une localisation de ce projet porte déjà ce code.')
    const last = Math.max(0, ...state.locations.filter((o) => o.projectId === project.id).map((o) => o.sortOrder))
    const created = locationRow({ ...l, projectId: project.id, sortOrder: l.sortOrder ?? last + 10 }, state.locations.length + 1)
    state.locations.push(created)
    return json(201, created)
  }
  if (sub === 'locations/reorder' && method === 'POST') {
    const ids = (body as { locationIds: number[] }).locationIds
    ids.forEach((locationId, index) => {
      const location = state.locations.find((o) => o.id === locationId)
      if (location) location.sortOrder = (index + 1) * 10
    })
    return json(
      200,
      state.locations.filter((l) => l.projectId === project.id && l.archivedAt === null).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }
  if (!sub && method === 'GET') return json(200, project)
  if (!sub && method === 'PATCH') {
    if (CLOSED.includes(project.status)) return readOnly()
    Object.assign(project, body, { updatedAt: LATER })
    return json(200, project)
  }
  return undefined
}

function budgetRow(b: Partial<BudgetLineRead>, id: number): BudgetLineRead {
  return {
    id,
    projectId: 1,
    scope: 'global',
    locationId: null,
    zone: null,
    family: null,
    supplierId: null,
    amountCents: 0,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...b,
  }
}

function handleLocations(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(archive|unarchive))?$/.exec(rest ?? '')
  if (!match) return undefined
  const location = state.locations.find((l) => l.id === Number(match[1]))
  if (!location) return error(404, 'not_found', `Localisation n° ${match[1]} introuvable.`)
  const action = match[2]
  if (action === 'archive') location.archivedAt = NOW
  else if (action === 'unarchive') location.archivedAt = null
  else if (method === 'PATCH') Object.assign(location, body, { updatedAt: LATER })
  else if (method === 'DELETE') {
    if (state.items.some((i) => i.placements.some((p) => p.locationId === location.id)) || state.budgets.some((b) => b.locationId === location.id))
      return error(409, 'conflict', "Conflit d'intégrité dans la base (FOREIGN KEY constraint failed).")
    state.locations = state.locations.filter((l) => l.id !== location.id)
    return new Response(null, { status: 204 })
  }
  return json(200, location)
}

// Integer formulas of money.py, replicated so the fake summary matches the real API.
const divRound = (n: number, d: number) => Math.floor((n + Math.floor(d / 2)) / d)

function summaryOf(state: FakeApi, projectId: number, url: URL): ProjectSummaryRead {
  const f = {
    locationId: url.searchParams.get('locationId'),
    zone: url.searchParams.get('zone'),
    family: url.searchParams.get('family'),
    categoryId: url.searchParams.get('categoryId'),
    supplierId: url.searchParams.get('supplierId'),
  }
  const locations = state.locations.filter((l) => l.projectId === projectId)
  const locationOf = (id: number | null) => locations.find((l) => l.id === id)
  type Bucket = { label: string; specified: number; quoted: number; approved: number; order: string }
  const axes: Record<'location' | 'zone' | 'family' | 'type' | 'supplier', Map<string, Bucket>> = {
    location: new Map(),
    zone: new Map(),
    family: new Map(),
    type: new Map(),
    supplier: new Map(),
  }
  const total = { specified: 0, quoted: 0, approved: 0 }
  const byStatus = new Map<string, { count: number; amount: number }>(STATUSES.map((s) => [s, { count: 0, amount: 0 }]))
  const add = (bucket: { specified: number; quoted: number; approved: number }, status: string, share: number) => {
    bucket.specified += share
    if (RANK[status]! >= 1) bucket.quoted += share
    if (RANK[status]! >= 2) bucket.approved += share
  }
  const bucket = (axis: keyof typeof axes, key: string, label: string, order: string) => {
    let b = axes[axis].get(key)
    if (!b) axes[axis].set(key, (b = { label, specified: 0, quoted: 0, approved: 0, order }))
    return b
  }
  const lines = state.items
    .filter((i) => i.projectId === projectId)
    .map((i) => {
      const pairs =
        i.kind === 'fee'
          ? [{ qty: 1000, mult: 1, loc: null as LocationRead | null | undefined }]
          : i.placements.map((p) => ({ qty: p.qtyMilli, mult: locationOf(p.locationId)?.multiplier ?? 1, loc: locationOf(p.locationId) }))
      const qty = pairs.reduce((s, p) => s + p.qty * p.mult, 0)
      const net = divRound(i.unitCostCents * (10000 - i.discountBp), 10000)
      const eur = divRound(net * i.fxRateMicro, 1_000_000)
      const totalHt = divRound(eur * qty, 1000)
      const counted = i.status !== 'cancelled'
      const matches =
        (!f.family || (i.family ?? '') === f.family) &&
        (!f.categoryId || i.categoryId === Number(f.categoryId)) &&
        (!f.supplierId || i.supplierId === Number(f.supplierId))
      if (matches) {
        const shares = pairs
          .filter((p) =>
            i.kind === 'fee' ? !f.locationId && !f.zone : (!f.locationId || p.loc?.id === Number(f.locationId)) && (!f.zone || (p.loc?.zone ?? '') === f.zone),
          )
          .map((p) => ({ loc: p.loc, share: i.kind === 'fee' ? totalHt : divRound(eur * p.qty * p.mult, 1000) }))
        const kept = shares.reduce((s, x) => s + x.share, 0)
        byStatus.get(i.status)!.count += 1
        if (counted) {
          byStatus.get(i.status)!.amount += kept
          add(total, i.status, kept)
          for (const { loc, share } of shares) {
            if (i.kind === 'fee') continue
            add(
              bucket(
                'location',
                loc ? String(loc.id) : '',
                loc ? `${loc.code} — ${loc.name}` : 'Non affecté',
                loc ? `0${String(loc.sortOrder).padStart(6, '0')}` : '1',
              ),
              i.status,
              share,
            )
            add(bucket('zone', loc?.zone ?? '', loc?.zone ?? 'Sans zone', loc?.zone ? `0${loc.zone}` : '1'), i.status, share)
          }
          if (i.kind === 'fee') {
            add(bucket('family', 'fee', 'Frais', '2'), i.status, kept)
            add(bucket('type', 'fee', 'Frais', '2'), i.status, kept)
          } else {
            add(bucket('family', i.family ?? '', FAMILY_LABELS[i.family ?? ''] ?? 'Sans famille', i.family ? `0${i.family}` : '1'), i.status, kept)
            const c = state.categories.find((x) => x.id === i.categoryId)
            add(bucket('type', String(i.categoryId), c ? `${c.code} — ${c.name}` : '', `0${String(c?.sortOrder ?? 0).padStart(6, '0')}`), i.status, kept)
          }
          const s = state.suppliers.find((x) => x.id === i.supplierId)
          add(bucket('supplier', s ? String(s.id) : '', s?.name ?? 'Sans fournisseur', s ? `0${s.name}` : '1'), i.status, kept)
        }
      }
      return {
        projectItemId: i.id,
        itemCode: i.itemCode,
        status: i.status,
        kind: i.kind,
        counted,
        totalQtyMilli: qty,
        netUnitCents: net,
        netUnitEurCents: eur,
        totalHtCents: totalHt,
        placements:
          i.kind === 'fee'
            ? []
            : i.placements.map((p) => ({ placementId: p.id, totalHtCents: divRound(eur * p.qtyMilli * (locationOf(p.locationId)?.multiplier ?? 1), 1000) })),
      }
    })
  const budgets = state.budgets.filter((b) => b.projectId === projectId)
  const budgetFor = (axis: keyof typeof axes, key: string) =>
    axis === 'type'
      ? null
      : (budgets.find(
          (b) =>
            b.scope === axis &&
            (axis === 'location'
              ? String(b.locationId) === key
              : axis === 'zone'
                ? b.zone === key
                : axis === 'family'
                  ? b.family === key
                  : String(b.supplierId) === key),
        )?.amountCents ?? null)
  const alertOf = (budget: number | null, spec: number): SummaryRowRead['alert'] =>
    budget === null || budget <= 0 ? 'none' : divRound(spec * 10000, budget) >= 10000 ? 'over' : divRound(spec * 10000, budget) >= 9000 ? 'warning' : 'none'
  const rows = (axis: keyof typeof axes): SummaryRowRead[] => {
    if (axis !== 'type')
      for (const b of budgets.filter((b) => b.scope === axis)) {
        const key = axis === 'location' ? String(b.locationId) : axis === 'zone' ? b.zone! : axis === 'family' ? b.family! : String(b.supplierId)
        if (!axes[axis].has(key)) {
          const loc = axis === 'location' ? locationOf(b.locationId) : undefined
          const sup = axis === 'supplier' ? state.suppliers.find((s) => s.id === b.supplierId) : undefined
          bucket(axis, key, loc ? `${loc.code} — ${loc.name}` : sup ? sup.name : axis === 'family' ? (FAMILY_LABELS[key] ?? key) : key, `0${key}`)
        }
      }
    return [...axes[axis].entries()]
      .sort((a, b) => a[1].order.localeCompare(b[1].order))
      .map(([key, b]) => {
        const budget = budgetFor(axis, key)
        return {
          key,
          label: b.label,
          budgetCents: budget,
          specifiedCents: b.specified,
          quotedCents: b.quoted,
          approvedCents: b.approved,
          remainingCents: budget === null ? null : budget - b.specified,
          alert: alertOf(budget, b.specified),
        }
      })
  }
  const globalCents = budgets.find((b) => b.scope === 'global')?.amountCents ?? null
  return {
    projectId,
    lines,
    budgetCents: globalCents,
    specifiedCents: total.specified,
    quotedCents: total.quoted,
    approvedCents: total.approved,
    remainingCents: globalCents === null ? null : globalCents - total.specified,
    alert: alertOf(globalCents, total.specified),
    byStatus: [...byStatus.entries()].map(([status, v]) => ({
      status,
      count: v.count,
      amountCents: v.amount,
      shareBp: status === 'cancelled' || total.specified === 0 ? 0 : divRound(v.amount * 10000, total.specified),
    })),
    byLocation: rows('location'),
    byZone: rows('zone'),
    byFamily: rows('family'),
    byType: rows('type'),
    bySupplier: rows('supplier'),
  }
}

function handleItems(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const item = state.items.find((i) => i.id === Number(match[1]))
  if (!item) return error(404, 'not_found', `Article n° ${match[1]} introuvable.`)
  const project = state.projects.find((p) => p.id === item.projectId)!
  const sub = match[2]
  const payload = (body ?? {}) as Record<string, unknown>
  if (!sub && method === 'GET') return json(200, item)
  if (CLOSED.includes(project.status) && method !== 'GET')
    return error(409, 'conflict', `Projet n° ${project.id} clos : le rouvrir (statut) avant de le modifier.`)
  if (!sub && method === 'PATCH') {
    if (typeof payload.fxRateMicro === 'number' && (payload.currency ?? item.currency) === 'EUR' && payload.fxRateMicro !== 1_000_000)
      return validation('fxRateMicro', 'En euros, le taux de change vaut 1 000 000 (parité).')
    if (payload.name === '') return validation('name', 'Au moins 1 caractère(s).')
    const before = JSON.stringify({ cost: item.unitCostCents, currency: item.currency, fx: item.fxRateMicro, discount: item.discountBp })
    if ('categoryId' in payload && payload.categoryId !== item.categoryId && item.status === 'to_quote') {
      const first = item.placements[0]?.locationId ?? null
      const code = first ? (state.locations.find((l) => l.id === first)?.code.toUpperCase() ?? '') : ''
      payload.itemCode = nextCode(state, item.projectId, code, typeCode(state, payload.categoryId as number))
    }
    Object.assign(item, payload, { updatedAt: LATER })
    if ((payload.currency ?? item.currency) === 'EUR') item.fxRateMicro = 1_000_000
    const after = JSON.stringify({ cost: item.unitCostCents, currency: item.currency, fx: item.fxRateMicro, discount: item.discountBp })
    if (before !== after) pushEvent(state, item.id, 'price', { oldValue: before, newValue: after })
    return json(200, item)
  }
  if (!sub && method === 'DELETE') {
    if (item.status !== 'to_quote' || state.events.some((e) => e.projectItemId === item.id && e.kind !== 'created'))
      return error(409, 'conflict', "Seul un article « à chiffrer » sans historique se supprime ; l'annuler sinon.")
    state.items = state.items.filter((i) => i.id !== item.id)
    return new Response(null, { status: 204 })
  }
  if (sub === 'placements' && method === 'POST') {
    if (item.kind === 'fee') return error(409, 'conflict', "Une ligne de frais n'a pas d'implantation.")
    const p = payload as { locationId: number | null; qtyMilli: number }
    if (item.placements.some((x) => x.locationId === p.locationId)) return validation('locationId', "L'article est déjà implanté dans cette localisation.")
    item.placements.push(placementRow(item.id, p.locationId, p.qtyMilli))
    pushEvent(state, item.id, 'placement')
    return json(201, item)
  }
  if (sub === 'status' && method === 'POST') {
    const s = payload as { status: ProjectItemRead['status']; note?: string | null }
    if (s.status === item.status) return error(409, 'conflict', "L'article est déjà dans ce statut.")
    pushEvent(state, item.id, 'status', { fromStatus: item.status, toStatus: s.status, note: s.note?.trim() || null })
    item.status = s.status
    item.updatedAt = LATER
    return json(200, item)
  }
  if (sub?.startsWith('files')) return handleJunctions(state, item as { files: Junction[] }, method, sub, body, 'image')
  if (sub === 'events' && method === 'GET')
    return json(
      200,
      state.events.filter((e) => e.projectItemId === item.id),
    )
  return undefined
}

function handlePlacements(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const id = Number(rest)
  const item = state.items.find((i) => i.placements.some((p) => p.id === id))
  const placement = item?.placements.find((p) => p.id === id)
  if (!item || !placement) return error(404, 'not_found', 'Implantation introuvable.')
  if (method === 'PATCH') {
    Object.assign(placement, body)
    pushEvent(state, item.id, 'placement')
    return json(200, item)
  }
  if (method === 'DELETE') {
    if (item.placements.length <= 1) return error(409, 'conflict', 'Un article garde au moins une implantation : modifier celle-ci plutôt que la supprimer.')
    item.placements = item.placements.filter((p) => p.id !== id)
    pushEvent(state, item.id, 'placement')
    return json(200, item)
  }
  return undefined
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
  searchKeys: (keyof T)[] = ['name'],
): Response | undefined {
  const payload = (body ?? {}) as Partial<T> & { name?: string }
  if (rest === 'specialties' && method === 'GET') {
    const values = rows.filter((r) => r.archivedAt === null).map((r) => (r as { specialty?: string | null }).specialty ?? '')
    return json(
      200,
      [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    )
  }
  if (rest === undefined && method === 'GET') {
    const q = url.searchParams.get('q')
    const specialty = url.searchParams.get('specialty')
    const kind = url.searchParams.get('kind')
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const all = rows
      .filter((r) => includeArchived || r.archivedAt === null)
      .filter((r) => !q || searchKeys.some((k) => normalize(String(r[k] ?? '')).includes(normalize(q))))
      .filter((r) => !specialty || normalize((r as { specialty?: string | null }).specialty ?? '') === normalize(specialty))
      .filter((r) => !kind || (r as { kind?: string }).kind === kind)
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
    return json(
      200,
      rows.filter((c) => includeArchived || c.archivedAt === null).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    )
  }
  if (rest === undefined && method === 'POST') {
    const name = (payload.name ?? '').trim()
    if (!name) return validation('name', 'Champ obligatoire.')
    const code = (payload.code ?? '').trim().toUpperCase()
    if (!/^[A-Z]{2,4}$/.test(code)) return validation('code', 'Format invalide.')
    if (rows.some((c) => c.code === code)) return validation('code', 'Ce code est déjà utilisé.')
    if (rows.some((c) => normalize(c.name) === normalize(name))) return validation('name', 'Un type de produit porte déjà ce nom.')
    const created = categoryRow({ ...payload, name, code }, rows.length + 1)
    rows.push(created)
    return json(201, created)
  }
  const match = /^(\d+)(?:\/(archive|unarchive))?$/.exec(rest ?? '')
  if (!match) return undefined
  const row = rows.find((c) => c.id === Number(match[1]))
  if (!row) return error(404, 'not_found', `Type de produit n° ${match[1]} introuvable.`)
  const action = match[2]
  if (action === 'archive' && method === 'POST') {
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
    professionals?: Partial<ProfessionalRead>[]
    categories?: Partial<CategoryRead>[]
    products?: Partial<ProductRead>[]
    projects?: Partial<ProjectRead>[]
    locations?: Partial<LocationRead>[]
    items?: Partial<ProjectItemRead>[]
    budgets?: Partial<BudgetLineRead>[]
  } = {},
): FakeApi {
  const originalFetch = globalThis.fetch
  const state: FakeApi = {
    clients: (seed.clients ?? []).map((c, i) => clientRow(c, i + 1)),
    suppliers: (seed.suppliers ?? []).map((s, i) => supplierRow(s, i + 1)),
    professionals: (seed.professionals ?? []).map((m, i) => professionalRow(m, i + 1)),
    categories: (seed.categories ?? []).map((c, i) => categoryRow(c, i + 1)),
    products: (seed.products ?? []).map((p, i) => productRow(p, i + 1)),
    files: [],
    projects: (seed.projects ?? []).map((p, i) => projectRow(p, i + 1)),
    locations: (seed.locations ?? []).map((l, i) => locationRow(l, i + 1)),
    items: (seed.items ?? []).map((it, i) => itemRow(it, i + 1)),
    events: [],
    budgets: (seed.budgets ?? []).map((b, i) => budgetRow(b, i + 1)),
    sequences: {},
    setting: {
      id: 1,
      baseCurrency: 'EUR',
      seedCategoryVersion: 2,
      projectCodePrefix: '',
      agencyName: '',
      agencyAddress: null,
      agencyEmail: null,
      agencyPhone: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    exports: [],
    lastBackupAt: null,
    backupDirOk: true,
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
    const body: unknown =
      ['POST', 'PATCH', 'PUT'].includes(method) && request.headers.get('content-type')?.includes('json') ? await request.clone().json() : undefined
    state.requests.push({ method, path: url.pathname + url.search, body })
    if (state.down) throw new TypeError('Failed to fetch')

    if (url.pathname === '/api/v1/health') {
      return json(200, {
        ok: true,
        dbPath: '/tmp/ffe.sqlite',
        isDevDb: true,
        schemaRevision: '0001',
        lastBackupAt: state.lastBackupAt,
        backupDir: '/tmp/ffe-sauvegardes',
        backupDirOk: state.backupDirOk,
        lastQuickCheck: state.lastBackupAt ? 'ok' : null,
        logPath: '/tmp/ffe/logs/ffe.log',
      })
    }
    if (url.pathname === '/api/v1/settings' && method === 'GET') return json(200, state.setting)
    if (url.pathname === '/api/v1/settings' && method === 'PATCH') {
      const patch = body as Partial<SettingRead>
      if (typeof patch.agencyEmail === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.agencyEmail)) return validation('agencyEmail', 'Format invalide.')
      Object.assign(state.setting, patch, { updatedAt: LATER })
      return json(200, state.setting)
    }
    if (url.pathname === '/api/v1/captures/preview' && method === 'GET') {
      const target = url.searchParams.get('url') ?? ''
      if (!/^https?:\/\//.test(target)) return validation('url', 'Adresse attendue en http:// ou https://.')
      if (target.includes('nothing')) return validation('url', 'Aucune fiche produit lisible sur cette page.')
      return json(200, {
        url: target,
        name: 'Santino - Chaise en chêne massif et cuir',
        brand: 'Tikamoon',
        reference: '7718',
        imageUrl: target.includes('noimage') ? null : 'https://media.example.com/7718.jpg',
        priceCents: 39900,
        currency: 'EUR',
        description: 'Cette chaise associe le chêne et le cuir.',
        source: 'json-ld',
      })
    }
    if (url.pathname === '/api/v1/captures/image' && method === 'POST') {
      const target = (body as { url: string }).url
      const existing = state.files.find((f) => f.sourceUrl === target)
      if (existing) return json(201, existing)
      const file: FileRead = {
        id: state.files.length + 1,
        sha256: 'c'.repeat(64),
        ext: 'jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1234,
        originalName: '7718.jpg',
        sourceUrl: target,
        createdAt: NOW,
      }
      state.files.push(file)
      return json(201, file)
    }
    if (url.pathname === '/api/v1/system/backup' && method === 'POST') {
      state.lastBackupAt = '2026-10-10T08:00:00Z'
      const copied = state.backupDirOk
      return json(200, {
        path: '/tmp/ffe/backups/ffe-20261010-080000.sqlite',
        copiedTo: copied ? '/tmp/ffe-sauvegardes/ffe-20261010-080000.sqlite' : null,
        copyError: copied ? null : 'Dossier de copie absent ou non accessible : /tmp/ffe-sauvegardes',
        quickCheck: 'ok',
        at: '2026-10-10T08:00:00Z',
      })
    }
    const route = /^\/api\/v1\/(clients|suppliers|professionals|categories|products|files|projects|locations|project-items|placements)(?:\/(.+))?$/.exec(
      url.pathname,
    )
    if (route) {
      const [, collection, rest] = route
      let response: Response | undefined
      if (collection === 'clients') response = handleNamed(state.clients, clientRow, false, url, method, rest, body)
      if (collection === 'suppliers') response = handleNamed(state.suppliers, supplierRow, true, url, method, rest, body, ['name', 'contactName'])
      if (collection === 'professionals') response = handleNamed(state.professionals, professionalRow, true, url, method, rest, body)
      if (collection === 'categories') response = handleCategories(state.categories, url, method, rest, body)
      if (collection === 'products') response = handleProducts(state, url, method, rest, body)
      if (collection === 'files') response = await handleFiles(state, request, method, rest)
      if (collection === 'projects') response = handleProjects(state, url, method, rest, body)
      if (collection === 'locations') response = handleLocations(state, method, rest, body)
      if (collection === 'project-items') response = handleItems(state, method, rest, body)
      if (collection === 'placements') response = handlePlacements(state, method, rest, body)
      if (response) return response
    }
    return error(404, 'not_found', `Route inconnue : ${method} ${url.pathname}`)
  }

  return state
}
