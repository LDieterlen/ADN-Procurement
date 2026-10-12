// Pure product form (ADR-0013): name, type, manufacturer, reference, supplier, list price, dimensions, finish, link, notes.
import { useEffect } from 'react'
import { useForm, useWatch, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { ProductCreate, ProductRead } from '../../api/queries/product'
import { EntityPicker, type PickerOption } from '../../components/forms/EntityPicker'
import { Form } from '../../components/forms/Form'
import { MoneyField } from '../../components/forms/MoneyField'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { CURRENCIES } from '../suppliers/SupplierForm'

export type ProductFormValues = {
  name: string
  categoryId: number | null
  manufacturerId: number | null
  reference: string
  supplierId: number | null
  listPriceCents: number | null
  currency: string
  dimensions: string
  finish: string
  sourceUrl: string
  notes: string
}

const EMPTY: ProductFormValues = {
  name: '',
  categoryId: null,
  manufacturerId: null,
  reference: '',
  supplierId: null,
  listPriceCents: null,
  currency: 'EUR',
  dimensions: '',
  finish: '',
  sourceUrl: '',
  notes: '',
}

export function fromProduct(p: ProductRead): ProductFormValues {
  return {
    name: p.name,
    categoryId: p.categoryId,
    manufacturerId: p.manufacturerId,
    reference: p.reference ?? '',
    supplierId: p.supplierId,
    listPriceCents: p.listPriceCents,
    currency: p.currency,
    dimensions: p.dimensions ?? '',
    finish: p.finish ?? '',
    sourceUrl: p.sourceUrl ?? '',
    notes: p.notes ?? '',
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function toPayload(v: ProductFormValues): ProductCreate {
  return {
    name: v.name,
    categoryId: v.categoryId ?? 0,
    manufacturerId: v.manufacturerId,
    reference: orNull(v.reference),
    supplierId: v.supplierId,
    listPriceCents: v.listPriceCents,
    currency: v.currency,
    dimensions: orNull(v.dimensions),
    finish: orNull(v.finish),
    sourceUrl: orNull(v.sourceUrl),
    notes: orNull(v.notes),
  }
}

export function ProductForm({
  initial,
  categories,
  manufacturers,
  suppliers,
  onSubmit,
  submitting,
  submitLabel,
  banner,
  serverErrors,
  onCreateManufacturer,
  onCreateSupplier,
}: {
  initial?: ProductRead
  categories: PickerOption[]
  manufacturers: PickerOption[]
  suppliers: PickerOption[]
  onCreateManufacturer?: () => void
  onCreateSupplier?: () => void
  onSubmit: (values: ProductFormValues) => void | Promise<void>
  submitting: boolean
  submitLabel: string
  banner?: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<ProductFormValues>({ defaultValues: initial ? fromProduct(initial) : EMPTY })
  const currency = useWatch({ control: form.control, name: 'currency' })

  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<ProductFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])

  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-4xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <EntityPicker name="categoryId" label="Type" options={categories} required />
        <EntityPicker name="manufacturerId" label="Fabricant" options={manufacturers} onCreate={onCreateManufacturer} />
        <TextInput name="reference" label="Référence" />
        <EntityPicker name="supplierId" label="Fournisseur" options={suppliers} onCreate={onCreateSupplier} />
        <div className="grid grid-cols-2 gap-4">
          <MoneyField name="listPriceCents" label="Prix HT" currency={currency} />
          <Select name="currency" label="Devise" options={CURRENCIES} />
        </div>
        <TextInput name="dimensions" label="Dimensions" placeholder="L 120 × P 60 × H 75 cm" />
        <TextInput name="finish" label="Finitions" />
        <div className="col-span-2">
          <TextInput name="sourceUrl" label="Lien internet" placeholder="Adresse de la fiche produit" />
        </div>
        <div className="col-span-2">
          <TextArea name="notes" label="Notes" rows={2} />
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
