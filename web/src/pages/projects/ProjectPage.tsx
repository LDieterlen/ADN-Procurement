// The project page (ADR-0013): header with status, budget strip, articles and locations; the
// « Historique » tab holds the issued PDFs and the diffusions (ADR-0022).
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Segmented } from '../../components/ui/Segmented'
import { isApiError } from '../../api/errors'
import { useClient } from '../../api/queries/client'
import { fileContentUrl } from '../../api/queries/file'
import {
  CLOSED_STATUSES,
  PROJECT_STATUS_LABELS,
  useChangeProjectStatus,
  useLocations,
  useProject,
  useRevertDiffusion,
  type ProjectStatus,
} from '../../api/queries/project'
import { EXPORT_KIND_LABELS, useProjectExports } from '../../api/queries/projectFile'
import { Button, buttonClass } from '../../components/ui/Button'
import { Card, Dot, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pill } from '../../components/ui/Pill'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { BudgetStrip } from './BudgetStrip'
import { InstallationSection } from './InstallationSection'
import { ItemsSection } from './ItemsSection'
import { ListingDialog } from './ListingDialog'
import { LocationsSection } from './LocationsSection'
import { StatusBadge } from './ProjectsPage'
import { SheetsDialog } from './SheetsDialog'

type View = 'project' | 'installation' | 'history'
const VIEWS: { value: View; label: string }[] = [
  { value: 'project', label: 'Articles et localisations' },
  { value: 'installation', label: 'Installation' },
  { value: 'history', label: 'Historique' },
]
// The tab in the address (`?vue=…`), so a link or a reload comes back to it.
const VIEW_PARAMS: Record<View, string | null> = { project: null, installation: 'installation', history: 'historique' }

export function ProjectPage() {
  const [search, setSearch] = useSearchParams()
  const view: View = (Object.keys(VIEW_PARAMS) as View[]).find((v) => VIEW_PARAMS[v] !== null && VIEW_PARAMS[v] === search.get('vue')) ?? 'project'
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const project = useProject(id)
  const client = useClient(project.data?.clientId)
  const locations = useLocations(id, true)
  const exports = useProjectExports(id)
  const changeStatus = useChangeProjectStatus()
  const revertDiffusion = useRevertDiffusion()
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [listingOpen, setListingOpen] = useState(false)
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

  function askRevertDiffusion(number: number) {
    errors.setDialog({
      title: `Annuler la diffusion ${number} ?`,
      message:
        number === 1
          ? 'Le projet redevient non diffusé : tout est de nouveau modifiable librement. Les PDF émis restent dans l’historique, marqués « diffusion annulée ».'
          : `Les indices et les règles reviennent à la diffusion ${number - 1}. Les PDF émis restent dans l’historique, marqués « diffusion annulée ».`,
      actions: [
        {
          label: `Annuler la diffusion ${number}`,
          variant: 'danger',
          onClick: () =>
            void revertDiffusion
              .mutateAsync(id)
              .then(() => errors.setDialog(null))
              .catch((error: unknown) => errors.toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })),
        },
        { label: 'Garder', onClick: () => errors.setDialog(null) },
      ],
    })
  }

  if (project.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
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
  const last = p.lastDiffusion
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
            <Dot />
            <span className="font-mono text-[12.5px] text-ink-2">{p.code}</span>
            <Dot />
            <label className="relative inline-flex items-center">
              <StatusBadge status={p.status} />
              {!readOnly && (
                <svg width="8" height="5" viewBox="0 0 8 5" className="ml-1.5 opacity-60" aria-hidden="true">
                  <path d="M1 1l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              )}
              <select
                value={p.status}
                onChange={(event) => askStatus(event.target.value as ProjectStatus)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Changer le statut"
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <Dot />
            <Pill status={last ? 'indice' : 'none'}>{last ? `Diffusion ${last.number}` : 'Non diffusé'}</Pill>
            {p.dueOn && (
              <>
                <Dot />
                <span>Échéance {p.dueOn}</span>
              </>
            )}
          </>
        }
        actions={
          <>
            <Button onClick={() => setSheetsOpen(true)}>Fiches PDF</Button>
            <Button onClick={() => setListingOpen(true)}>Listing PDF</Button>
            <Link to={`/projects/${p.id}/edit`} className={buttonClass('primary')}>
              Modifier
            </Link>
          </>
        }
      />
      <BudgetStrip projectId={p.id} readOnly={readOnly} />
      {readOnly && (
        <p className="mb-6 rounded-lg bg-sunken px-4 py-2.5 text-[13.5px] text-ink-2">
          Projet {PROJECT_STATUS_LABELS[p.status].toLowerCase()} : lecture seule, changer le statut pour modifier.
        </p>
      )}
      {/* Three tabs: the project (articles, locations), the installation sheets (ADR-0024) and the history (the issued documents). */}
      <div className="mb-5">
        <Segmented label="Vue du projet" value={view} onChange={(value) => setSearch(VIEW_PARAMS[value] ? { vue: VIEW_PARAMS[value] } : {})} options={VIEWS} />
      </div>
      {view === 'project' ? (
        <div className="space-y-6">
          <ItemsSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
          <LocationsSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
        </div>
      ) : view === 'installation' ? (
        <InstallationSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
      ) : (
        <Card
          title="Documents émis"
          label="Documents émis"
          padding="table"
          actions={
            !readOnly &&
            last && (
              <Button size="sm" variant="ghost" onClick={() => askRevertDiffusion(last.number)} disabled={revertDiffusion.isPending}>
                Annuler la diffusion {last.number}
              </Button>
            )
          }
        >
          {exports.isPending ? (
            <p className="px-5 py-5 text-sm text-ink-3">Chargement…</p>
          ) : exports.isError ? (
            <p className="px-5 py-5 text-sm text-danger">{exports.error.message}</p>
          ) : exports.data.length > 0 ? (
            <ul className="p-2 text-sm" aria-label="Documents émis">
              {exports.data.map((e) => {
                const official = e.diffusionNumber != null && !e.diffusionRevoked
                return (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 ${official ? 'rounded-[7px] bg-accent-soft text-accent-ink' : ''}`}
                  >
                    <div className="min-w-0">
                      <a
                        href={fileContentUrl(e.fileId)}
                        download={e.originalName}
                        className={`block truncate font-medium ${official ? 'text-accent-ink' : 'text-ink'}`}
                      >
                        {e.originalName}
                      </a>
                      <div className={`text-[12.5px] ${official ? 'text-accent-ink/80' : 'text-ink-3'}`}>
                        {EXPORT_KIND_LABELS[e.kind]} · {e.issuedAt.slice(0, 10)}
                      </div>
                    </div>
                    {e.kind === 'sheets_pdf' && (
                      <span
                        className={`rounded-[4px] px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${
                          official ? 'bg-accent text-white' : e.diffusionRevoked ? 'bg-track text-ink-2 line-through' : 'bg-track text-ink-2'
                        }`}
                      >
                        {e.diffusionNumber == null
                          ? 'Document de travail'
                          : e.diffusionRevoked
                            ? `Diffusion ${e.diffusionNumber} annulée`
                            : `Diffusion ${e.diffusionNumber}`}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-5 py-5 text-sm text-ink-3">
              Aucun document émis. « Fiches PDF » émet un document de travail ou une diffusion ; chaque version est conservée ici.
            </p>
          )}
        </Card>
      )}
      {/* Mounted while open only: each opening starts from the defaults (never « Diffusion officielle » left ticked). */}
      {sheetsOpen && <SheetsDialog project={p} readOnly={readOnly} open onClose={() => setSheetsOpen(false)} />}
      {listingOpen && <ListingDialog projectId={p.id} open onClose={() => setListingOpen(false)} />}
      <ConfirmDialog open={errors.dialog !== null} title={errors.dialog?.title ?? ''} actions={errors.dialog?.actions ?? []}>
        {errors.dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
