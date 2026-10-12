// « Ajouter un produit » (ADR-0012): from the catalogue or as a free line, with the zone, the location
// and the quantity; supplier, manufacturer and product can be created on the spot through modals.
// Prices and currencies are resolved by the server (product defaults, project rate).
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import { useProducts } from '../../api/queries/product'
import type { ZoneRead } from '../../api/queries/project'
import { ITEM_KIND_LABELS, ITEM_LOCATION_LABELS, useCreateItem, type ItemKind, type ItemLocation, type ProjectItemCreate } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { EntityPicker } from '../../components/forms/EntityPicker'
import { Form } from '../../components/forms/Form'
import { MoneyField } from '../../components/forms/MoneyField'
import { QuantityField } from '../../components/forms/QuantityField'
import { Select } from '../../components/forms/Select'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { useToast } from '../../components/ui/Toast'
import { CURRENCIES } from '../suppliers/SupplierForm'
import { NewProductModal, NewSupplierModal } from './InlineCreate'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

type Values = {
  productId: number | null
  name: string
  categoryId: number | null
  supplierId: number | null
  kind: ItemKind
  zoneId: number | null
  location: ItemLocation | ''
  qtyMilli: number | null
  unitCostCents: number | null
  currency: string
  fxRate: string
}

export const LOCATION_OPTIONS = [
  { value: '', label: '—' },
  ...(Object.keys(ITEM_LOCATION_LABELS) as ItemLocation[]).map((l) => ({ value: l, label: ITEM_LOCATION_LABELS[l] })),
]

export function AddItemDrawer({ projectId, zones, onClose }: { projectId: number; zones: ZoneRead[]; onClose: () => void }) {
  const [mode, setMode] = useState<'catalogue' | 'free'>('catalogue')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'product' | 'supplier' | null>(null)
  const products = useProducts({ ...ALL, q: search, categoryId: null, manufacturerId: null, supplierId: null, limit: 50 })
  const categories = useCategories(false)
  const suppliers = useSuppliers(ALL)
  const create = useCreateItem()
  const toast = useToast()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<Values>({
    defaultValues: {
      productId: null,
      name: '',
      categoryId: null,
      supplierId: null,
      kind: 'ffe',
      zoneId: zones[0]?.id ?? null,
      location: '',
      qtyMilli: 1000,
      unitCostCents: null,
      currency: 'EUR',
      fxRate: '',
    },
  })
  for (const detail of serverErrors) {
    const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
    if (field in form.getValues() && !form.formState.errors[field as keyof Values])
      form.setError(field as keyof Values, { type: 'server', message: detail.message })
  }

  async function submit(values: Values) {
    setServerErrors([])
    setBanner(null)
    const fx = values.fxRate.trim() ? Math.round(Number(values.fxRate.replace(',', '.')) * 1_000_000) : null
    const data: ProjectItemCreate = {
      productId: mode === 'catalogue' ? values.productId : null,
      name: mode === 'free' ? values.name : null,
      categoryId: mode === 'free' ? values.categoryId : null,
      supplierId: mode === 'free' ? values.supplierId : null,
      kind: values.kind,
      location: values.location || null,
      unitCostCents: mode === 'free' ? (values.unitCostCents ?? 0) : null,
      currency: mode === 'free' ? values.currency : null,
      fxRateMicro: fx && fx > 0 ? fx : null,
      sortOrder: 0,
      placements: [{ zoneId: values.zoneId, qtyMilli: values.qtyMilli ?? 1000, sortOrder: 0, notes: null }],
    }
    try {
      const created = await create.mutateAsync({ projectId, data })
      toast.show({ kind: 'success', message: `${created.itemCode} ajouté.` })
      onClose()
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') setServerErrors(error.details)
      setBanner(error.message)
    }
  }

  const productOptions = (products.data?.items ?? []).map((p) => ({ id: p.id, label: p.name, hint: p.manufacturerRef ?? undefined }))
  const categoryOptions = (categories.data ?? []).map((c) => ({ id: c.id, label: c.parentId != null ? `  ↳ ${c.name}` : `${c.code} — ${c.name}` }))
  const supplierOptions = (suppliers.data?.items ?? []).map((s) => ({ id: s.id, label: s.name }))
  const zoneOptions = zones.map((z) => ({ id: z.id, label: `${z.code} — ${z.name} (×${z.multiplier})` }))

  return (
    <>
      <Drawer label="Ajouter un produit" title="Ajouter un produit" onClose={onClose}>
        <div className="mb-3 flex gap-2 text-sm">
          <Button variant={mode === 'catalogue' ? 'primary' : 'secondary'} onClick={() => setMode('catalogue')}>
            Depuis le catalogue
          </Button>
          <Button variant={mode === 'free' ? 'primary' : 'secondary'} onClick={() => setMode('free')}>
            Ligne libre
          </Button>
        </div>
        <Form form={form} onSubmit={submit} banner={banner}>
          <div className="grid grid-cols-2 gap-3">
            {mode === 'catalogue' ? (
              <>
                <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
                  Rechercher un produit
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                    placeholder="Nom ou référence…"
                  />
                </label>
                <EntityPicker name="productId" label="Produit" options={productOptions} required onCreate={() => setModal('product')} />
              </>
            ) : (
              <>
                <TextInput name="name" label="Désignation" autoFocus />
                <EntityPicker name="categoryId" label="Typologie" options={categoryOptions} required />
                <EntityPicker name="supplierId" label="Fournisseur" options={supplierOptions} onCreate={() => setModal('supplier')} />
                <MoneyField name="unitCostCents" label="Prix unitaire HT" />
                <Select name="currency" label="Devise" options={CURRENCIES} />
              </>
            )}
            <EntityPicker name="zoneId" label="Zone" options={zoneOptions} emptyLabel="Non affecté" />
            <Select name="location" label="Localisation" options={LOCATION_OPTIONS} />
            <QuantityField name="qtyMilli" label="Quantité par zone" />
            <Select name="kind" label="Type" options={(Object.keys(ITEM_KIND_LABELS) as ItemKind[]).map((k) => ({ value: k, label: ITEM_KIND_LABELS[k] }))} />
            <TextInput name="fxRate" label="Taux de change (1 unité = … €)" placeholder="vide si EUR ou déjà connu" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={create.isPending}>
              Ajouter
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </Form>
      </Drawer>
      <NewProductModal
        open={modal === 'product'}
        onClose={() => setModal(null)}
        onCreated={(product) => {
          setModal(null)
          setSearch('')
          form.setValue('productId', product.id)
          toast.show({ kind: 'success', message: `Produit « ${product.name} » créé.` })
        }}
      />
      <NewSupplierModal
        open={modal === 'supplier'}
        onClose={() => setModal(null)}
        onCreated={(id) => {
          setModal(null)
          form.setValue('supplierId', id)
          toast.show({ kind: 'success', message: 'Fournisseur créé.' })
        }}
      />
    </>
  )
}
