// In-memory stand-in for the FFE API, installed on globalThis.fetch for component tests (D5.10).
// It mirrors the server rules the UI reacts to: 422 by field, 409 duplicate/archived, 404, archive.
import type { components } from '../../src/api/schema.d.ts'

type ClientRead = components['schemas']['ClientRead']

const NOW = '2026-10-10T12:00:00Z'

export type FakeApi = {
  clients: ClientRead[]
  requests: { method: string; path: string; body: unknown }[]
  down: boolean
  restore: () => void
}

const normalize = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function error(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return json(status, { code, message, details: [], ...extra })
}

export function installFakeApi(seed: Partial<ClientRead>[] = []): FakeApi {
  const originalFetch = globalThis.fetch
  const state: FakeApi = {
    clients: seed.map((c, index) => ({
      id: index + 1,
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
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...c,
    })),
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
      return json(200, { ok: true, dbPath: '/tmp/ffe.sqlite', isDevDb: true, schemaRevision: '0001', lastBackupAt: null, backupDirOk: true })
    }
    if (url.pathname === '/api/v1/clients' && method === 'GET') {
      const q = url.searchParams.get('q')
      const includeArchived = url.searchParams.get('includeArchived') === 'true'
      const rows = state.clients
        .filter((c) => includeArchived || c.archivedAt === null)
        .filter((c) => !q || normalize(c.name).includes(normalize(q)))
        .sort((a, b) => a.name.localeCompare(b.name))
      return json(200, rows)
    }
    if (url.pathname === '/api/v1/clients' && method === 'POST') {
      const payload = body as Partial<ClientRead>
      const name = (payload.name ?? '').trim()
      if (!name) return json(422, { code: 'validation_error', message: 'Données invalides.', details: [{ field: 'name', message: 'Champ obligatoire.' }] })
      const twin = state.clients.find((c) => normalize(c.name) === normalize(name))
      if (twin?.archivedAt) return error(409, 'conflict', 'Un Client archivé porte déjà ce nom.', { archivedId: twin.id })
      if (twin && url.searchParams.get('force') !== 'true') return error(409, 'duplicate', 'Un Client actif porte déjà ce nom.', { existingId: twin.id })
      const created: ClientRead = {
        id: state.clients.length + 1,
        name,
        kind: payload.kind ?? 'individual',
        contactName: payload.contactName ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        addressLine1: payload.addressLine1 ?? null,
        addressLine2: payload.addressLine2 ?? null,
        postalCode: payload.postalCode ?? null,
        city: payload.city ?? null,
        countryCode: payload.countryCode ?? 'FR',
        siren: payload.siren ?? null,
        notes: payload.notes ?? null,
        archivedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }
      state.clients.push(created)
      return json(201, created)
    }
    const match = /^\/api\/v1\/clients\/(\d+)(?:\/(archive|unarchive))?$/.exec(url.pathname)
    if (match) {
      const client = state.clients.find((c) => c.id === Number(match[1]))
      if (!client) return error(404, 'not_found', `Client n° ${match[1]} introuvable.`)
      const action = match[2]
      if (action === 'archive' && method === 'POST') {
        if (client.archivedAt) return error(409, 'conflict', 'Déjà archivé.')
        client.archivedAt = NOW
        return json(200, client)
      }
      if (action === 'unarchive' && method === 'POST') {
        if (!client.archivedAt) return error(409, 'conflict', "N'est pas archivé.")
        client.archivedAt = null
        return json(200, client)
      }
      if (!action && method === 'GET') return json(200, client)
      if (!action && method === 'PATCH') {
        if (client.archivedAt) return error(409, 'conflict', 'Archivé : le restaurer avant de le modifier.')
        Object.assign(client, body, { updatedAt: '2026-10-10T13:00:00Z' })
        return json(200, client)
      }
    }
    return error(404, 'not_found', `Route inconnue : ${method} ${url.pathname}`)
  }

  return state
}
