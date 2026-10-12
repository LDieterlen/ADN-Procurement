// Typed API error (API.md « Format d'erreur ») built from any failed response; thrown by queries/.
export type ErrorDetail = { field: string; message: string }

export type ApiErrorCode = 'validation_error' | 'not_found' | 'conflict' | 'duplicate' | 'internal_error' | 'network_error' | 'unknown_error'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details: ErrorDetail[]
  readonly existingId: number | undefined
  readonly archivedId: number | undefined

  constructor(status: number, body: unknown) {
    const parsed = parseBody(body)
    super(parsed.message ?? defaultMessage(status))
    this.name = 'ApiError'
    this.status = status
    this.code = parsed.code ?? (status === 0 ? 'network_error' : 'unknown_error')
    this.details = parsed.details
    this.existingId = parsed.existingId
    this.archivedId = parsed.archivedId
  }

  static network(): ApiError {
    return new ApiError(0, { code: 'network_error', message: "L'API ne répond pas." })
  }
}

type Parsed = { code?: ApiErrorCode; message?: string; details: ErrorDetail[]; existingId?: number; archivedId?: number }

const CODES: ReadonlySet<string> = new Set(['validation_error', 'not_found', 'conflict', 'duplicate', 'internal_error', 'network_error'])

function parseBody(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null) return { details: [] }
  const record = body as Record<string, unknown>
  const code = typeof record.code === 'string' && CODES.has(record.code) ? (record.code as ApiErrorCode) : undefined
  const message = typeof record.message === 'string' ? record.message : undefined
  const details = Array.isArray(record.details)
    ? record.details.filter(
        (d): d is ErrorDetail =>
          typeof d === 'object' && d !== null && typeof (d as ErrorDetail).field === 'string' && typeof (d as ErrorDetail).message === 'string',
      )
    : []
  return {
    details,
    ...(code !== undefined ? { code } : {}),
    ...(message !== undefined ? { message } : {}),
    ...(typeof record.existingId === 'number' ? { existingId: record.existingId } : {}),
    ...(typeof record.archivedId === 'number' ? { archivedId: record.archivedId } : {}),
  }
}

function defaultMessage(status: number): string {
  if (status === 0) return "L'API ne répond pas."
  if (status === 404) return 'Introuvable.'
  if (status >= 500) return 'Erreur du serveur.'
  return `Erreur HTTP ${status}.`
}

/** Turns an openapi-fetch result into data or a thrown ApiError. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data
  // 204 No Content (deletes): openapi-fetch yields no data, which is not an error.
  if (result.response.ok && result.error === undefined) return undefined as T
  throw new ApiError(result.response.status, result.error)
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
