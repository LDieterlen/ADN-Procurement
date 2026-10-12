// Pure product form: identity, references, list price (HT/TTC + VAT + date), dimensions, finishes, source.
import { useEffect } from 'react'
import { useForm, useWatch, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { ProductCreate, ProductRead } from '../../api/queries/product'
import { BpField } from '../../components/forms/BpField'
import { DateField } from '../../components/forms/DateField'
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
  description: string
  categoryId: number | null
  manufacturerId: number | null
  manufacturerRef: string
  gtin: string
  supplierId: number | null
  supplierRef: string
  unit: ProductRead['unit']
  listPriceCents: number | null
  listPriceCurrency: string
  listPriceTaxMode: ProductRead['listPriceTaxMode']
  listPriceVatBp: number | null
  listPriceOn: string | null
  leadTimeWeeks: string
  widthMm: string
  depthMm: string
  heightMm: string
  diameterMm: string
  materials: string
  finish: string
  color: string
  sourceUrl: string
  discontinuedOn: string | null
  notes: string
}

const EMPTY: ProductFormValues = {
  name: '',
  description: '',
  categoryId: null,
  manufacturerId: null,
  manufacturerRef: '',
  gtin: '',
  supplierId: null,
  supplierRef: '',
  unit: 'piece',
  listPriceCents: null,
  listPriceCurrency: 'EUR',
  listPriceTaxMode: 'ht',
  listPriceVatBp: null,
  listPriceOn: null,
  leadTimeWeeks: '',
  widthMm: '',
  depthMm: '',
  heightMm: '',
  diameterMm: '',
  materials: '',
  finish: '',
  color: '',
  sourceUrl: '',
  discontinuedOn: null,
  notes: '',
}

export const UNIT_OPTIONS = [
  { value: 'piece', label: 'Pièce' },
  { value: 'pair', label: 'Paire' },
  { value: 'set', label: 'Ensemble' },
  { value: 'lot', label: 'Lot' },
  { value: 'm', label: 'Mètre linéaire' },
  { value: 'm2', label: 'Mètre carré' },
  { value: 'roll', label: 'Rouleau' },
]
const TAX_OPTIONS = [
  { value: 'ht', label: 'HT' },
  { value: 'ttc', label: 'TTC' },
]

export function fromProduct(p: ProductRead): ProductFormValues {
  const num = (v: number | null) => (v === null ? '' : String(v))
  return {
    name: p.name,
    description: p.description ?? '',
    categoryId: p.categoryId,
    manufacturerId: p.manufacturerId,
    manufacturerRef: p.manufacturerRef ?? '',
    gtin: p.gtin ?? '',
    supplierId: p.supplierId,
    supplierRef: p.supplierRef ?? '',
    unit: p.unit,
    listPriceCents: p.listPriceCents,
    listPriceCurrency: p.listPriceCurrency,
    listPriceTaxMode: p.listPriceTaxMode,
    listPriceVatBp: p.listPriceVatBp,
    listPriceOn: p.listPriceOn,
    leadTimeWeeks: num(p.leadTimeWeeks),
    widthMm: num(p.widthMm),
    depthMm: num(p.depthMm),
    heightMm: num(p.heightMm),
    diameterMm: num(p.diameterMm),
    materials: p.materials ?? '',
    finish: p.finish ?? '',
    color: p.color ?? '',
    sourceUrl: p.sourceUrl ?? '',
    discontinuedOn: p.discontinuedOn,
    notes: p.notes ?? '',
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())
const intOrNull = (text: string): number | null => (text.trim() === '' ? null : Number.parseInt(text, 10))

export function toPayload(v: ProductFormValues): ProductCreate {
  return {
    name: v.name,
    description: orNull(v.description),
    categoryId: v.categoryId ?? 0,
    manufacturerId: v.manufacturerId,
    manufacturerRef: orNull(v.manufacturerRef),
    gtin: orNull(v.gtin),
    supplierId: v.supplierId,
    supplierRef: orNull(v.supplierRef),
    unit: v.unit,
    listPriceCents: v.listPriceCents,
    listPriceCurrency: v.listPriceCurrency,
    listPriceTaxMode: v.listPriceTaxMode,
    listPriceVatBp: v.listPriceTaxMode === 'ttc' ? v.listPriceVatBp : null,
    listPriceOn: v.listPriceOn,
    leadTimeWeeks: intOrNull(v.leadTimeWeeks),
    widthMm: intOrNull(v.widthMm),
    depthMm: intOrNull(v.depthMm),
    heightMm: intOrNull(v.heightMm),
    diameterMm: intOrNull(v.diameterMm),
    materials: orNull(v.materials),
    finish: orNull(v.finish),
    color: orNull(v.color),
    sourceUrl: orNull(v.sourceUrl),
    sourceKind: orNull(v.sourceUrl) ? 'url' : 'manual',
    discontinuedOn: v.discontinuedOn,
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
  const taxMode = useWatch({ control: form.control, name: 'listPriceTaxMode' })
  const currency = useWatch({ control: form.control, name: 'listPriceCurrency' })

  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<ProductFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])

  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-4xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <EntityPicker name="categoryId" label="Catégorie" options={categories} required />
        <EntityPicker name="manufacturerId" label="Fabricant" options={manufacturers} onCreate={onCreateManufacturer} />
        <TextInput name="manufacturerRef" label="Référence fabricant" />
        <EntityPicker name="supplierId" label="Fournisseur par défaut" options={suppliers} onCreate={onCreateSupplier} />
        <TextInput name="supplierRef" label="Référence fournisseur" />
        <Select name="unit" label="Unité" options={UNIT_OPTIONS} />
        <TextInput name="gtin" label="GTIN / EAN" inputMode="numeric" />
      </div>
      <fieldset className="max-w-4xl rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-600">Prix catalogue observé</legend>
        <div className="grid grid-cols-4 gap-4">
          <MoneyField name="listPriceCents" label="Prix" currency={currency} />
          <Select name="listPriceCurrency" label="Devise" options={CURRENCIES} />
          <Select name="listPriceTaxMode" label="HT / TTC" options={TAX_OPTIONS} />
          {taxMode === 'ttc' ? <BpField name="listPriceVatBp" label="TVA incluse" hint="Taux à déduire pour revenir au HT" /> : <div />}
          <DateField name="listPriceOn" label="Tarif du" />
          <TextInput name="leadTimeWeeks" label="Délai habituel (semaines)" inputMode="numeric" />
          <DateField name="discontinuedOn" label="Arrêté le" hint="Produit retiré du catalogue" />
        </div>
      </fieldset>
      <fieldset className="max-w-4xl rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-600">Dimensions et finitions</legend>
        <div className="grid grid-cols-4 gap-4">
          <TextInput name="widthMm" label="Largeur (mm)" inputMode="numeric" />
          <TextInput name="depthMm" label="Profondeur (mm)" inputMode="numeric" />
          <TextInput name="heightMm" label="Hauteur (mm)" inputMode="numeric" />
          <TextInput name="diameterMm" label="Diamètre (mm)" inputMode="numeric" />
          <TextInput name="materials" label="Matériaux" />
          <TextInput name="finish" label="Finition" />
          <TextInput name="color" label="Couleur" />
        </div>
      </fieldset>
      <div className="grid max-w-4xl grid-cols-2 gap-4">
        <TextInput name="sourceUrl" label="URL source" placeholder="Adresse de la fiche produit" />
      </div>
      <div className="max-w-4xl space-y-4">
        <TextArea name="description" label="Description" />
        <TextArea name="notes" label="Notes internes" rows={2} />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
