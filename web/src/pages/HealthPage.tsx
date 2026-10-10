import { useHealth } from '../api/queries/health'

export function HealthPage() {
  const health = useHealth()

  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Santé</h1>
      {health.isPending && <p className="text-neutral-500">Interrogation de l'API…</p>}
      {health.isError && (
        <p role="alert" className="rounded bg-red-100 px-4 py-2 text-red-800">
          API injoignable — {health.error.message} Lancer <code>uv run ffe serve</code> dans <code>api/</code>.
        </p>
      )}
      {health.data && (
        <>
          <p className="inline-block rounded bg-green-100 px-4 py-2 text-lg font-medium text-green-800">{health.data.ok ? 'API OK' : 'API en difficulté'}</p>
          <dl className="grid grid-cols-[12rem_1fr] gap-y-1 text-sm">
            <dt className="text-neutral-500">Base</dt>
            <dd>
              {health.data.dbPath ?? '—'} {health.data.isDevDb && <span className="ml-1 rounded bg-amber-200 px-1 text-xs font-bold text-amber-900">DEV</span>}
            </dd>
            <dt className="text-neutral-500">Révision du schéma</dt>
            <dd>{health.data.schemaRevision ?? '—'}</dd>
            <dt className="text-neutral-500">Dernière sauvegarde</dt>
            <dd>{health.data.lastBackupAt ?? 'aucune'}</dd>
            <dt className="text-neutral-500">Dossier de copie Windows</dt>
            <dd>{health.data.backupDirOk ? 'accessible' : <span className="text-amber-800">absent ou non accessible (FFE_BACKUP_DIR)</span>}</dd>
          </dl>
        </>
      )}
    </section>
  )
}
