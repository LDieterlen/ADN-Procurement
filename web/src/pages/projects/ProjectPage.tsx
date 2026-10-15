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
import { Button, linkButtonClass } from '../../components/ui/Button'
import { Card, Dot, PageHeader } from '../../components/ui/Card'
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
      title: current ? `Passer à l'indice ${next} ?` : 'Première diffusion : indice A ?',
      message: current
        ? `Les fiches modifiées depuis l'indice ${current} prendront la lettre ${next} ; les PDF émis ensuite porteront l'indice ${next}. Les PDF émis entre deux indices sont des essais.`
        : 'Toutes les fiches du projet reçoivent l’indice A. Les fiches PDF émises ensuite le portent ; celles émises jusqu’ici restent des essais.',
      actions: [
        {
          label: current ? `Passer à l'indice ${next}` : 'Déclarer l’indice A',
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
            <Pill status={p.indice ? 'indice' : 'none'}>{p.indice ? `Indice ${p.indice}` : 'Sans indice'}</Pill>
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
            <a href={sheetsExportUrl(p.id)} download className={linkButtonClass}>
              Fiches PDF
            </a>
            <a href={listExportUrl(p.id)} download className={linkButtonClass}>
              Listing PDF
            </a>
            <Link to={`/projects/${p.id}/edit`}>
              <Button variant="primary">Modifier</Button>
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
      <div className="space-y-6">
        <LocationsSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
        <ItemsSection projectId={p.id} locations={locations.data ?? []} readOnly={readOnly} />
        <div>
          <Card title="Documents émis" label="Documents émis" padding="table">
            {exports.data && exports.data.length > 0 ? (
              <ul className="p-2 text-sm" aria-label="Documents émis">
                {exports.data.map((e) => {
                  const reference = e.id === referenceId
                  return (
                    <li
                      key={e.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 ${reference ? 'rounded-[7px] bg-accent-soft text-accent-ink' : ''}`}
                    >
                      <div className="min-w-0">
                        <a
                          href={fileContentUrl(e.fileId)}
                          download={e.originalName}
                          className={`block truncate font-medium ${reference ? 'text-accent-ink' : 'text-ink'}`}
                        >
                          {e.originalName}
                        </a>
                        <div className={`text-[12.5px] ${reference ? 'text-accent-ink/80' : 'text-ink-3'}`}>
                          {EXPORT_KIND_LABELS[e.kind]}
                          {e.indice ? ` · indice ${e.indice}` : e.kind === 'sheets_pdf' ? ' · sans indice' : ''} · {e.issuedAt.slice(0, 10)}
                        </div>
                      </div>
                      {reference && (
                        <span
                          className="rounded-[4px] bg-accent px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-white"
                          title={`Fiches de référence, indice ${p.indice}`}
                        >
                          {`Fiches de référence, indice ${p.indice}`}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-ink-3">Aucun document émis. « Fiches PDF » et « Listing PDF » émettent et conservent ici chaque version.</p>
            )}
          </Card>
        </div>
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
