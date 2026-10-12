// Creation modals used from the project (ADR-0012): client, supplier, manufacturer, product, without
// leaving the page. Each reuses the entity's own form and create hook; the created id goes back to the caller.
import { useState } from 'react'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import { useCreateClient } from '../../api/queries/client'
import { useCreateManufacturer, useManufacturers } from '../../api/queries/manufacturer'
import { useCreateProduct, type ProductRead } from '../../api/queries/product'
import { useCreateSupplier, useSuppliers } from '../../api/queries/supplier'
import { Modal } from '../../components/ui/Modal'
import { ClientForm, toPayload as clientPayload } from '../clients/ClientForm'
import { ManufacturerForm, toPayload as manufacturerPayload } from '../manufacturers/ManufacturerForm'
import { ProductForm, toPayload as productPayload } from '../products/ProductForm'
import { SupplierForm, toPayload as supplierPayload } from '../suppliers/SupplierForm'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

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

export function NewClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
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

export function NewSupplierModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
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

export function NewManufacturerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
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

/** Product creation with its own nested « new manufacturer / supplier » modals (one open at a time). */
export function NewProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (product: ProductRead) => void }) {
  const create = useCreateProduct()
  const categories = useCategories(false)
  const manufacturers = useManufacturers(ALL)
  const suppliers = useSuppliers(ALL)
  const errors = useModalErrors()
  const [nested, setNested] = useState<'manufacturer' | 'supplier' | null>(null)
  const [formKey, setFormKey] = useState(0)
  const categoryOptions = (categories.data ?? []).map((c) => ({ id: c.id, label: c.parentId != null ? `  ↳ ${c.name}` : `${c.code} — ${c.name}` }))
  return (
    <>
      <Modal open={open && nested === null} title="Nouveau produit" onClose={onClose} wide>
        <ProductForm
          key={formKey}
          categories={categoryOptions}
          manufacturers={(manufacturers.data?.items ?? []).map((m) => ({ id: m.id, label: m.name }))}
          suppliers={(suppliers.data?.items ?? []).map((s) => ({ id: s.id, label: s.name }))}
          onCreateManufacturer={() => setNested('manufacturer')}
          onCreateSupplier={() => setNested('supplier')}
          onSubmit={async (values) => {
            errors.reset()
            try {
              const created = await create.mutateAsync({ data: productPayload(values), force: false })
              onCreated(created)
            } catch (e) {
              errors.handle(e)
            }
          }}
          submitting={create.isPending}
          submitLabel="Créer le produit"
          banner={errors.banner}
          serverErrors={errors.serverErrors}
        />
      </Modal>
      <NewManufacturerModal
        open={open && nested === 'manufacturer'}
        onClose={() => setNested(null)}
        onCreated={() => {
          setNested(null)
          setFormKey((k) => k + 1) // the picker reloads with the new manufacturer; the user selects it
        }}
      />
      <NewSupplierModal
        open={open && nested === 'supplier'}
        onClose={() => setNested(null)}
        onCreated={() => {
          setNested(null)
          setFormKey((k) => k + 1)
        }}
      />
    </>
  )
}
