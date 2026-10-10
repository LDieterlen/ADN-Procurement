import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import {
  useArchiveManufacturer,
  useCreateManufacturer,
  useManufacturer,
  useUnarchiveManufacturer,
  useUpdateManufacturer,
  type ManufacturerCreate,
  type ManufacturerRead,
} from '../../api/queries/manufacturer'
import { Form } from '../../components/forms/Form'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'

type Values = { name: string; website: string; notes: string }
const EMPTY: Values = { name: '', website: '', notes: '' }
const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())
const toPayload = (v: Values): ManufacturerCreate => ({ name: v.name, website: orNull(v.website), notes: orNull(v.notes) })

function ManufacturerForm({
  initial,
  onSubmit,
  submitting,
  banner,
  serverErrors,
}: {
  initial?: ManufacturerRead
  onSubmit: (values: Values) => void | Promise<void>
  submitting: boolean
  banner: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<Values>({ defaultValues: initial ? { name: initial.name, website: initial.website ?? '', notes: initial.notes ?? '' } : EMPTY })
  useEffect(() => {
    for (const detail of serverErrors) if (detail.field in EMPTY) form.setError(detail.field as Path<Values>, { type: 'server', message: detail.message })
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <TextInput name="website" label="Site web" />
      </div>
      <div className="max-w-3xl">
        <TextArea name="notes" label="Notes internes" />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {initial ? 'Enregistrer' : 'Créer'}
      </Button>
    </Form>
  )
}

export function ManufacturerEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useManufacturer(id)
  const create = useCreateManufacturer()
  const update = useUpdateManufacturer()
  const archive = useArchiveManufacturer()
  const unarchive = useUnarchiveManufacturer()
  const errors = useSubmitErrors('fabricant')

  async function submit(values: Values, force = false) {
    errors.reset()
    try {
      if (id === undefined) {
        const created = await create.mutateAsync({ data: toPayload(values), force })
        errors.toast.show({ kind: 'success', message: `Fabricant « ${created.name} » créé.` })
      } else {
        await update.mutateAsync({ id, data: toPayload(values) })
        errors.toast.show({ kind: 'success', message: 'Fabricant enregistré.' })
      }
      navigate('/manufacturers')
    } catch (error) {
      errors.handle(error, {
        resubmitForced: () => void submit(values, true),
        openExisting: (existingId) => navigate(`/manufacturers/${existingId}`),
        restore: (archivedId) => void unarchive.mutateAsync(archivedId).then(() => navigate(`/manufacturers/${archivedId}`)),
      })
    }
  }

  function confirmArchive() {
    if (id === undefined) return
    errors.setDialog({
      title: 'Archiver ce fabricant ?',
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
        <Link to="/manufacturers" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const manufacturer = existing.data
  const archived = manufacturer?.archivedAt != null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {manufacturer ? manufacturer.name : 'Nouveau fabricant'}
          {archived && <span className="ml-3 rounded bg-neutral-200 px-2 py-0.5 align-middle text-xs">Archivé</span>}
        </h1>
        <div className="flex gap-2">
          <Link to="/manufacturers">
            <Button variant="ghost">Retour</Button>
          </Link>
          {manufacturer && !archived && (
            <Button variant="danger" onClick={confirmArchive}>
              Archiver
            </Button>
          )}
          {manufacturer && archived && (
            <Button variant="primary" disabled={unarchive.isPending} onClick={() => void unarchive.mutateAsync(manufacturer.id)}>
              Restaurer
            </Button>
          )}
        </div>
      </div>
      {archived ? (
        <p className="text-sm text-neutral-600">Fabricant archivé : restaurer pour modifier.</p>
      ) : (
        <ManufacturerForm
          key={manufacturer?.updatedAt ?? 'new'}
          initial={manufacturer}
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
