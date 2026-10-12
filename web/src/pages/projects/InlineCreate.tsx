// Creation modals used from the project pages (ADR-0012/0013): client, supplier, manufacturer, without
// leaving the page. Each reuses the entity's own form and create hook; the created id goes back to the caller.
import { useState } from 'react'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useCreateClient } from '../../api/queries/client'
import { useCreateManufacturer } from '../../api/queries/manufacturer'
import { useCreateSupplier } from '../../api/queries/supplier'
import { Modal } from '../../components/ui/Modal'
import { ClientForm, toPayload as clientPayload } from '../clients/ClientForm'
import { ManufacturerForm, toPayload as manufacturerPayload } from '../manufacturers/ManufacturerForm'
import { SupplierForm, toPayload as supplierPayload } from '../suppliers/SupplierForm'

function useModalErrors() {
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const reset = () => {
    setServerErrors([])
    setBanner(null)
  }
  const handle = (error: unknown) => {
    if (!isApiError(error)) throw error
    if (error.code === 'validation_error') setServerErrors(error.details)
    setBanner(error.message)
  }
  return { serverErrors, banner, reset, handle }
}

type ModalProps = { open: boolean; onClose: () => void; onCreated: (id: number) => void }

export function NewClientModal({ open, onClose, onCreated }: ModalProps) {
  const create = useCreateClient()
  const errors = useModalErrors()
  return (
    <Modal open={open} title="Nouveau client" onClose={onClose} wide>
      <ClientForm
        onSubmit={async (values) => {
          errors.reset()
          try {
            const created = await create.mutateAsync({ data: clientPayload(values), force: false })
            onCreated(created.id)
          } catch (e) {
            errors.handle(e)
          }
        }}
        submitting={create.isPending}
        submitLabel="Créer"
        banner={errors.banner}
        serverErrors={errors.serverErrors}
      />
    </Modal>
  )
}

export function NewSupplierModal({ open, onClose, onCreated }: ModalProps) {
  const create = useCreateSupplier()
  const errors = useModalErrors()
  return (
    <Modal open={open} title="Nouveau fournisseur" onClose={onClose} wide>
      <SupplierForm
        onSubmit={async (values) => {
          errors.reset()
          try {
            const created = await create.mutateAsync({ data: supplierPayload(values), force: false })
            onCreated(created.id)
          } catch (e) {
            errors.handle(e)
          }
        }}
        submitting={create.isPending}
        submitLabel="Créer"
        banner={errors.banner}
        serverErrors={errors.serverErrors}
      />
    </Modal>
  )
}

export function NewManufacturerModal({ open, onClose, onCreated }: ModalProps) {
  const create = useCreateManufacturer()
  const errors = useModalErrors()
  return (
    <Modal open={open} title="Nouveau fabricant" onClose={onClose}>
      <ManufacturerForm
        onSubmit={async (values) => {
          errors.reset()
          try {
            const created = await create.mutateAsync({ data: manufacturerPayload(values), force: false })
            onCreated(created.id)
          } catch (e) {
            errors.handle(e)
          }
        }}
        submitting={create.isPending}
        banner={errors.banner}
        serverErrors={errors.serverErrors}
      />
    </Modal>
  )
}
