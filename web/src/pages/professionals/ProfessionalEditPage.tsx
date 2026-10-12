import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useArchiveProfessional, useCreateProfessional, useProfessional, useUnarchiveProfessional, useUpdateProfessional } from '../../api/queries/professional'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { ProfessionalForm, toPayload, type ProfessionalFormValues } from './ProfessionalForm'

export function ProfessionalEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useProfessional(id)
  const create = useCreateProfessional()
  const update = useUpdateProfessional()
  const archive = useArchiveProfessional()
  const unarchive = useUnarchiveProfessional()
  const errors = useSubmitErrors('professionnel')

  async function submit(values: ProfessionalFormValues, force = false) {
    errors.reset()
    try {
      if (id === undefined) {
        const created = await create.mutateAsync({ data: toPayload(values), force })
        errors.toast.show({ kind: 'success', message: `Professionnel « ${created.name} » créé.` })
      } else {
        await update.mutateAsync({ id, data: toPayload(values) })
        errors.toast.show({ kind: 'success', message: 'Professionnel enregistré.' })
      }
      navigate('/professionals')
    } catch (error) {
      errors.handle(error, {
        resubmitForced: () => void submit(values, true),
        openExisting: (existingId) => navigate(`/professionals/${existingId}`),
        restore: (archivedId) => void unarchive.mutateAsync(archivedId).then(() => navigate(`/professionals/${archivedId}`)),
      })
    }
  }

  function confirmArchive() {
    if (id === undefined) return
    errors.setDialog({
      title: 'Archiver ce professionnel ?',
      message: 'Il disparaît des sélecteurs mais reste consultable.',
      actions: [
        {
          label: 'Archiver',
          variant: 'danger',
          onClick: () =>
            void archive
              .mutateAsync(id)
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
        <Link to="/professionals" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const professional = existing.data
  const archived = professional?.archivedAt != null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {professional ? professional.name : 'Nouveau professionnel'}
          {archived && <span className="ml-3 rounded bg-neutral-200 px-2 py-0.5 align-middle text-xs">Archivé</span>}
        </h1>
        <div className="flex gap-2">
          <Link to="/professionals">
            <Button variant="ghost">Retour</Button>
          </Link>
          {professional && !archived && (
            <Button variant="danger" onClick={confirmArchive}>
              Archiver
            </Button>
          )}
          {professional && archived && (
            <Button variant="primary" disabled={unarchive.isPending} onClick={() => void unarchive.mutateAsync(professional.id)}>
              Restaurer
            </Button>
          )}
        </div>
      </div>
      {archived ? (
        <p className="text-sm text-neutral-600">Professionnel archivé : restaurer pour modifier.</p>
      ) : (
        <ProfessionalForm
          key={professional?.updatedAt ?? 'new'}
          initial={professional}
          onSubmit={(values) => submit(values)}
          submitting={create.isPending || update.isPending}
          banner={errors.banner}
          serverErrors={errors.serverErrors}
        />
      )}
      <ConfirmDialog open={errors.dialog !== null} title={errors.dialog?.title ?? ''} actions={errors.dialog?.actions ?? []}>
        {errors.dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
