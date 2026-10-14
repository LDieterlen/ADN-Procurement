// The article form fields (ADR-0013), shared by the creation page and the article page: the spec
// sheet, then the budget block. Rendered inside a `Form`; the page owns the submit button.
import { useWatch, type UseFormReturn } from 'react-hook-form'
import type { CapturePreviewRead } from '../../api/queries/capture'
import { type ProjectItemCreate, type ProjectItemRead, type ProjectItemUpdate } from '../../api/queries/projectItem'
import { BpField } from '../../components/forms/BpField'
import { useChoiceLabels } from '../../api/queries/choice'
import { EntityPicker, type PickerOption } from '../../components/forms/EntityPicker'
import { LinkField } from '../../components/forms/LinkField'
import { MoneyField } from '../../components/forms/MoneyField'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { CURRENCIES } from '../suppliers/SupplierForm'

export type ItemFormValues = {
  name: string
  categoryId: number | null
  reference: string
  supplierId: number | null
  productName: string
  finish: string
  dimensions: string
  leadTime: string
  sourceUrl: string
  family: string
  usage: string
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
  reference: '',
  supplierId: null,
  productName: '',
  finish: '',
  dimensions: '',
  leadTime: '',
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

export function fromItem(item: ProjectItemRead): ItemFormValues {
  return {
    name: item.name,
    categoryId: item.categoryId,
    reference: item.reference ?? '',
    supplierId: item.supplierId,
    productName: item.productName,
    finish: item.finish ?? '',
    dimensions: item.dimensions ?? '',
    leadTime: item.leadTime ?? '',
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

/** The short designation from a product page's name: its first part, before a comma or a separator
 * (« Lampe Bic noir design / LED - H 178 cm » → « Lampe Bic noir design »); a hyphen inside a word
 * (« Lave-mains ») is not a separator. Nothing left before it = the whole name. */
export function designationOf(name: string): string {
  const first = name.split(/[,;:/|()[\]•·–—]|\s-\s/)[0]?.trim() ?? ''
  return first || name.trim()
}

/** A product page read by the server (ADR-0014): the generic fields, the rest stays as typed. */
export function fromCapture(found: CapturePreviewRead, current: ItemFormValues, supplierId: number | null, categoryId: number | null = null): ItemFormValues {
  return {
    ...current,
    name: found.name ? designationOf(found.name) : current.name,
    productName: found.name ?? current.productName,
    supplierId: supplierId ?? current.supplierId,
    categoryId: categoryId ?? current.categoryId,
    dimensions: found.dimensions ?? current.dimensions,
    leadTime: found.leadTime ?? current.leadTime,
    finish: found.finish ?? current.finish,
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
    name: v.name.trim() || v.productName.trim(),
    reference: orNull(v.reference),
    supplierId: v.supplierId,
    productName: v.productName.trim(),
    finish: orNull(v.finish),
    dimensions: orNull(v.dimensions),
    leadTime: orNull(v.leadTime),
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

export function toCreatePayload(v: ItemFormValues, extra: { locationId: number | null; qtyMilli: number }): ProjectItemCreate {
  const fx = fxMicro(v.fxRate)
  return {
    kind: 'product',
    sortOrder: 0,
    name: orNull(v.name) ?? orNull(v.productName),
    categoryId: v.categoryId,
    reference: orNull(v.reference),
    supplierId: v.supplierId,
    productName: orNull(v.productName),
    finish: orNull(v.finish),
    dimensions: orNull(v.dimensions),
    leadTime: orNull(v.leadTime),
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
  suppliers,
  onCreateSupplier,
  contact,
}: {
  form: UseFormReturn<ItemFormValues>
  kind: ProjectItemRead['kind']
  categories: PickerOption[]
  suppliers: PickerOption[]
  onCreateSupplier?: () => void
  contact?: string
}) {
  const currency = useWatch({ control: form.control, name: 'currency' })
  const families = useChoiceLabels('family')
  const usages = useChoiceLabels('usage')
  return (
    <>
      <div className="grid grid-cols-3 gap-x-[18px] gap-y-4">
        <div className="col-span-2">
          <TextInput name="productName" label="Nom" hint="Nom complet du produit, tel que le fournisseur l'écrit" autoFocus />
        </div>
        {kind === 'product' ? <EntityPicker name="categoryId" label="Type" options={categories} required /> : <div />}
        <div className="col-span-3">
          <TextInput name="name" label="Désignation" hint="Vide = le nom" />
        </div>
        <TextInput name="reference" label="Référence" />
        <EntityPicker name="supplierId" label="Fournisseur" options={suppliers} onCreate={onCreateSupplier} />
        <TextInput name="dimensions" label="Dimensions" placeholder="L 120 × P 60 × H 75 cm" />
        <TextInput name="finish" label="Finitions" />
        <TextInput name="leadTime" label="Délai" placeholder="ex. 6 à 8 semaines" />
        <LinkField name="sourceUrl" label="Lien internet" placeholder="Adresse de la fiche produit" />
        <Select name="family" label="Famille" options={[{ value: '', label: '—' }, ...families.options]} />
        <Select name="usage" label="Usage" options={[{ value: '', label: '—' }, ...usages.options]} />
        <div className="col-span-3">
          <TextArea name="comments" label="Commentaires" hint="Imprimés sur la fiche de prescription" rows={2} />
        </div>
      </div>
      {contact && <p className="text-sm text-ink-2">Contact fournisseur : {contact}</p>}
      <section aria-label="Budget" className="rounded-[10px] border border-line bg-surface px-6 py-5">
        <h3 className="mb-4 text-base font-semibold">Budget</h3>
        <div className="grid grid-cols-4 gap-x-[18px] gap-y-4">
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
      </section>
    </>
  )
}
