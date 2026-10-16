// Create (/clients/new) and edit (/clients/:id): data, mutations and the error path of ARCHITECTURE §3.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useArchiveClient, useClient, useCreateClient, useUnarchiveClient, useUpdateClient } from '../../api/queries/client'
import { Button, buttonClass } from '../../components/ui/Button'
import { ConfirmDialog, type DialogAction } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { ClientForm, toPayload, type ClientFormValues } from './ClientForm'

type Dialog = { title: string; message: string; actions: DialogAction[] } | null

export function ClientEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const toast = useToast()
  const existing = useClient(id)
  const create = useCreateClient()
  const update = useUpdateClient()
  const archive = useArchiveClient()
  const unarchive = useUnarchiveClient()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)

  const submitting = create.isPending || update.isPending

  async function submit(values: ClientFormValues, force = false) {
    setServerErrors([])
    setBanner(null)
    setDialog(null)
    const payload = toPayload(values)
    try {
      if (id === undefined) {
        const created = await create.mutateAsync({ data: payload, force })
        toast.show({ kind: 'success', message: `Client « ${created.name} » créé.` })
      } else {
        await update.mutateAsync({ id, data: payload })
        toast.show({ kind: 'success', message: 'Client enregistré.' })
      }
      navigate('/clients')
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') {
        setServerErrors(error.details)
        setBanner(error.message)
      } else if (error.code === 'duplicate' && error.existingId !== undefined) {
        const existingId = error.existingId
        setDialog({
          title: 'Un client porte déjà ce nom',
          message: error.message,
          actions: [
            { label: "Ouvrir l'existant", variant: 'primary', onClick: () => navigate(`/clients/${existingId}`) },
            { label: 'Créer quand même', onClick: () => void submit(values, true) },
            { label: 'Annuler', onClick: () => setDialog(null) },
          ],
        })
      } else if (error.code === 'conflict' && error.archivedId !== undefined) {
        const archivedId = error.archivedId
        setDialog({
          title: 'Un client archivé porte déjà ce nom',
          message: error.message,
          actions: [
            {
              label: 'Restaurer',
              variant: 'primary',
              onClick: () => void unarchive.mutateAsync(archivedId).then(() => navigate(`/clients/${archivedId}`)),
            },
            { label: 'Annuler', onClick: () => setDialog(null) },
          ],
        })
      } else if (error.code === 'conflict' || error.code === 'not_found') {
        setBanner(error.message)
      } else {
        toast.show({ kind: 'error', message: error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
      }
    }
  }

  function confirmArchive() {
    if (id === undefined) return
    setDialog({
      title: 'Archiver ce client ?',
      message: 'Il disparaît des listes mais reste consultable ; ses projets ne sont pas touchés.',
      actions: [
        {
          label: 'Archiver',
          variant: 'danger',
          onClick: () =>
            void archive
              .mutateAsync(id)
              .then(() => {
                setDialog(null)
                toast.show({ kind: 'success', message: 'Client archivé.' })
              })
              .catch((error: unknown) => setBanner(isApiError(error) ? error.message : String(error))),
        },
        { label: 'Annuler', onClick: () => setDialog(null) },
      ],
    })
  }

  function restore() {
    if (id === undefined) return
    void unarchive
      .mutateAsync(id)
      .then(() => toast.show({ kind: 'success', message: 'Client restauré.' }))
      .catch((error: unknown) => setBanner(isApiError(error) ? error.message : String(error)))
  }

  if (id !== undefined && existing.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
  if (id !== undefined && existing.isError) {
    return (
      <EmptyState title={existing.error.message}>
        <Link to="/clients" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const client = existing.data
  const archived = client?.archivedAt != null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          {client ? client.name : 'Nouveau client'}
          {archived && <span className="ml-3 rounded bg-track px-2 py-0.5 align-middle text-xs">Archivé</span>}
        </h1>
        <div className="flex gap-2">
          <Link to="/clients" className={buttonClass('ghost')}>
            Retour
          </Link>
          {client && !archived && (
            <Button variant="danger" onClick={confirmArchive}>
              Archiver
            </Button>
          )}
          {client && archived && (
            <Button variant="primary" onClick={restore} disabled={unarchive.isPending}>
              Restaurer
            </Button>
          )}
        </div>
      </div>
      {archived ? (
        <p className="text-sm text-ink-2">Client archivé : restaurer pour modifier.</p>
      ) : (
        <ClientForm
          key={client?.updatedAt ?? 'new'}
          initial={client}
          onSubmit={(values) => submit(values)}
          submitting={submitting}
          submitLabel={client ? 'Enregistrer' : 'Créer'}
          banner={banner}
          serverErrors={serverErrors}
        />
      )}
      <ConfirmDialog open={dialog !== null} title={dialog?.title ?? ''} actions={dialog?.actions ?? []}>
        {dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
