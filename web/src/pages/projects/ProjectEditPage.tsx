// Create (/projects/new) and the project page with tabs (/projects/:id): Infos, Zones (Lignes and Budget later).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useClients } from '../../api/queries/client'
import {
  CLOSED_STATUSES,
  PROJECT_STATUS_LABELS,
  useChangeProjectStatus,
  useCreateProject,
  useProject,
  useUpdateProject,
  type ProjectStatus,
} from '../../api/queries/project'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { ProjectForm, toPayload, type ProjectFormValues } from './ProjectForm'
import { StatusBadge } from './ProjectsPage'
import { BudgetTab } from './BudgetTab'
import { ItemsTab } from './ItemsTab'
import { ZonesTab } from './ZonesTab'

type Tab = 'infos' | 'zones' | 'items' | 'budget'

export function ProjectEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useProject(id)
  const clients = useClients('', false)
  const create = useCreateProject()
  const update = useUpdateProject()
  const changeStatus = useChangeProjectStatus()
  const errors = useSubmitErrors('projet')
  const [tab, setTab] = useState<Tab>('zones')

  async function submit(values: ProjectFormValues) {
    errors.reset()
    try {
      if (id === undefined) {
        const created = await create.mutateAsync(toPayload(values))
        errors.toast.show({ kind: 'success', message: `Projet ${created.code} créé ; ajouter ses zones.` })
        navigate(`/projects/${created.id}`)
      } else {
        await update.mutateAsync({ id, data: toPayload(values) })
        errors.toast.show({ kind: 'success', message: 'Projet enregistré.' })
      }
    } catch (error) {
      errors.handle(error, { resubmitForced: () => undefined, openExisting: () => undefined, restore: () => undefined })
    }
  }

  function askStatus(status: ProjectStatus) {
    if (id === undefined) return
    const closing = CLOSED_STATUSES.includes(status)
    errors.setDialog({
      title: `Passer le projet en « ${PROJECT_STATUS_LABELS[status]} » ?`,
      message: closing
        ? 'Le projet et ses zones passent en lecture seule ; le client pourra être archivé.'
        : 'Le statut est libre : il se change à tout moment.',
      actions: [
        {
          label: 'Confirmer',
          variant: closing ? 'danger' : 'primary',
          onClick: () =>
            void changeStatus
              .mutateAsync({ id, status })
              .then(() => errors.setDialog(null))
              .catch((error: unknown) => errors.setBanner(isApiError(error) ? error.message : String(error))),
        },
        { label: 'Annuler', onClick: () => errors.setDialog(null) },
      ],
    })
  }

  if (id !== undefined && existing.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (id !== undefined && existing.isError) {
    return (
      <EmptyState title={existing.error.message}>
        <Link to="/projects" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const project = existing.data
  const readOnly = project ? CLOSED_STATUSES.includes(project.status) : false
  const clientOptions = (clients.data ?? []).map((c) => ({ id: c.id, label: c.name }))
  if (project && !clientOptions.some((c) => c.id === project.clientId)) clientOptions.push({ id: project.clientId, label: `Client n° ${project.clientId}` })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          {project ? (
            <>
              <span className="font-mono text-base text-neutral-500">{project.code}</span>
              {project.name}
              <StatusBadge status={project.status} />
            </>
          ) : (
            'Nouveau projet'
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Link to="/projects">
            <Button variant="ghost">Retour</Button>
          </Link>
          {project && (
            <label className="flex items-center gap-1 text-sm">
              Statut
              <select
                value={project.status}
                onChange={(event) => askStatus(event.target.value as ProjectStatus)}
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
                aria-label="Changer le statut"
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      {errors.banner && !project && null}
      {project && (
        <nav className="flex gap-1 border-b border-neutral-200" aria-label="Onglets du projet">
          {(['infos', 'zones', 'items', 'budget'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm ${tab === t ? 'border-b-2 border-neutral-900 font-medium' : 'text-neutral-600'}`}
              aria-current={tab === t ? 'page' : undefined}
            >
              {t === 'infos' ? 'Infos' : t === 'zones' ? 'Zones' : t === 'items' ? 'Lignes' : 'Budget'}
            </button>
          ))}
        </nav>
      )}
      {readOnly && (
        <p className="text-sm text-neutral-600">
          Projet {PROJECT_STATUS_LABELS[project!.status].toLowerCase()} : lecture seule, changer le statut pour modifier.
        </p>
      )}
      {(!project || tab === 'infos') && !readOnly && (
        <ProjectForm
          key={project?.updatedAt ?? 'new'}
          initial={project}
          clients={clientOptions}
          onSubmit={submit}
          submitting={create.isPending || update.isPending}
          submitLabel={project ? 'Enregistrer' : 'Créer'}
          banner={errors.banner}
          serverErrors={errors.serverErrors}
        />
      )}
      {project && tab === 'zones' && <ZonesTab projectId={project.id} readOnly={readOnly} />}
      {project && tab === 'items' && <ItemsTab projectId={project.id} readOnly={readOnly} />}
      {project && tab === 'budget' && <BudgetTab projectId={project.id} readOnly={readOnly} />}
      <ConfirmDialog open={errors.dialog !== null} title={errors.dialog?.title ?? ''} actions={errors.dialog?.actions ?? []}>
        {errors.dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
