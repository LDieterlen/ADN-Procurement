// The article form fields (ADR-0013), shared by the creation page and the article page: the spec
// sheet, then the budget block. Rendered inside a `Form`; the page owns the submit button.
import { useWatch, type UseFormReturn } from 'react-hook-form'
import type { CapturePreviewRead } from '../../api/queries/capture'
import type { ProductRead } from '../../api/queries/product'
import {
  ITEM_FAMILY_LABELS,
  ITEM_USAGE_LABELS,
  type ItemFamily,
  type ItemUsage,
  type ProjectItemCreate,
  type ProjectItemRead,
  type ProjectItemUpdate,
} from '../../api/queries/projectItem'
import { BpField } from '../../components/forms/BpField'
import { EntityPicker, type PickerOption } from '../../components/forms/EntityPicker'
import { MoneyField } from '../../components/forms/MoneyField'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { CURRENCIES } from '../suppliers/SupplierForm'

export type ItemFormValues = {
  name: string
  categoryId: number | null
  manufacturerId: number | null
  reference: string
  supplierId: number | null
  finish: string
  dimensions: string
  sourceUrl: string
  family: ItemFamily | ''
  usage: ItemUsage | ''
  comments: string
  unitCostCents: number | null
  currency: string
  fxRate: string
  discountBp: number | null
  quoteRef: string
  quoteIndice: string
  quoteUrl: string
}

export const EMPTY_ITEM: ItemFormValues = {
  name: '',
  categoryId: null,
  manufacturerId: null,
  reference: '',
  supplierId: null,
  finish: '',
  dimensions: '',
  sourceUrl: '',
  family: '',
  usage: '',
  comments: '',
  unitCostCents: null,
  currency: 'EUR',
  fxRate: '',
  discountBp: null,
  quoteRef: '',
  quoteIndice: '',
  quoteUrl: '',
}

const FAMILY_OPTIONS = [
  { value: '', label: '—' },
  ...(Object.keys(ITEM_FAMILY_LABELS) as ItemFamily[]).map((f) => ({ value: f, label: ITEM_FAMILY_LABELS[f] })),
]
const USAGE_OPTIONS = [{ value: '', label: '—' }, ...(Object.keys(ITEM_USAGE_LABELS) as ItemUsage[]).map((u) => ({ value: u, label: ITEM_USAGE_LABELS[u] }))]

export function fromItem(item: ProjectItemRead): ItemFormValues {
  return {
    name: item.name,
    categoryId: item.categoryId,
    manufacturerId: item.manufacturerId,
    reference: item.reference ?? '',
    supplierId: item.supplierId,
    finish: item.finish ?? '',
    dimensions: item.dimensions ?? '',
    sourceUrl: item.sourceUrl ?? '',
    family: item.family ?? '',
    usage: item.usage ?? '',
    comments: item.comments ?? '',
    unitCostCents: item.unitCostCents,
    currency: item.currency,
    fxRate: item.currency === 'EUR' ? '' : String(item.fxRateMicro / 1_000_000).replace('.', ','),
    discountBp: item.discountBp,
    quoteRef: item.quoteRef ?? '',
    quoteIndice: item.quoteIndice ?? '',
    quoteUrl: item.quoteUrl ?? '',
  }
}

/** The sheet of a catalogue product, copied into the form (the server copies the same fields). */
export function fromProduct(product: ProductRead, current: ItemFormValues): ItemFormValues {
  return {
    ...current,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId,
    reference: product.reference ?? '',
    supplierId: product.supplierId,
    finish: product.finish ?? '',
    dimensions: product.dimensions ?? '',
    sourceUrl: product.sourceUrl ?? '',
    unitCostCents: product.listPriceCents,
    currency: product.listPriceCents !== null ? product.currency : current.currency,
  }
}

/** A product page read by the server (ADR-0014): the generic fields, the rest stays as typed. */
export function fromCapture(found: CapturePreviewRead, current: ItemFormValues, manufacturerId: number | null): ItemFormValues {
  return {
    ...current,
    name: found.name ?? current.name,
    manufacturerId: manufacturerId ?? current.manufacturerId,
    reference: found.reference ?? current.reference,
    sourceUrl: found.url,
    unitCostCents: found.priceCents ?? current.unitCostCents,
    currency: found.priceCents !== null && found.currency ? found.currency : current.currency,
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())
const fxMicro = (text: string): number | null => {
  const fx = text.trim() ? Math.round(Number(text.replace(',', '.')) * 1_000_000) : null
  return fx && fx > 0 ? fx : null
}

export function toUpdatePayload(v: ItemFormValues, item: ProjectItemRead): ProjectItemUpdate {
  const payload: ProjectItemUpdate = {
    name: v.name,
    manufacturerId: v.manufacturerId,
    reference: orNull(v.reference),
    supplierId: v.supplierId,
    finish: orNull(v.finish),
    dimensions: orNull(v.dimensions),
    sourceUrl: orNull(v.sourceUrl),
    family: v.family || null,
    usage: v.usage || null,
    comments: orNull(v.comments),
    unitCostCents: v.unitCostCents ?? 0,
    currency: v.currency,
    discountBp: v.discountBp ?? 0,
    quoteRef: orNull(v.quoteRef),
    quoteIndice: orNull(v.quoteIndice),
    quoteUrl: orNull(v.quoteUrl),
  }
  if (item.kind === 'product') payload.categoryId = v.categoryId
  const fx = fxMicro(v.fxRate)
  if (v.currency !== 'EUR' && fx) payload.fxRateMicro = fx
  return payload
}

export function toCreatePayload(
  v: ItemFormValues,
  extra: { productId: number | null; addToCatalogue: boolean; locationId: number | null; qtyMilli: number },
): ProjectItemCreate {
  const fx = fxMicro(v.fxRate)
  return {
    kind: 'product',
    addToCatalogue: extra.addToCatalogue,
    sortOrder: 0,
    productId: extra.productId,
    name: orNull(v.name),
    categoryId: v.categoryId,
    manufacturerId: v.manufacturerId,
    reference: orNull(v.reference),
    supplierId: v.supplierId,
    finish: orNull(v.finish),
    dimensions: orNull(v.dimensions),
    sourceUrl: orNull(v.sourceUrl),
    family: v.family || null,
    usage: v.usage || null,
    comments: orNull(v.comments),
    unitCostCents: v.unitCostCents,
    currency: v.currency,
    fxRateMicro: v.currency !== 'EUR' ? fx : null,
    discountBp: v.discountBp,
    quoteRef: orNull(v.quoteRef),
    quoteIndice: orNull(v.quoteIndice),
    quoteUrl: orNull(v.quoteUrl),
    placements: [{ locationId: extra.locationId, qtyMilli: extra.qtyMilli, sortOrder: 0 }],
  }
}

export function ItemFields({
  form,
  kind,
  categories,
  manufacturers,
  suppliers,
  onCreateManufacturer,
  onCreateSupplier,
  contact,
}: {
  form: UseFormReturn<ItemFormValues>
  kind: ProjectItemRead['kind']
  categories: PickerOption[]
  manufacturers: PickerOption[]
  suppliers: PickerOption[]
  onCreateManufacturer?: () => void
  onCreateSupplier?: () => void
  contact?: string
}) {
  const currency = useWatch({ control: form.control, name: 'currency' })
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TextInput name="name" label="Désignation" autoFocus />
        </div>
        {kind === 'product' ? <EntityPicker name="categoryId" label="Type" options={categories} required /> : <div />}
        <EntityPicker name="manufacturerId" label="Fabricant" options={manufacturers} onCreate={onCreateManufacturer} />
        <TextInput name="reference" label="Référence" />
        <EntityPicker name="supplierId" label="Fournisseur" options={suppliers} onCreate={onCreateSupplier} />
        <TextInput name="dimensions" label="Dimensions" placeholder="L 120 × P 60 × H 75 cm" />
        <TextInput name="finish" label="Finitions" />
        <TextInput name="sourceUrl" label="Lien internet" placeholder="Adresse de la fiche produit" />
        <Select name="family" label="Famille" options={FAMILY_OPTIONS} />
        <Select name="usage" label="Usage" options={USAGE_OPTIONS} />
        <div className="col-span-3">
          <TextArea name="comments" label="Commentaires" hint="Imprimés sur la fiche de prescription" rows={2} />
        </div>
      </div>
      {contact && <p className="text-sm text-neutral-600">Contact fournisseur : {contact}</p>}
      <fieldset className="rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-semibold">Budget</legend>
        <div className="grid grid-cols-4 gap-4">
          <MoneyField name="unitCostCents" label="Prix unitaire HT" currency={currency} />
          <Select name="currency" label="Devise" options={CURRENCIES} />
          {currency !== 'EUR' ? <TextInput name="fxRate" label={`Taux (1 ${currency} = … €)`} placeholder="vide si déjà connu dans le projet" /> : <div />}
          <BpField name="discountBp" label="Remise" />
          <TextInput name="quoteRef" label="N° de devis" />
          <TextInput name="quoteIndice" label="Indice de devis" placeholder="A, B, C…" />
          <div className="col-span-2">
            <TextInput name="quoteUrl" label="Lien vers le devis" placeholder="Adresse du devis" />
          </div>
        </div>
      </fieldset>
    </>
  )
}
