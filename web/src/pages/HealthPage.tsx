import { useHealth } from '../api/queries/health'

export function HealthPage() {
  const health = useHealth()

  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">Santé</h1>
      {health.isPending && <p className="text-ink-3">Interrogation de l'API…</p>}
      {health.isError && (
        <p role="alert" className="rounded bg-red-100 px-4 py-2 text-red-800">
          API injoignable — {health.error.message} Lancer <code>uv run ffe serve</code> dans <code>api/</code>.
        </p>
      )}
      {health.data && (
        <>
          <p className="inline-block rounded bg-ok-soft px-4 py-2 text-lg font-medium text-ok">{health.data.ok ? 'API OK' : 'API en difficulté'}</p>
          <dl className="grid grid-cols-[12rem_1fr] gap-y-1 text-sm">
            <dt className="text-ink-3">Base</dt>
            <dd>
              {health.data.dbPath ?? '—'} {health.data.isDevDb && <span className="ml-1 rounded bg-amber-200 px-1 text-xs font-bold text-warn">DEV</span>}
            </dd>
            <dt className="text-ink-3">Révision du schéma</dt>
            <dd>{health.data.schemaRevision ?? '—'}</dd>
            <dt className="text-ink-3">Dernière sauvegarde</dt>
            <dd>{health.data.lastBackupAt ?? 'aucune'}</dd>
            <dt className="text-ink-3">Dossier de copie Windows</dt>
            <dd>
              {health.data.backupDir} —{' '}
              {health.data.backupDirOk ? 'accessible' : <span className="text-amber-800">absent ou non accessible (FFE_BACKUP_DIR)</span>}
            </dd>
            <dt className="text-ink-3">Dernier quick_check</dt>
            <dd>{health.data.lastQuickCheck ?? '—'}</dd>
            <dt className="text-ink-3">Journal</dt>
            <dd>{health.data.logPath ?? '—'}</dd>
          </dl>
        </>
      )}
    </section>
  )
}
