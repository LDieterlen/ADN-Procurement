import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useArchiveSupplier, useCreateSupplier, useSupplier, useUnarchiveSupplier, useUpdateSupplier } from '../../api/queries/supplier'
import { Button, buttonClass } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { SupplierForm, toPayload, type SupplierFormValues } from './SupplierForm'

export function SupplierEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useSupplier(id)
  const create = useCreateSupplier()
  const update = useUpdateSupplier()
  const archive = useArchiveSupplier()
  const unarchive = useUnarchiveSupplier()
  const errors = useSubmitErrors('fournisseur')

  async function submit(values: SupplierFormValues, force = false) {
    errors.reset()
    try {
      if (id === undefined) {
        const created = await create.mutateAsync({ data: toPayload(values), force })
        errors.toast.show({ kind: 'success', message: `Fournisseur « ${created.name} » créé.` })
      } else {
        await update.mutateAsync({ id, data: toPayload(values) })
        errors.toast.show({ kind: 'success', message: 'Fournisseur enregistré.' })
      }
      navigate('/suppliers')
    } catch (error) {
      errors.handle(error, {
        resubmitForced: () => void submit(values, true),
        openExisting: (existingId) => navigate(`/suppliers/${existingId}`),
        restore: (archivedId) => void unarchive.mutateAsync(archivedId).then(() => navigate(`/suppliers/${archivedId}`)),
      })
    }
  }

  function confirmArchive() {
    if (id === undefined) return
    errors.setDialog({
      title: 'Archiver ce fournisseur ?',
      message: 'Il disparaît des sélecteurs mais reste consultable ; les lignes existantes ne sont pas touchées.',
      actions: [
        {
          label: 'Archiver',
          variant: 'danger',
          onClick: () =>
            void archive
              .mutateAsync(id)
              .then(() => {
                errors.setDialog(null)
                errors.toast.show({ kind: 'success', message: 'Fournisseur archivé.' })
              })
              .catch((error: unknown) => errors.setBanner(isApiError(error) ? error.message : String(error))),
        },
        { label: 'Annuler', onClick: () => errors.setDialog(null) },
      ],
    })
  }

  if (id !== undefined && existing.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
  if (id !== undefined && existing.isError) {
    return (
      <EmptyState title={existing.error.message}>
        <Link to="/suppliers" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const supplier = existing.data
  const archived = supplier?.archivedAt != null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          {supplier ? supplier.name : 'Nouveau fournisseur'}
          {archived && <span className="ml-3 rounded bg-track px-2 py-0.5 align-middle text-xs">Archivé</span>}
        </h1>
        <div className="flex gap-2">
          <Link to="/suppliers" className={buttonClass('ghost')}>
            Retour
          </Link>
          {supplier && !archived && (
            <Button variant="danger" onClick={confirmArchive}>
              Archiver
            </Button>
          )}
          {supplier && archived && (
            <Button
              variant="primary"
              disabled={unarchive.isPending}
              onClick={() => void unarchive.mutateAsync(supplier.id).then(() => errors.toast.show({ kind: 'success', message: 'Fournisseur restauré.' }))}
            >
              Restaurer
            </Button>
          )}
        </div>
      </div>
      {archived ? (
        <p className="text-sm text-ink-2">Fournisseur archivé : restaurer pour modifier.</p>
      ) : (
        <SupplierForm
          key={supplier?.updatedAt ?? 'new'}
          initial={supplier}
          onSubmit={(values) => submit(values)}
          submitting={create.isPending || update.isPending}
          submitLabel={supplier ? 'Enregistrer' : 'Créer'}
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
