// Create (/projects/new) and edit (/projects/:id/edit) a project; a client can be created in place.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useClients } from '../../api/queries/client'
import { useCreateProject, useProject, useUpdateProject } from '../../api/queries/project'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { NewClientModal } from './InlineCreate'
import { fromProject, ProjectForm, toPayload, toUpdatePayload, type ProjectFormValues } from './ProjectForm'

const EMPTY: ProjectFormValues = { name: '', code: '', clientId: null, siteAddress: '', dueOn: null, notes: '', globalBudgetCents: null }

export function ProjectEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useProject(id)
  const clients = useClients('', false)
  const create = useCreateProject()
  const update = useUpdateProject()
  const errors = useSubmitErrors('projet')
  const [newClient, setNewClient] = useState(false)
  const form = useForm<ProjectFormValues>({ defaultValues: EMPTY })

  async function submit(values: ProjectFormValues) {
    errors.reset()
    try {
      if (id === undefined) {
        const created = await create.mutateAsync(toPayload(values))
        errors.toast.show({ kind: 'success', message: `Projet ${created.code} créé ; ajouter ses localisations et ses articles.` })
        navigate(`/projects/${created.id}`)
      } else {
        await update.mutateAsync({ id, data: toUpdatePayload(values) })
        errors.toast.show({ kind: 'success', message: 'Projet enregistré.' })
        navigate(`/projects/${id}`)
      }
    } catch (error) {
      errors.handle(error, { resubmitForced: () => undefined, openExisting: () => undefined, restore: () => undefined })
    }
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
  if (project && form.getValues('name') === '' && !form.formState.isDirty) form.reset(fromProject(project))
  const clientOptions = (clients.data ?? []).map((c) => ({ id: c.id, label: c.name }))
  if (project && !clientOptions.some((c) => c.id === project.clientId)) clientOptions.push({ id: project.clientId, label: `Client n° ${project.clientId}` })

  return (
    <section>
      <PageHeader
        title={project ? `Modifier ${project.name}` : 'Nouveau projet'}
        crumbs={
          <>
            <Link to="/projects" className="hover:underline">
              Projets
            </Link>
            {project && (
              <>
                {' / '}
                <Link to={`/projects/${project.id}`} className="hover:underline">
                  {project.name}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <Link to={project ? `/projects/${project.id}` : '/projects'}>
            <Button variant="ghost">Retour</Button>
          </Link>
        }
      />
      <Card>
        <ProjectForm
          form={form}
          initial={project}
          clients={clientOptions}
          onCreateClient={() => setNewClient(true)}
          onSubmit={submit}
          submitting={create.isPending || update.isPending}
          submitLabel={project ? 'Enregistrer' : 'Créer le projet'}
          banner={errors.banner}
          serverErrors={errors.serverErrors}
        />
      </Card>
      <NewClientModal
        open={newClient}
        onClose={() => setNewClient(false)}
        onCreated={(clientId) => {
          setNewClient(false)
          form.setValue('clientId', clientId, { shouldDirty: true })
          errors.toast.show({ kind: 'success', message: 'Client créé.' })
        }}
      />
      <ConfirmDialog open={errors.dialog !== null} title={errors.dialog?.title ?? ''} actions={errors.dialog?.actions ?? []}>
        {errors.dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
