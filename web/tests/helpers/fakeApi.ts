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
type ProjectRead = components['schemas']['ProjectRead']
type ZoneRead = components['schemas']['ZoneRead']
type ProjectItemRead = components['schemas']['ProjectItemRead']
type ProjectSummaryRead = components['schemas']['ProjectSummaryRead']
type BudgetLineRead = components['schemas']['BudgetLineRead']
type BudgetRowRead = components['schemas']['BudgetRowRead']
type SettingRead = components['schemas']['SettingRead']
type QuoteRead = components['schemas']['QuoteRead']
type QuoteLineRead = components['schemas']['QuoteLineRead']
type PoRead = components['schemas']['PoRead']
type PoLineRead = components['schemas']['PoLineRead']
type DeliveryRead = components['schemas']['DeliveryRead']
type InvoiceRead = components['schemas']['InvoiceRead']
type ProjectFileRead = components['schemas']['ProjectFileRead']
type ImportBatchRead = components['schemas']['ImportBatchRead']

const NOW = '2026-10-10T12:00:00Z'
const LATER = '2026-10-10T13:00:00Z'

export type FakeApi = {
  clients: ClientRead[]
  suppliers: SupplierRead[]
  manufacturers: ManufacturerRead[]
  categories: CategoryRead[]
  products: ProductRead[]
  files: FileRead[]
  projects: ProjectRead[]
  zones: ZoneRead[]
  items: ProjectItemRead[]
  budgets: BudgetLineRead[]
  setting: SettingRead
  quotes: QuoteRead[]
  purchaseOrders: PoRead[]
  deliveries: DeliveryRead[]
  invoices: InvoiceRead[]
  exports: ProjectFileRead[]
  importBatches: ImportBatchRead[]
  lastBackupAt: string | null
  backupDirOk: boolean
  events: {
    id: number
    projectItemId: number
    kind: string
    fromStatus: string | null
    toStatus: string | null
    oldValue: string | null
    newValue: string | null
    changedAt: string
    note: string | null
  }[]
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

export function projectRow(p: Partial<ProjectRead>, id: number): ProjectRead {
  return {
    id,
    code: `2026-${String(id).padStart(3, '0')}`,
    name: 'Projet',
    clientId: 1,
    status: 'prospect',
    siteAddress: null,
    deliveryAddress: null,
    deliveryContact: null,
    defaultVatBp: 2000,
    contingencyBp: 1000,
    startOn: null,
    dueOn: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  }
}

export function zoneRow(z: Partial<ZoneRead>, id: number): ZoneRead {
  return { id, projectId: 1, code: 'ZON', name: 'Zone', kind: null, multiplier: 1, sortOrder: id * 10, notes: null, ...base, ...z }
}

const CLOSED = ['closed', 'cancelled']

function handleProjects(state: FakeApi, url: URL, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const payload = (body ?? {}) as Partial<ProjectRead>
  if (rest === undefined && method === 'GET') {
    const status = url.searchParams.get('status')
    return json(
      200,
      state.projects.filter((p) => !status || p.status === status).sort((a, b) => b.code.localeCompare(a.code)),
    )
  }
  if (rest === undefined && method === 'POST') {
    if (!(payload.name ?? '').trim()) return validation('name', 'Champ obligatoire.')
    if (!payload.clientId) return validation('clientId', 'Champ obligatoire.')
    const id = state.projects.length + 1
    const created = projectRow(
      {
        ...payload,
        code: payload.code ?? `2026-${String(id).padStart(3, '0')}`,
        defaultVatBp: payload.defaultVatBp ?? 2000,
        contingencyBp: payload.contingencyBp ?? 1000,
      },
      id,
    )
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
    const kind = url.searchParams.get('kind')
    const supplierId = url.searchParams.get('supplierId')
    const q = url.searchParams.get('q')
    return json(
      200,
      state.items.filter(
        (i) =>
          i.projectId === project.id &&
          (!status || i.status === status) &&
          (!kind || i.kind === kind) &&
          (!supplierId || i.supplierId === Number(supplierId)) &&
          (!q || normalize(i.name).includes(normalize(q)) || normalize(i.itemCode).includes(normalize(q))),
      ),
    )
  }
  if (sub === 'project-items' && method === 'POST') {
    if (CLOSED.includes(project.status)) return readOnly()
    const p = body as Record<string, unknown>
    const product = typeof p.productId === 'number' ? state.products.find((x) => x.id === p.productId) : undefined
    if (p.productId && !product) return validation('productId', 'Produit introuvable.')
    if (!product && !p.categoryId) return validation('categoryId', 'Une catégorie est nécessaire sans produit.')
    if (!product && !p.name) return validation('name', 'Un libellé est nécessaire sans produit.')
    const currency = (p.currency as string | null) ?? product?.listPriceCurrency ?? 'EUR'
    if (currency !== 'EUR' && !p.fxRateMicro && !state.items.some((i) => i.currency === currency))
      return validation('fxRateMicro', "Un taux de change est nécessaire pour une devise autre que l'euro.")
    const supplier = product?.supplierId ? state.suppliers.find((s) => s.id === product.supplierId) : undefined
    const id = state.items.length + 1
    const placements = ((p.placements as { zoneId: number | null; qtyMilli: number }[] | null) ?? [{ zoneId: null, qtyMilli: 1000 }]).map((pl) => ({
      id: placementSeq++,
      projectItemId: id,
      zoneId: pl.zoneId,
      qtyMilli: pl.qtyMilli,
      sortOrder: 0,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    }))
    const created = itemRow(
      {
        projectId: project.id,
        itemCode: `LUM-${String(id).padStart(3, '0')}`,
        productId: product?.id ?? null,
        categoryId: (p.categoryId as number | null) ?? product?.categoryId ?? 1,
        supplierId: (p.supplierId as number | null) ?? product?.supplierId ?? null,
        name: (p.name as string | null) ?? product?.name ?? 'Ligne',
        kind: (p.kind as ProjectItemRead['kind']) ?? 'ffe',
        unit: product?.unit ?? 'piece',
        finish: product?.finish ?? null,
        unitCostCents: (p.unitCostCents as number | null) ?? product?.listPriceCents ?? 0,
        currency,
        fxRateMicro:
          (p.fxRateMicro as number | null) ?? (currency === 'EUR' ? 1_000_000 : (state.items.find((i) => i.currency === currency)?.fxRateMicro ?? 1_000_000)),
        discountBp: (p.discountBp as number | null) ?? supplier?.defaultDiscountBp ?? 0,
        leadTimeWeeks: product?.leadTimeWeeks ?? null,
        placements,
      },
      id,
    )
    state.items.push(created)
    return json(201, created)
  }
  if (sub === 'summary' && method === 'GET') return json(200, summaryOf(state, project.id))
  if (sub === 'exports' && method === 'GET')
    return json(
      200,
      state.exports.filter((e) => e.projectId === project.id),
    )
  if (sub === 'purchase-orders' && method === 'GET')
    return json(
      200,
      state.purchaseOrders.filter((o) => o.projectId === project.id),
    )
  if (sub === 'purchase-orders' && method === 'POST') {
    if (CLOSED.includes(project.status)) return readOnly()
    const q = body as { supplierId: number; itemIds: number[]; expectedDeliveryOn: string | null }
    const supplier = state.suppliers.find((s) => s.id === q.supplierId)
    if (!supplier) return validation('supplierId', 'Fournisseur introuvable.')
    const year = 2026
    const count = state.purchaseOrders.filter((o) => o.number.startsWith(`PO-${year}-`)).length + 1
    const first = state.items.find((i) => i.id === q.itemIds[0])
    const po: PoRead = {
      id: state.purchaseOrders.length + 1,
      projectId: project.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      number: `PO-${year}-${String(count).padStart(3, '0')}`,
      status: 'draft',
      currency: supplier.currency,
      fxRateMicro: supplier.currency === 'EUR' ? 1_000_000 : (first?.fxRateMicro ?? 1_000_000),
      issuedOn: null,
      expectedDeliveryOn: q.expectedDeliveryOn,
      supplierRef: null,
      deliveryAddress: project.deliveryAddress ?? project.siteAddress,
      deliveryContact: project.deliveryContact,
      paymentTerms: null,
      notes: null,
      internalNotes: null,
      totalCents: 0,
      totalEurCents: 0,
      vatByRateBp: {},
      vatCents: 0,
      ttcEurCents: 0,
      invoicedHtCents: 0,
      paidHtCents: 0,
      deliveriesCount: 0,
      lines: [],
      files: [],
      createdAt: NOW,
      updatedAt: NOW,
    }
    for (const [index, itemId] of q.itemIds.entries()) {
      const problem = poLineProblem(state, po, itemId)
      if (problem) return validation(`itemIds.${index}`, problem)
      po.lines.push(poLineRow(state, po, itemId))
    }
    poTotals(po)
    state.purchaseOrders.push(po)
    return json(201, po)
  }
  if (sub === 'quotes' && method === 'GET')
    return json(
      200,
      state.quotes.filter((q) => q.projectId === project.id),
    )
  if (sub === 'quotes' && method === 'POST') {
    if (CLOSED.includes(project.status)) return readOnly()
    const q = body as {
      supplierId: number
      reference: string
      quotedOn: string | null
      validUntil: string | null
      currency: string | null
      fxRateMicro: number | null
    }
    const supplier = state.suppliers.find((s) => s.id === q.supplierId)
    if (!supplier) return validation('supplierId', 'Fournisseur introuvable.')
    if (state.quotes.some((x) => x.projectId === project.id && x.supplierId === q.supplierId && x.reference === q.reference.trim()))
      return validation('reference', 'Ce fournisseur a déjà un devis portant cette référence dans le projet.')
    const currency = q.currency ?? supplier.currency
    const known = state.items.find((i) => i.projectId === project.id && i.currency === currency)?.fxRateMicro
    const fx = currency === 'EUR' ? 1_000_000 : (q.fxRateMicro ?? known)
    if (fx === undefined) return validation('fxRateMicro', 'Un taux de change est nécessaire pour une devise autre que l’euro.')
    const quote: QuoteRead = {
      id: state.quotes.length + 1,
      projectId: project.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      reference: q.reference.trim(),
      quotedOn: q.quotedOn,
      validUntil: q.validUntil,
      currency,
      fxRateMicro: fx,
      declinedAt: null,
      notes: null,
      retainedCount: 0,
      lines: [],
      files: [],
      createdAt: NOW,
      updatedAt: NOW,
    }
    state.quotes.push(quote)
    return json(201, quote)
  }
  if (sub === 'budget-lines' && method === 'GET')
    return json(
      200,
      state.budgets.filter((b) => b.projectId === project.id),
    )
  if (sub === 'budget-lines' && method === 'PUT') {
    if (CLOSED.includes(project.status)) return readOnly()
    const incoming = (body as { lines: { zoneId: number | null; categoryId: number | null; amountCents: number; notes: string | null }[] }).lines
    const scopes = new Set<string>()
    for (const l of incoming) {
      const scope = `${l.zoneId ?? 'n'}:${l.categoryId ?? 'n'}`
      if (scopes.has(scope)) return error(409, 'conflict', 'Deux budgets pour le même périmètre (projet, zone, catégorie).')
      scopes.add(scope)
    }
    state.budgets = state.budgets.filter((b) => b.projectId !== project.id)
    incoming.forEach((l, i) =>
      state.budgets.push({
        id: 100 + i,
        projectId: project.id,
        zoneId: l.zoneId,
        categoryId: l.categoryId,
        amountCents: l.amountCents,
        notes: l.notes,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    return json(
      200,
      state.budgets.filter((b) => b.projectId === project.id),
    )
  }
  if (sub === 'alerts' && method === 'GET') {
    const s = summaryOf(state, project.id)
    const found: {
      kind: 'budget_90' | 'budget_100' | 'order_overdue'
      message: string
      zoneId: number | null
      categoryId: number | null
      projectItemId: number | null
    }[] = []
    const b = s.budget
    if (b && b.alert !== 'none')
      found.push({
        kind: b.alert === 'over' ? 'budget_100' : 'budget_90',
        message: `Projet : prescrit à ${b.alert === 'over' ? 100 : 90} % du budget ou plus.`,
        zoneId: null,
        categoryId: null,
        projectItemId: null,
      })
    for (const r of b?.byZone ?? [])
      if (r.alert !== 'none')
        found.push({
          kind: r.alert === 'over' ? 'budget_100' : 'budget_90',
          message: `${r.label} : prescrit à ${r.alert === 'over' ? 100 : 90} % du budget ou plus.`,
          zoneId: r.zoneId,
          categoryId: null,
          projectItemId: null,
        })
    for (const l of s.lines)
      if (l.orderOverdue)
        found.push({
          kind: 'order_overdue',
          message: `${l.itemCode} : à commander avant le ${l.orderBy}, date dépassée.`,
          zoneId: null,
          categoryId: null,
          projectItemId: l.projectItemId,
        })
    return json(200, found)
  }
  if (sub === 'zones' && method === 'GET') {
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    return json(
      200,
      state.zones.filter((z) => z.projectId === project.id && (includeArchived || z.archivedAt === null)).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }
  if (sub === 'zones' && method === 'POST') {
    if (CLOSED.includes(project.status)) return readOnly()
    const z = body as Partial<ZoneRead>
    if (!(z.code ?? '').trim()) return validation('code', 'Champ obligatoire.')
    if (!(z.name ?? '').trim()) return validation('name', 'Champ obligatoire.')
    if (state.zones.some((o) => o.projectId === project.id && o.code.toLowerCase() === z.code!.toLowerCase()))
      return validation('code', 'Une zone de ce projet porte déjà ce code.')
    const last = Math.max(0, ...state.zones.filter((o) => o.projectId === project.id).map((o) => o.sortOrder))
    const created = zoneRow({ ...z, projectId: project.id, sortOrder: z.sortOrder ?? last + 10 }, state.zones.length + 1)
    state.zones.push(created)
    return json(201, created)
  }
  if (sub === 'zones/reorder' && method === 'POST') {
    const ids = (body as { zoneIds: number[] }).zoneIds
    ids.forEach((zoneId, index) => {
      const zone = state.zones.find((o) => o.id === zoneId)
      if (zone) zone.sortOrder = (index + 1) * 10
    })
    return json(
      200,
      state.zones.filter((z) => z.projectId === project.id && z.archivedAt === null).sort((a, b) => a.sortOrder - b.sortOrder),
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

function handleZones(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(archive|unarchive))?$/.exec(rest ?? '')
  if (!match) return undefined
  const zone = state.zones.find((z) => z.id === Number(match[1]))
  if (!zone) return error(404, 'not_found', `Zone n° ${match[1]} introuvable.`)
  const action = match[2]
  if (action === 'archive') zone.archivedAt = NOW
  else if (action === 'unarchive') zone.archivedAt = null
  else if (method === 'PATCH') Object.assign(zone, body, { updatedAt: LATER })
  else if (method === 'DELETE') {
    state.zones = state.zones.filter((z) => z.id !== zone.id)
    return new Response(null, { status: 204 })
  }
  return json(200, zone)
}

export function itemRow(i: Partial<ProjectItemRead>, id: number): ProjectItemRead {
  return {
    id,
    projectId: 1,
    itemCode: `LUM-${String(id).padStart(3, '0')}`,
    categoryId: 1,
    productId: null,
    supplierId: null,
    name: 'Ligne',
    clientDescription: null,
    kind: 'ffe',
    unit: 'piece',
    finish: null,
    color: null,
    materials: null,
    widthMm: null,
    depthMm: null,
    heightMm: null,
    diameterMm: null,
    unitCostCents: 0,
    currency: 'EUR',
    fxRateMicro: 1_000_000,
    discountBp: 0,
    vatRateBp: 2000,
    leadTimeWeeks: null,
    requiredOnSite: null,
    quotedOn: null,
    quoteValidUntil: null,
    expectedDeliveryOn: null,
    quoteRef: null,
    orderRef: null,
    status: 'draft',
    onHold: false,
    replacedById: null,
    approvedAt: null,
    approvedUnitNetCents: null,
    approvedTotalQtyMilli: null,
    sortOrder: 0,
    internalNotes: null,
    createdAt: NOW,
    updatedAt: NOW,
    placements: [],
    files: [],
    ...i,
  }
}

// Integer formulas of money.py, replicated so the fake summary matches the real API.
const divRound = (n: number, d: number) => Math.floor((n + Math.floor(d / 2)) / d)
const addDays = (iso: string, days: number) => new Date(new Date(iso + 'T00:00:00Z').getTime() + days * 86_400_000).toISOString().slice(0, 10)
let placementSeq = 1000

function summaryOf(state: FakeApi, projectId: number): ProjectSummaryRead {
  const zones = state.zones.filter((z) => z.projectId === projectId)
  const mult = (zoneId: number | null) => zones.find((z) => z.id === zoneId)?.multiplier ?? 1
  const lines = state.items.filter((i) => i.projectId === projectId)
  const zoneTotals = new Map<number | null, number>()
  let specified = 0
  let approved = 0
  let ose = 0
  const result = lines.map((i) => {
    const qty = i.placements.reduce((sum, p) => sum + p.qtyMilli * mult(p.zoneId), 0)
    const counted = i.status !== 'cancelled' && i.status !== 'replaced'
    const amountCounted = counted && i.kind !== 'existing'
    const net = i.kind === 'existing' ? 0 : divRound(i.unitCostCents * (10000 - i.discountBp), 10000)
    const eur = i.kind === 'existing' ? 0 : divRound(net * i.fxRateMicro, 1_000_000)
    const total = i.kind === 'existing' ? 0 : divRound(eur * qty, 1000)
    const approvedCents =
      i.approvedUnitNetCents !== null && i.approvedTotalQtyMilli !== null ? divRound(i.approvedUnitNetCents * i.approvedTotalQtyMilli, 1000) : null
    if (amountCounted) {
      if (i.kind === 'ose') ose += total
      else {
        specified += total
        if (approvedCents !== null && ['approved', 'ordered', 'delivered', 'installed'].includes(i.status)) approved += approvedCents
        for (const p of i.placements) zoneTotals.set(p.zoneId, (zoneTotals.get(p.zoneId) ?? 0) + divRound(eur * p.qtyMilli * mult(p.zoneId), 1000))
      }
    }
    const orderBy =
      i.requiredOnSite && i.leadTimeWeeks !== null && i.kind !== 'fee' && counted && !['ordered', 'delivered', 'installed'].includes(i.status)
        ? addDays(i.requiredOnSite, -(i.leadTimeWeeks * 7 + 14))
        : null
    const orderOverdue = orderBy !== null && orderBy <= '2026-10-10' && !i.onHold
    return {
      projectItemId: i.id,
      itemCode: i.itemCode,
      status: i.status,
      kind: i.kind,
      counted,
      amountCounted,
      totalQtyMilli: qty,
      netUnitCents: net,
      netUnitEurCents: eur,
      totalHtCents: total,
      approvedCents,
      orderBy,
      orderOverdue,
    }
  })
  const vat = divRound(specified * 2000, 10000)
  const zoneRows: ProjectSummaryRead['zones'] = zones.map((z) => ({
    zoneId: z.id,
    zoneCode: z.code,
    zoneName: z.name,
    multiplier: z.multiplier,
    specifiedCents: zoneTotals.get(z.id) ?? 0,
  }))
  if (zoneTotals.get(null)) zoneRows.push({ zoneId: null, zoneCode: null, zoneName: 'Non affecté', multiplier: 1, specifiedCents: zoneTotals.get(null)! })
  const budgets = state.budgets.filter((b) => b.projectId === projectId)
  const find = (zoneId: number | null, categoryId: number | null) =>
    budgets.find((b) => b.zoneId === zoneId && b.categoryId === categoryId)?.amountCents ?? null
  const alertOf = (budget: number | null, spec: number): BudgetRowRead['alert'] =>
    budget === null || budget === 0 ? 'none' : spec * 10000 >= budget * 10000 ? 'over' : spec * 10000 >= budget * 9000 ? 'warning' : 'none'
  const row = (zoneId: number | null, categoryId: number | null, label: string, multiplier: number, spec: number, appr: number): BudgetRowRead => {
    const b = find(zoneId, categoryId)
    return {
      zoneId,
      categoryId,
      label,
      multiplier,
      budgetCents: b,
      specifiedCents: spec,
      approvedCents: appr,
      engagedCents: engagedOf(state, zoneId, categoryId),
      remainingCents: b === null ? null : b - spec,
      alert: alertOf(b, spec),
    }
  }
  const globalCents = find(null, null)
  const contingencyBp = state.projects.find((p) => p.id === projectId)?.contingencyBp ?? 0
  const budget: ProjectSummaryRead['budget'] = {
    globalCents,
    contingencyBp,
    contingencyCents: globalCents === null ? 0 : divRound(globalCents * contingencyBp, 10000),
    specifiedCents: specified,
    approvedCents: approved,
    engagedCents: engagedOf(state, null, null),
    invoicedCents: invoicedOf(state, false),
    paidCents: invoicedOf(state, true),
    remainingCents: globalCents === null ? null : globalCents - specified,
    alert: alertOf(globalCents, specified),
    byZone: zoneRows.map((z) => row(z.zoneId, null, z.zoneName, z.multiplier, z.specifiedCents, 0)),
    byCategory: [],
  }
  return {
    projectId,
    lines: result,
    zones: zoneRows,
    specifiedCents: specified,
    approvedCents: approved,
    oseCents: ose,
    vatByRateBp: { 2000: vat },
    vatCents: vat,
    ttcCents: specified + vat,
    budget,
  }
}

function handleItems(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const item = state.items.find((i) => i.id === Number(match[1]))
  if (!item) return error(404, 'not_found', `Ligne n° ${match[1]} introuvable.`)
  const sub = match[2]
  const payload = (body ?? {}) as Record<string, unknown>
  if (!sub && method === 'GET') return json(200, item)
  if (!sub && method === 'PATCH') {
    if (typeof payload.fxRateMicro === 'number' && payload.currency === 'EUR' && payload.fxRateMicro !== 1_000_000)
      return validation('fxRateMicro', 'En euros, le taux de change vaut 1 000 000 (parité).')
    Object.assign(item, payload, { updatedAt: LATER })
    return json(200, item)
  }
  if (!sub && method === 'DELETE') {
    if (item.status !== 'draft') return error(409, 'conflict', 'Seul un brouillon sans historique se supprime ; annuler la ligne sinon.')
    state.items = state.items.filter((i) => i.id !== item.id)
    return new Response(null, { status: 204 })
  }
  if (sub === 'placements' && method === 'POST') {
    const p = payload as { zoneId: number | null; qtyMilli: number }
    if (item.placements.some((x) => x.zoneId === p.zoneId)) return validation('zoneId', 'La ligne est déjà placée dans cette zone.')
    if (item.unit === 'piece' && p.qtyMilli % 1000) return validation('qtyMilli', 'Quantité entière attendue pour cette unité (multiple de 1 000 millièmes).')
    item.placements.push({
      id: placementSeq++,
      projectItemId: item.id,
      zoneId: p.zoneId,
      qtyMilli: p.qtyMilli,
      sortOrder: 0,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    })
    return json(201, item)
  }
  if (sub === 'status' && method === 'POST') {
    const s = payload as { status: ProjectItemRead['status']; note?: string | null }
    if (s.status === 'cancelled' && !s.note) return validation('note', 'Une note est obligatoire pour cette transition.')
    if (['ordered', 'delivered', 'installed'].includes(item.status) && s.status === 'draft')
      return error(409, 'conflict', 'Commandée ou au-delà : aucun retour en arrière, seulement « annulé » avec une note.')
    if (s.status === 'ordered' && !item.orderRef) return validation('orderRef', 'Une référence de commande est nécessaire pour passer en « commandé ».')
    const previous = item.status
    state.events.push({
      id: state.events.length + 1,
      projectItemId: item.id,
      kind: 'status',
      fromStatus: previous,
      toStatus: s.status,
      oldValue: null,
      newValue: null,
      changedAt: LATER,
      note: s.note ?? null,
    })
    item.status = s.status
    if (s.status === 'approved') {
      const zones = state.zones
      const qty = item.placements.reduce((sum, p) => sum + p.qtyMilli * (zones.find((z) => z.id === p.zoneId)?.multiplier ?? 1), 0)
      item.approvedAt = NOW
      item.approvedUnitNetCents = divRound(divRound(item.unitCostCents * (10000 - item.discountBp), 10000) * item.fxRateMicro, 1_000_000)
      item.approvedTotalQtyMilli = qty
      state.events.push({
        id: state.events.length + 1,
        projectItemId: item.id,
        kind: 'approval',
        fromStatus: previous,
        toStatus: 'approved',
        oldValue: null,
        newValue: JSON.stringify({ unitNetEur: item.approvedUnitNetCents, qty }),
        changedAt: LATER,
        note: null,
      })
    }
    return json(200, item)
  }
  if (sub === 'quotes' && method === 'GET')
    return json(
      200,
      state.quotes.flatMap((q) =>
        q.lines
          .filter((l) => l.projectItemId === item.id)
          .map((l) => ({
            quoteId: q.id,
            quoteLineId: l.id,
            supplierId: q.supplierId,
            supplierName: q.supplierName,
            reference: q.reference,
            quotedOn: q.quotedOn,
            validUntil: q.validUntil,
            currency: q.currency,
            fxRateMicro: q.fxRateMicro,
            unitCostCents: l.unitCostCents,
            discountBp: l.discountBp,
            leadTimeWeeks: l.leadTimeWeeks,
            description: l.description,
            netUnitCents: l.netUnitCents,
            netUnitEurCents: l.netUnitEurCents,
            retained: l.retainedAt !== null,
            declined: q.declinedAt !== null,
          })),
      ),
    )
  if (sub === 'events' && method === 'GET')
    return json(200, [
      { id: 0, projectItemId: item.id, kind: 'created', fromStatus: null, toStatus: 'draft', oldValue: null, newValue: null, changedAt: NOW, note: null },
      ...state.events.filter((e) => e.projectItemId === item.id),
    ])
  if (sub === 'replace' && method === 'POST') {
    if (item.status !== 'approved') return error(409, 'conflict', 'Le remplacement n’est possible que depuis « validé ».')
    const r = payload as { productId: number; note?: string | null }
    const product = state.products.find((x) => x.id === r.productId)
    if (!product) return validation('productId', 'Produit introuvable.')
    const created = itemRow(
      {
        projectId: item.projectId,
        itemCode: item.itemCode,
        productId: product.id,
        name: product.name,
        status: 'specified',
        unitCostCents: product.listPriceCents ?? 0,
        currency: product.listPriceCurrency,
        fxRateMicro: item.fxRateMicro,
        placements: item.placements,
      },
      state.items.length + 1,
    )
    item.itemCode = `${item.itemCode}.R1`
    item.status = 'replaced'
    item.replacedById = created.id
    item.placements = []
    state.items.push(created)
    return json(201, created)
  }
  if (sub === 'refresh' && method === 'POST') return json(200, item)
  return undefined
}

function handlePlacements(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const id = Number(rest)
  const item = state.items.find((i) => i.placements.some((p) => p.id === id))
  const placement = item?.placements.find((p) => p.id === id)
  if (!item || !placement) return error(404, 'not_found', 'Placement introuvable.')
  if (method === 'PATCH') {
    Object.assign(placement, body)
    return json(200, item)
  }
  if (method === 'DELETE') {
    if (item.placements.length <= 1) return error(409, 'conflict', 'Une ligne garde au moins un placement : modifier celui-ci plutôt que le supprimer.')
    item.placements = item.placements.filter((p) => p.id !== id)
    return json(200, item)
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
    projects?: Partial<ProjectRead>[]
    zones?: Partial<ZoneRead>[]
    items?: Partial<ProjectItemRead>[]
    budgets?: Partial<BudgetLineRead>[]
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
    projects: (seed.projects ?? []).map((p, i) => projectRow(p, i + 1)),
    zones: (seed.zones ?? []).map((z, i) => zoneRow(z, i + 1)),
    items: (seed.items ?? []).map((it, i) => itemRow(it, i + 1)),
    events: [],
    budgets: (seed.budgets ?? []).map((b, i) => ({
      id: i + 1,
      projectId: 1,
      zoneId: null,
      categoryId: null,
      amountCents: 0,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...b,
    })),
    setting: {
      id: 1,
      defaultVatBp: 2000,
      baseCurrency: 'EUR',
      seedCategoryVersion: 1,
      projectCodePrefix: '',
      defaultContingencyBp: 1000,
      agencyName: '',
      agencyAddress: null,
      agencyEmail: null,
      agencyPhone: null,
      agencySiret: null,
      agencyVatNumber: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    lastBackupAt: null,
    backupDirOk: true,
    quotes: [],
    purchaseOrders: [],
    deliveries: [],
    invoices: [],
    exports: [],
    importBatches: [],
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
        schemaRevision: '0007',
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
      if (typeof patch.agencySiret === 'string' && !/^[0-9]{14}$/.test(patch.agencySiret.replace(/ /g, '')))
        return json(422, {
          code: 'validation_error',
          message: 'Données invalides.',
          details: [{ field: 'agencySiret', message: 'Format attendu : 14 chiffres.' }],
        })
      Object.assign(state.setting, patch, { updatedAt: LATER })
      if (typeof patch.agencySiret === 'string') state.setting.agencySiret = patch.agencySiret.replace(/ /g, '')
      return json(200, state.setting)
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
    if (url.pathname.startsWith('/api/v1/imports/products/')) return handleImports(state, url, method, request)
    const route =
      /^\/api\/v1\/(clients|suppliers|manufacturers|categories|products|files|projects|zones|project-items|placements|dashboard|quotes|quote-lines|purchase-orders|purchase-order-lines|deliveries|invoices)(?:\/(.+))?$/.exec(
        url.pathname,
      )
    if (route) {
      const [, collection, rest] = route
      let response: Response | undefined
      if (collection === 'clients') response = handleNamed(state.clients, clientRow, false, url, method, rest, body)
      if (collection === 'suppliers') response = handleNamed(state.suppliers, supplierRow, true, url, method, rest, body)
      if (collection === 'manufacturers') response = handleNamed(state.manufacturers, manufacturerRow, true, url, method, rest, body)
      if (collection === 'categories') response = handleCategories(state.categories, url, method, rest, body)
      if (collection === 'products') response = handleProducts(state, url, method, rest, body)
      if (collection === 'files') response = await handleFiles(state, request, method, rest)
      if (collection === 'projects') response = handleProjects(state, url, method, rest, body)
      if (collection === 'zones') response = handleZones(state, method, rest, body)
      if (collection === 'project-items') response = handleItems(state, method, rest, body)
      if (collection === 'placements') response = handlePlacements(state, method, rest, body)
      if (collection === 'quotes') response = handleQuotes(state, method, rest, body)
      if (collection === 'quote-lines') response = handleQuoteLines(state, method, rest, body)
      if (collection === 'purchase-orders') response = handlePurchaseOrders(state, method, rest, body)
      if (collection === 'purchase-order-lines') response = handlePurchaseOrderLines(state, method, rest, body)
      if (collection === 'deliveries') response = handleDeliveries(state, method, rest)
      if (collection === 'invoices') response = handleInvoices(state, method, rest, body)
      if (collection === 'dashboard' && method === 'GET') {
        response = json(
          200,
          state.projects
            .filter((p) => !CLOSED.includes(p.status))
            .map((p) => {
              const s = summaryOf(state, p.id)
              const items = state.items.filter((i) => i.projectId === p.id)
              return {
                projectId: p.id,
                code: p.code,
                name: p.name,
                status: p.status,
                clientName: state.clients.find((c) => c.id === p.clientId)?.name ?? '',
                dueOn: p.dueOn,
                budgetCents: s.budget?.globalCents ?? null,
                specifiedCents: s.specifiedCents,
                approvedCents: s.approvedCents,
                remainingCents: s.budget?.remainingCents ?? null,
                alert: s.budget?.alert ?? 'none',
                draftLines: items.filter((i) => i.status === 'draft').length,
                onHoldLines: items.filter((i) => i.onHold).length,
                overdueLines: s.lines.filter((l) => l.orderOverdue).length,
              }
            }),
        )
      }
      if (response) return response
    }
    return error(404, 'not_found', `Route inconnue : ${method} ${url.pathname}`)
  }

  return state
}

let quoteLineSeq = 1

function quoteLineRow(
  state: FakeApi,
  quote: QuoteRead,
  l: { projectItemId: number; unitCostCents: number; discountBp?: number; leadTimeWeeks?: number | null },
): QuoteLineRead {
  const item = state.items.find((i) => i.id === l.projectItemId)!
  const net = divRound(l.unitCostCents * (10000 - (l.discountBp ?? 0)), 10000)
  return {
    id: quoteLineSeq++,
    quoteId: quote.id,
    projectItemId: item.id,
    itemCode: item.itemCode,
    itemName: item.name,
    unitCostCents: l.unitCostCents,
    discountBp: l.discountBp ?? 0,
    leadTimeWeeks: l.leadTimeWeeks ?? null,
    description: null,
    notes: null,
    retainedAt: null,
    netUnitCents: net,
    netUnitEurCents: divRound(net * quote.fxRateMicro, 1_000_000),
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function handleQuotes(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const quote = state.quotes.find((q) => q.id === Number(match[1]))
  if (!quote) return error(404, 'not_found', `Devis n° ${match[1]} introuvable.`)
  const sub = match[2]
  if (!sub && method === 'GET') return json(200, quote)
  if (!sub && method === 'PATCH') {
    Object.assign(quote, body, { updatedAt: LATER })
    return json(200, quote)
  }
  if (!sub && method === 'DELETE') {
    if (quote.retainedCount > 0) return error(409, 'conflict', 'Ce devis a une ligne retenue : l’écarter plutôt que le supprimer.')
    state.quotes = state.quotes.filter((q) => q.id !== quote.id)
    return new Response(null, { status: 204 })
  }
  if (sub === 'decline' && method === 'POST') {
    quote.declinedAt = LATER
    return json(200, quote)
  }
  if (sub === 'lines' && method === 'POST') {
    const l = body as { projectItemId: number; unitCostCents: number; discountBp?: number; leadTimeWeeks?: number | null }
    const item = state.items.find((i) => i.id === l.projectItemId)
    if (!item || item.projectId !== quote.projectId) return validation('projectItemId', 'La ligne n’appartient pas à ce projet.')
    if (quote.lines.some((x) => x.projectItemId === l.projectItemId)) return validation('projectItemId', 'Ce devis a déjà une ligne pour cet article.')
    quote.lines.push(quoteLineRow(state, quote, l))
    quote.updatedAt = LATER
    return json(201, quote)
  }
  if (sub === 'files' && method === 'POST') {
    const f = body as { fileId: number; caption: string | null }
    const file = state.files.find((x) => x.id === f.fileId)
    if (!file) return error(404, 'not_found', `Fichier n° ${f.fileId} introuvable.`)
    quote.files.push({
      fileId: file.id,
      caption: f.caption,
      sha256: file.sha256,
      ext: file.ext,
      mimeType: file.mimeType,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
    })
    return json(201, quote)
  }
  const fileMatch = /^files\/(\d+)$/.exec(sub ?? '')
  if (fileMatch && method === 'DELETE') {
    quote.files = quote.files.filter((f) => f.fileId !== Number(fileMatch[1]))
    return json(200, quote)
  }
  return undefined
}

function handleQuoteLines(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const quote = state.quotes.find((q) => q.lines.some((l) => l.id === Number(match[1])))
  const line = quote?.lines.find((l) => l.id === Number(match[1]))
  if (!quote || !line) return error(404, 'not_found', `Ligne de devis n° ${match[1]} introuvable.`)
  const sub = match[2]
  if (!sub && method === 'PATCH') {
    Object.assign(line, body, { updatedAt: LATER })
    line.netUnitCents = divRound(line.unitCostCents * (10000 - line.discountBp), 10000)
    line.netUnitEurCents = divRound(line.netUnitCents * quote.fxRateMicro, 1_000_000)
    return json(200, quote)
  }
  if (!sub && method === 'DELETE') {
    if (line.retainedAt) return error(409, 'conflict', 'Cette ligne de devis est retenue : retenir une autre ligne avant de la supprimer.')
    quote.lines = quote.lines.filter((l) => l.id !== line.id)
    return json(200, quote)
  }
  if (sub === 'retain' && method === 'POST') {
    if (quote.declinedAt) return error(409, 'conflict', 'Ce devis est écarté.')
    const item = state.items.find((i) => i.id === line.projectItemId)!
    if (['ordered', 'delivered', 'installed'].includes(item.status))
      return error(409, 'conflict', 'Ligne commandée : commandée ou au-delà, un devis ne se retient plus.')
    for (const q of state.quotes)
      for (const l of q.lines)
        if (l.projectItemId === item.id && l.retainedAt) {
          l.retainedAt = null
          q.retainedCount -= 1
        }
    line.retainedAt = LATER
    quote.retainedCount += 1
    const before = JSON.stringify({ cost: item.unitCostCents, currency: item.currency, fx: item.fxRateMicro, discount: item.discountBp, vat: item.vatRateBp })
    Object.assign(item, {
      supplierId: quote.supplierId,
      unitCostCents: line.unitCostCents,
      discountBp: line.discountBp,
      currency: quote.currency,
      fxRateMicro: quote.fxRateMicro,
      leadTimeWeeks: line.leadTimeWeeks ?? item.leadTimeWeeks,
      quotedOn: quote.quotedOn,
      quoteValidUntil: quote.validUntil,
      quoteRef: quote.reference,
      updatedAt: LATER,
    })
    const after = JSON.stringify({ cost: item.unitCostCents, currency: item.currency, fx: item.fxRateMicro, discount: item.discountBp, vat: item.vatRateBp })
    state.events.push({
      id: state.events.length + 1,
      projectItemId: item.id,
      kind: 'quote',
      fromStatus: null,
      toStatus: null,
      oldValue: before,
      newValue: after,
      changedAt: LATER,
      note: `Devis ${quote.reference} (${quote.supplierName}) retenu.`,
    })
    if (['draft', 'specified'].includes(item.status)) {
      state.events.push({
        id: state.events.length + 1,
        projectItemId: item.id,
        kind: 'status',
        fromStatus: item.status,
        toStatus: 'quoted',
        oldValue: null,
        newValue: null,
        changedAt: LATER,
        note: null,
      })
      item.status = 'quoted'
    }
    return json(200, item)
  }
  return undefined
}

let poLineSeq = 1

function engagedOf(state: FakeApi, zoneId: number | null, categoryId: number | null): number {
  let total = 0
  for (const po of state.purchaseOrders) {
    if (!['issued', 'acknowledged', 'partially_delivered', 'closed'].includes(po.status)) continue
    for (const line of po.lines) {
      const item = state.items.find((i) => i.id === line.projectItemId)
      if (!item) continue
      if (categoryId !== null && item.categoryId !== categoryId) continue
      if (zoneId === null) total += line.totalEurCents
      else
        for (const p of item.placements)
          if (p.zoneId === zoneId) total += divRound(line.netUnitEurCents * p.qtyMilli * (state.zones.find((z) => z.id === zoneId)?.multiplier ?? 1), 1000)
    }
  }
  return total
}

function poLineProblem(state: FakeApi, po: PoRead, itemId: number): string | null {
  const item = state.items.find((i) => i.id === itemId)
  if (!item || item.projectId !== po.projectId) return 'La ligne n’appartient pas à ce projet.'
  if (item.supplierId !== po.supplierId) return `La ligne ${item.itemCode} n’est pas chez ce fournisseur.`
  if (item.status !== 'approved') return `La ligne ${item.itemCode} doit être validée (statut « validé ») pour être commandée.`
  return null
}

function poLineRow(state: FakeApi, po: PoRead, itemId: number): PoLineRead {
  const item = state.items.find((i) => i.id === itemId)!
  const qty = item.placements.reduce((sum, p) => sum + p.qtyMilli * (state.zones.find((z) => z.id === p.zoneId)?.multiplier ?? 1), 0)
  const line: PoLineRead = {
    id: poLineSeq++,
    purchaseOrderId: po.id,
    projectItemId: item.id,
    itemCode: item.itemCode,
    itemStatus: item.status,
    description: item.name,
    qtyMilli: qty,
    unitCostCents: item.unitCostCents,
    discountBp: item.discountBp,
    vatRateBp: item.vatRateBp,
    sortOrder: po.lines.length,
    netUnitCents: 0,
    totalCents: 0,
    netUnitEurCents: 0,
    totalEurCents: 0,
    receivedQtyMilli: 0,
  }
  poLineAmounts(po, line)
  return line
}

function poLineAmounts(po: PoRead, line: PoLineRead): void {
  line.netUnitCents = divRound(line.unitCostCents * (10000 - line.discountBp), 10000)
  line.totalCents = divRound(line.netUnitCents * line.qtyMilli, 1000)
  line.netUnitEurCents = divRound(line.netUnitCents * po.fxRateMicro, 1_000_000)
  line.totalEurCents = divRound(line.netUnitEurCents * line.qtyMilli, 1000)
}

function poTotals(po: PoRead): void {
  po.totalCents = po.lines.reduce((s, l) => s + l.totalCents, 0)
  po.totalEurCents = po.lines.reduce((s, l) => s + l.totalEurCents, 0)
  po.vatCents = divRound(po.totalEurCents * 2000, 10000)
  po.vatByRateBp = { 2000: po.vatCents }
  po.ttcEurCents = po.totalEurCents + po.vatCents
}

function handlePurchaseOrders(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const po = state.purchaseOrders.find((o) => o.id === Number(match[1]))
  if (!po) return error(404, 'not_found', `Bon de commande n° ${match[1]} introuvable.`)
  const sub = match[2]
  const notDraft = () => error(409, 'conflict', `Bon de commande ${po.number} ${po.status} : seules les modifications du brouillon sont possibles.`)
  if (!sub && method === 'GET') return json(200, po)
  if (!sub && method === 'PATCH') {
    Object.assign(po, body, { updatedAt: LATER })
    return json(200, po)
  }
  if (!sub && method === 'DELETE') {
    if (po.status !== 'draft') return notDraft()
    state.purchaseOrders = state.purchaseOrders.filter((o) => o.id !== po.id)
    return new Response(null, { status: 204 })
  }
  if (sub === 'issue' && method === 'POST') {
    if (po.status !== 'draft') return notDraft()
    if (po.lines.length === 0) return validation('lines', 'Un bon de commande s’émet avec au moins une ligne.')
    for (const line of po.lines) {
      const item = state.items.find((i) => i.id === line.projectItemId)!
      if (item.status !== 'approved') return error(409, 'conflict', `La ligne ${item.itemCode} doit être validée (statut « validé ») pour être commandée.`)
      item.orderRef = po.number
      if (po.expectedDeliveryOn) item.expectedDeliveryOn = po.expectedDeliveryOn
      state.events.push({
        id: state.events.length + 1,
        projectItemId: item.id,
        kind: 'status',
        fromStatus: 'approved',
        toStatus: 'ordered',
        oldValue: null,
        newValue: null,
        changedAt: LATER,
        note: po.number,
      })
      item.status = 'ordered'
      line.itemStatus = 'ordered'
    }
    po.status = 'issued'
    po.issuedOn = '2026-10-10'
    return json(200, po)
  }
  if (sub === 'status' && method === 'POST') {
    const s = body as { status: PoRead['status']; note: string | null }
    if (s.status === 'cancelled' && po.status !== 'draft') {
      if (!s.note?.trim()) return validation('note', 'Une note est obligatoire pour annuler un bon de commande émis.')
      for (const line of po.lines) {
        const item = state.items.find((i) => i.id === line.projectItemId)!
        state.events.push({
          id: state.events.length + 1,
          projectItemId: item.id,
          kind: 'status',
          fromStatus: item.status,
          toStatus: 'cancelled',
          oldValue: null,
          newValue: null,
          changedAt: LATER,
          note: `BC ${po.number} annulé : ${s.note.trim()}`,
        })
        item.status = 'cancelled'
        line.itemStatus = 'cancelled'
      }
    }
    po.status = s.status
    return json(200, po)
  }
  if (sub === 'lines' && method === 'POST') {
    if (po.status !== 'draft') return notDraft()
    for (const [index, itemId] of (body as { itemIds: number[] }).itemIds.entries()) {
      const problem = poLineProblem(state, po, itemId)
      if (problem) return validation(`itemIds.${index}`, problem)
      po.lines.push(poLineRow(state, po, itemId))
    }
    poTotals(po)
    return json(201, po)
  }
  if (sub === 'deliveries' && method === 'GET')
    return json(
      200,
      state.deliveries.filter((d) => d.purchaseOrderId === po.id),
    )
  if (sub === 'deliveries' && method === 'POST') {
    if (po.status === 'draft' || po.status === 'cancelled')
      return error(409, 'conflict', `Bon de commande ${po.number} ${po.status} : réception possible après émission seulement.`)
    const d = body as { receivedOn: string; reference: string | null; lines: { purchaseOrderLineId: number; qtyMilli: number }[] }
    for (const [index, l] of d.lines.entries()) {
      const line = po.lines.find((x) => x.id === l.purchaseOrderLineId)
      if (!line) return validation(`lines.${index}.purchaseOrderLineId`, `La ligne ${l.purchaseOrderLineId} n’appartient pas à ce bon de commande.`)
      if (line.receivedQtyMilli + l.qtyMilli > line.qtyMilli) return validation(`lines.${index}.qtyMilli`, `Ligne ${line.itemCode} : trop reçu.`)
    }
    const delivery: DeliveryRead = {
      id: state.deliveries.length + 1,
      purchaseOrderId: po.id,
      receivedOn: d.receivedOn,
      reference: d.reference,
      notes: null,
      lines: d.lines.map((l, i) => ({
        id: i + 1,
        purchaseOrderLineId: l.purchaseOrderLineId,
        itemCode: po.lines.find((x) => x.id === l.purchaseOrderLineId)!.itemCode,
        qtyMilli: l.qtyMilli,
        remarks: null,
      })),
      createdAt: NOW,
      updatedAt: NOW,
    }
    state.deliveries.push(delivery)
    syncReceipts(state, po, `Réception ${d.reference ?? '—'} du ${d.receivedOn}.`)
    return json(201, delivery)
  }
  if (sub === 'invoices' && method === 'GET')
    return json(
      200,
      state.invoices.filter((i) => i.purchaseOrderId === po.id),
    )
  if (sub === 'invoices' && method === 'POST') {
    if (po.status === 'cancelled') return error(409, 'conflict', `Bon de commande ${po.number} annulé : plus de facture.`)
    const inv = body as { kind: InvoiceRead['kind']; reference: string; invoicedOn: string; dueOn: string | null; amountHtCents: number; vatCents: number }
    if (state.invoices.some((i) => i.purchaseOrderId === po.id && i.reference === inv.reference.trim()))
      return validation('reference', 'Ce bon de commande a déjà une facture portant cette référence.')
    const created: InvoiceRead = {
      id: state.invoices.length + 1,
      purchaseOrderId: po.id,
      kind: inv.kind,
      reference: inv.reference.trim(),
      invoicedOn: inv.invoicedOn,
      dueOn: inv.dueOn,
      amountHtCents: inv.amountHtCents,
      vatCents: inv.vatCents,
      ttcCents: inv.amountHtCents + inv.vatCents,
      amountHtEurCents: divRound(inv.amountHtCents * po.fxRateMicro, 1_000_000),
      paidOn: null,
      paymentRef: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    }
    state.invoices.push(created)
    syncInvoices(state, po)
    return json(201, created)
  }
  if (sub === 'files' && method === 'POST') {
    const f = body as { fileId: number; caption: string | null }
    const file = state.files.find((x) => x.id === f.fileId)
    if (!file) return error(404, 'not_found', `Fichier n° ${f.fileId} introuvable.`)
    po.files.push({
      fileId: file.id,
      caption: f.caption,
      sha256: file.sha256,
      ext: file.ext,
      mimeType: file.mimeType,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
    })
    return json(201, po)
  }
  const fileMatch = /^files\/(\d+)$/.exec(sub ?? '')
  if (fileMatch && method === 'DELETE') {
    po.files = po.files.filter((f) => f.fileId !== Number(fileMatch[1]))
    return json(200, po)
  }
  return undefined
}

function handlePurchaseOrderLines(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)$/.exec(rest ?? '')
  if (!match) return undefined
  const po = state.purchaseOrders.find((o) => o.lines.some((l) => l.id === Number(match[1])))
  const line = po?.lines.find((l) => l.id === Number(match[1]))
  if (!po || !line) return error(404, 'not_found', `Ligne de bon de commande n° ${match[1]} introuvable.`)
  if (po.status !== 'draft') return error(409, 'conflict', `Bon de commande ${po.number} ${po.status} : seules les modifications du brouillon sont possibles.`)
  if (method === 'PATCH') {
    Object.assign(line, body)
    poLineAmounts(po, line)
    poTotals(po)
    return json(200, po)
  }
  if (method === 'DELETE') {
    po.lines = po.lines.filter((l) => l.id !== line.id)
    poTotals(po)
    return json(200, po)
  }
  return undefined
}

function invoicedOf(state: FakeApi, paidOnly: boolean): number {
  let total = 0
  for (const inv of state.invoices) {
    const po = state.purchaseOrders.find((o) => o.id === inv.purchaseOrderId)
    if (!po || po.status === 'cancelled') continue
    if (paidOnly && !inv.paidOn) continue
    total += inv.amountHtEurCents
  }
  return total
}

function syncInvoices(state: FakeApi, po: PoRead): void {
  const mine = state.invoices.filter((i) => i.purchaseOrderId === po.id)
  po.invoicedHtCents = mine.reduce((s, i) => s + i.amountHtCents, 0)
  po.paidHtCents = mine.filter((i) => i.paidOn).reduce((s, i) => s + i.amountHtCents, 0)
}

function syncReceipts(state: FakeApi, po: PoRead, note: string): void {
  const mine = state.deliveries.filter((d) => d.purchaseOrderId === po.id)
  po.deliveriesCount = mine.length
  let complete = true
  let any = false
  for (const line of po.lines) {
    line.receivedQtyMilli = mine
      .flatMap((d) => d.lines)
      .filter((l) => l.purchaseOrderLineId === line.id)
      .reduce((s, l) => s + l.qtyMilli, 0)
    any = any || line.receivedQtyMilli > 0
    const item = state.items.find((i) => i.id === line.projectItemId)!
    if (line.receivedQtyMilli >= line.qtyMilli) {
      if (item.status === 'ordered') {
        state.events.push({
          id: state.events.length + 1,
          projectItemId: item.id,
          kind: 'status',
          fromStatus: 'ordered',
          toStatus: 'delivered',
          oldValue: null,
          newValue: null,
          changedAt: LATER,
          note,
        })
        item.status = 'delivered'
        line.itemStatus = 'delivered'
      }
    } else {
      complete = false
      if (item.status === 'delivered') {
        state.events.push({
          id: state.events.length + 1,
          projectItemId: item.id,
          kind: 'status',
          fromStatus: 'delivered',
          toStatus: 'ordered',
          oldValue: null,
          newValue: null,
          changedAt: LATER,
          note,
        })
        item.status = 'ordered'
        line.itemStatus = 'ordered'
      }
    }
  }
  po.status = complete ? 'closed' : any ? 'partially_delivered' : 'acknowledged'
}

function handleDeliveries(state: FakeApi, method: string, rest: string | undefined): Response | undefined {
  const match = /^(\d+)$/.exec(rest ?? '')
  if (!match) return undefined
  const delivery = state.deliveries.find((d) => d.id === Number(match[1]))
  if (!delivery) return error(404, 'not_found', `Réception n° ${match[1]} introuvable.`)
  if (method === 'DELETE') {
    const po = state.purchaseOrders.find((o) => o.id === delivery.purchaseOrderId)!
    state.deliveries = state.deliveries.filter((d) => d.id !== delivery.id)
    syncReceipts(state, po, `Réception ${delivery.reference ?? '—'} du ${delivery.receivedOn} supprimée (correction de saisie).`)
    return json(200, po)
  }
  return undefined
}

function handleInvoices(state: FakeApi, method: string, rest: string | undefined, body: unknown): Response | undefined {
  const match = /^(\d+)(?:\/(.+))?$/.exec(rest ?? '')
  if (!match) return undefined
  const invoice = state.invoices.find((i) => i.id === Number(match[1]))
  if (!invoice) return error(404, 'not_found', `Facture n° ${match[1]} introuvable.`)
  const po = state.purchaseOrders.find((o) => o.id === invoice.purchaseOrderId)!
  const sub = match[2]
  if (invoice.paidOn && (method !== 'PATCH' || Object.keys((body ?? {}) as object).some((k) => k !== 'notes')))
    return error(409, 'conflict', `Facture ${invoice.reference} payée le ${invoice.paidOn} : plus aucune modification.`)
  if (!sub && method === 'PATCH') {
    Object.assign(invoice, body, { updatedAt: LATER })
    invoice.ttcCents = invoice.amountHtCents + invoice.vatCents
    invoice.amountHtEurCents = divRound(invoice.amountHtCents * po.fxRateMicro, 1_000_000)
    syncInvoices(state, po)
    return json(200, invoice)
  }
  if (sub === 'pay' && method === 'POST') {
    const p = body as { paidOn: string; paymentRef: string | null }
    invoice.paidOn = p.paidOn
    invoice.paymentRef = p.paymentRef
    syncInvoices(state, po)
    return json(200, invoice)
  }
  if (!sub && method === 'DELETE') {
    state.invoices = state.invoices.filter((i) => i.id !== invoice.id)
    syncInvoices(state, po)
    return new Response(null, { status: 204 })
  }
  return undefined
}

async function handleImports(state: FakeApi, url: URL, method: string, request: Request): Promise<Response> {
  const sub = url.pathname.slice('/api/v1/imports/products/'.length)
  if (sub === 'mapping' && method === 'GET') return json(200, null)
  if (sub === 'batches' && method === 'GET') return json(200, state.importBatches)
  if ((sub === 'preview' || sub === 'commit') && method === 'POST') {
    const part = await readMultipartFile(request)
    if (!part) return validation('file', 'Fichier attendu : xlsx ou CSV.')
    const columns = ['Réf', 'Désignation', 'Prix HT']
    const rows = [
      {
        rowIndex: 1,
        action: 'update' as const,
        reason: null,
        matchedBy: 'supplierRef',
        productId: 1,
        name: 'Beat Light Fat',
        supplierRef: 'BLS01',
        manufacturerRef: null,
        manufacturerName: null,
        gtin: null,
        oldPriceCents: 125_000,
        newPriceCents: 118_000,
        leadTimeWeeks: null,
        finish: null,
      },
      {
        rowIndex: 2,
        action: 'create' as const,
        reason: null,
        matchedBy: null,
        productId: null,
        name: 'Beat Light Tall',
        supplierRef: 'BLT01',
        manufacturerRef: null,
        manufacturerName: null,
        gtin: null,
        oldPriceCents: null,
        newPriceCents: 145_000,
        leadTimeWeeks: null,
        finish: null,
      },
      {
        rowIndex: 3,
        action: 'skip' as const,
        reason: 'prix illisible : « n/a »',
        matchedBy: null,
        productId: null,
        name: 'Beat Wide',
        supplierRef: 'BLX01',
        manufacturerRef: null,
        manufacturerName: null,
        gtin: null,
        oldPriceCents: null,
        newPriceCents: null,
        leadTimeWeeks: null,
        finish: null,
      },
    ]
    const counts = { total: 3, create: 1, update: 1, unchanged: 0, skip: 1, discontinued: 0 }
    if (sub === 'preview')
      return json(200, {
        supplierId: 1,
        filename: part.filename,
        columns,
        sample: [{ Réf: 'BLS01', Désignation: 'Beat Light Fat', 'Prix HT': '1 180,00' }],
        mapping: {
          columns: { supplierRef: 'Réf', name: 'Désignation', listPrice: 'Prix HT' },
          taxMode: 'ht',
          vatBp: null,
          defaultCategoryId: 1,
          currency: null,
        },
        mappingSource: 'guessed',
        counts,
        rows,
        missingSupplierRefs: ['OLD99'],
      })
    const batch = {
      id: state.importBatches.length + 1,
      supplierId: 1,
      fileId: 1,
      originalName: part.filename,
      importedAt: LATER,
      rowsTotal: 3,
      rowsCreated: 1,
      rowsUpdated: 1,
      rowsUnchanged: 0,
      rowsSkipped: 1,
      rowsDiscontinued: 0,
    }
    state.importBatches.unshift(batch)
    return json(201, { batch, counts, createdProductIds: [2], updatedProductIds: [1] })
  }
  return error(404, 'not_found', `Route inconnue : ${method} ${url.pathname}`)
}
