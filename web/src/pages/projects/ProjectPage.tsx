// The project page (ADR-0013): header with status, budget strip, locations, articles, issued PDFs.
import { Link, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useClient } from '../../api/queries/client'
import { fileContentUrl } from '../../api/queries/file'
import { CLOSED_STATUSES, PROJECT_STATUS_LABELS, useChangeProjectStatus, useLocations, useProject, type ProjectStatus } from '../../api/queries/project'
import { EXPORT_KIND_LABELS, listExportUrl, sheetsExportUrl, useProjectExports } from '../../api/queries/projectFile'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { BudgetStrip } from './BudgetStrip'
import { ItemsSection } from './ItemsSection'
import { LocationsSection } from './LocationsSection'
import { StatusBadge } from './ProjectsPage'

export function ProjectPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const project = useProject(id)
  const client = useClient(project.data?.clientId)
  const locations = useLocations(id, true)
  const exports = useProjectExports(id)
  const changeStatus = useChangeProjectStatus()
  const errors = useSubmitErrors('projet')

  function askStatus(status: ProjectStatus) {
    const closing = CLOSED_STATUSES.includes(status)
    errors.setDialog({
      title: `Passer le projet en « ${PROJECT_STATUS_LABELS[status]} » ?`,
      message: closing ? 'Le projet passe en lecture seule ; le client pourra être archivé.' : 'Le statut est libre : il se change à tout moment.',
      actions: [
        {
          label: 'Confirmer',
          variant: closing ? 'danger' : 'primary',
          onClick: () =>
            void changeStatus
              .mutateAsync({ id, status })
              .then(() => errors.setDialog(null))
              .catch((error: unknown) => errors.toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })),
        },
        { label: 'Annuler', onClick: () => errors.setDialog(null) },
      ],
    })
  }

  if (project.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (project.isError) {
    return (
      <EmptyState title={project.error.message}>
        <Link to="/projects" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const p = project.data
  const readOnly = CLOSED_STATUSES.includes(p.status)
  return (
    <section>
      <PageHeader
        title={p.name}
        crumbs={
          <Link to="/projects" className="hover:underline">
            Projets
          </Link>
        }
        subtitle={
          <>
            <span>{client.data?.name ?? ''}</span>
            <span>·</span>
            <span className="font-mono text-xs">{p.code}</span>
            <span>·</span>
            <StatusBadge status={p.status} />
            {p.dueOn && (
              <>
                <span>·</span>
                <span>Échéance : {p.dueOn}</span>
              </>
            )}
          </>
        }
        actions={
          <>
            <label className="flex items-center gap-1 text-sm text-neutral-600">
              Statut
              <select
                value={p.status}
                onChange={(event) => askStatus(event.target.value as ProjectStatus)}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                aria-label="Changer le statut"
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <a
              href={sheetsExportUrl(p.id)}
              download
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Fiches PDF
            </a>
            <a
              href={listExportUrl(p.id)}
              download
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Listing PDF
            </a>
            <Link to={`/projects/${p.id}/budget`}>
              <Button>Budget</Button>
            </Link>
            <Link to={`/projects/${p.id}/edit`}>
              <Button variant="primary">Modifier</Button>
            </Link>
          </>
        }
      />
      <BudgetStrip projectId={p.id} readOnly={readOnly} />
      {readOnly && (
        <p className="mb-4 text-sm text-neutral-600">
          Projet {PROJECT_STATUS_LABELS[p.status].toLowerCase()} : lecture seule, changer le statut pour modifier.
        </p>
      )}
      <div className="space-y-6">
        <LocationsSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
        <ItemsSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
        {exports.data && exports.data.length > 0 && (
          <Card title="Documents émis" label="Documents émis">
            <ul className="space-y-1 text-sm" aria-label="Documents émis">
              {exports.data.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <a href={fileContentUrl(e.fileId)} download={e.originalName} className="underline">
                    {e.originalName}
                  </a>
                  <span className="text-neutral-500">
                    {EXPORT_KIND_LABELS[e.kind]}
                    {e.indice ? ` · indice ${e.indice}` : ''} · {e.issuedAt.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <ConfirmDialog open={errors.dialog !== null} title={errors.dialog?.title ?? ''} actions={errors.dialog?.actions ?? []}>
        {errors.dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
