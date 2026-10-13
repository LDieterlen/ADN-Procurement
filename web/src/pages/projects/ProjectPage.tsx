// The project page (ADR-0013): header with status, budget strip, locations, articles, issued PDFs.
import { Link, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useClient } from '../../api/queries/client'
import { fileContentUrl } from '../../api/queries/file'
import {
  CLOSED_STATUSES,
  PROJECT_STATUS_LABELS,
  useChangeProjectStatus,
  useLocations,
  useNextProjectIndice,
  useProject,
  useRevertProjectIndice,
  type ProjectStatus,
} from '../../api/queries/project'
import { EXPORT_KIND_LABELS, listExportUrl, sheetsExportUrl, useProjectExports } from '../../api/queries/projectFile'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pill } from '../../components/ui/Pill'
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
  const nextIndice = useNextProjectIndice()
  const revertIndice = useRevertProjectIndice()
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

  function askIndice(current: string | null) {
    const next = nextLetter(current)
    errors.setDialog({
      title: `Passer à l'indice ${next} ?`,
      message: current
        ? `Les fiches modifiées depuis l'indice ${current} prendront la lettre ${next} ; les PDF émis ensuite porteront l'indice ${next}. Les PDF émis entre deux indices sont des essais.`
        : `Toutes les fiches prendront la lettre ${next} ; les PDF émis ensuite porteront l'indice ${next}.`,
      actions: [
        {
          label: `Passer à l'indice ${next}`,
          variant: 'primary',
          onClick: () =>
            void nextIndice
              .mutateAsync(id)
              .then(() => {
                errors.setDialog(null)
                errors.toast.show({ kind: 'success', message: `Indice ${next} déclaré ; émettre les fiches PDF pour la diffusion.` })
              })
              .catch((error: unknown) => errors.toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })),
        },
        { label: 'Annuler', onClick: () => errors.setDialog(null) },
      ],
    })
  }

  function askRevert(current: string) {
    const previous = previousLetter(current)
    errors.setDialog({
      title: `Retirer l'indice ${current} ?`,
      message: previous
        ? `Le projet revient à l'indice ${previous} ; les fiches marquées ${current} reprennent leur lettre précédente. Les PDF déjà émis restent dans la liste.`
        : `Le projet revient sans indice ; les fiches marquées ${current} reprennent leur lettre précédente.`,
      actions: [
        {
          label: `Retirer l'indice ${current}`,
          variant: 'danger',
          onClick: () =>
            void revertIndice
              .mutateAsync(id)
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
  // The latest sheets PDF issued since the current indice was declared: the one to send.
  const referenceId = p.indice
    ? (exports.data ?? []).find((e) => e.kind === 'sheets_pdf' && e.indice === p.indice && e.issuedAt >= (p.indiceChangedAt ?? ''))?.id
    : undefined
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
            <span>·</span>
            <Pill filled={Boolean(p.indice)}>{p.indice ? `Indice ${p.indice}` : 'Sans indice'}</Pill>
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
            {!readOnly && (
              <Button onClick={() => askIndice(p.indice)} disabled={nextIndice.isPending}>
                Nouvel indice
              </Button>
            )}
            {!readOnly && p.indice && (
              <Button variant="ghost" onClick={() => askRevert(p.indice!)} disabled={revertIndice.isPending}>
                Retirer l'indice {p.indice}
              </Button>
            )}
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
              {exports.data.map((e) => {
                const reference = e.id === referenceId
                return (
                  <li key={e.id} className={`flex items-center gap-3 ${reference ? 'rounded-lg bg-neutral-100 px-2 py-1' : ''}`}>
                    <a href={fileContentUrl(e.fileId)} download={e.originalName} className="underline">
                      {e.originalName}
                    </a>
                    <span className="text-neutral-500">
                      {EXPORT_KIND_LABELS[e.kind]}
                      {e.indice ? ` · indice ${e.indice}` : e.kind === 'sheets_pdf' ? ' · sans indice' : ''} · {e.issuedAt.slice(0, 10)}
                    </span>
                    {reference && <Pill filled>{`Fiches de référence, indice ${p.indice}`}</Pill>}
                  </li>
                )
              })}
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

/** A, B … Z, AA, AB … (same rule as the server). */
export function nextLetter(current: string | null): string {
  if (!current) return 'A'
  const digits = [...current].map((ch) => ch.charCodeAt(0) - 65)
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i]! < 25) {
      digits[i]! += 1
      return digits.map((d) => String.fromCharCode(65 + d)).join('')
    }
    digits[i] = 0
  }
  return 'A' + digits.map((d) => String.fromCharCode(65 + d)).join('')
}

/** The letter before `current` (B → A, AA → Z, A → null): the inverse of nextLetter. */
export function previousLetter(current: string): string | null {
  if (current === 'A') return null
  const digits = [...current].map((ch) => ch.charCodeAt(0) - 65)
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i]! > 0) {
      digits[i]! -= 1
      return digits.map((d) => String.fromCharCode(65 + d)).join('')
    }
    digits[i] = 25
  }
  return digits
    .slice(1)
    .map((d) => String.fromCharCode(65 + d))
    .join('')
}
