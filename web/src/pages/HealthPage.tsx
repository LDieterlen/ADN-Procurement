import { useHealth } from '../api/queries/health'

export function HealthPage() {
  const health = useHealth()

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 font-sans">
      <h1 className="text-2xl font-semibold text-neutral-800">FFE</h1>
      {health.status === 'loading' && <p className="text-neutral-500">Interrogation de l'API…</p>}
      {health.status === 'ok' && health.data.ok && <p className="rounded bg-green-100 px-4 py-2 text-lg font-medium text-green-800">API OK</p>}
      {health.status === 'ok' && !health.data.ok && <p className="rounded bg-amber-100 px-4 py-2 text-amber-800">API en difficulté</p>}
      {health.status === 'error' && (
        <p className="rounded bg-red-100 px-4 py-2 text-red-800">
          API injoignable — {health.message}. Lancer <code>uv run ffe serve</code> dans <code>api/</code>.
        </p>
      )}
    </main>
  )
}
