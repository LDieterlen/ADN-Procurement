// Side panel of one line: specification, pricing (net directly or list + discount), currency and rate,
// placements (« Ajouter à une autre zone »), deletion of pristine drafts. Status moves live in 7c.
import { useEffect, useState } from 'react'
import { useForm, useWatch, type Path } from 'react-hook-form'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import type { ZoneRead } from '../../api/queries/project'
import {
  ITEM_KIND_LABELS,
  ITEM_STATUS_LABELS,
  useAddPlacement,
  useChangeItemStatus,
  useDeleteItem,
  useItemEvents,
  useReplaceItemProduct,
  useDeletePlacement,
  useProjectItem,
  useRefreshItem,
  useUpdateItem,
  useUpdatePlacement,
  type ItemStatus,
  type ProjectItemRead,
  type ProjectItemUpdate,
} from '../../api/queries/projectItem'
import { useProducts } from '../../api/queries/product'
import { useItemQuotes, useRetainQuoteLine } from '../../api/queries/quote'
import { useSuppliers } from '../../api/queries/supplier'
import { BpField } from '../../components/forms/BpField'
import { DateField } from '../../components/forms/DateField'
import { EntityPicker } from '../../components/forms/EntityPicker'
import { Form } from '../../components/forms/Form'
import { MoneyField } from '../../components/forms/MoneyField'
import { milliToText, textToMilli } from '../../components/forms/QuantityField'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { centsToText } from '../../components/forms/MoneyField'
import { CURRENCIES } from '../suppliers/SupplierForm'
import { UNIT_OPTIONS } from '../products/ProductForm'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

type Values = {
  name: string
  clientDescription: string
  kind: ProjectItemRead['kind']
  categoryId: number | null
  supplierId: number | null
  unit: ProjectItemRead['unit']
  finish: string
  color: string
  materials: string
  priceMode: 'net' | 'list'
  unitCostCents: number | null
  discountBp: number | null
  currency: string
  fxRate: string
  vatRateBp: number | null
  leadTimeWeeks: string
  requiredOnSite: string | null
  quoteRef: string
  orderRef: string
  onHold: boolean
  internalNotes: string
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

function fromItem(item: ProjectItemRead): Values {
  return {
    name: item.name,
    clientDescription: item.clientDescription ?? '',
    kind: item.kind,
    categoryId: item.categoryId,
    supplierId: item.supplierId,
    unit: item.unit,
    finish: item.finish ?? '',
    color: item.color ?? '',
    materials: item.materials ?? '',
    priceMode: item.discountBp > 0 ? 'list' : 'net',
    unitCostCents: item.unitCostCents,
    discountBp: item.discountBp,
    currency: item.currency,
    fxRate: (item.fxRateMicro / 1_000_000).toFixed(6).replace('.', ','),
    vatRateBp: item.vatRateBp,
    leadTimeWeeks: item.leadTimeWeeks === null ? '' : String(item.leadTimeWeeks),
    requiredOnSite: item.requiredOnSite,
    quoteRef: item.quoteRef ?? '',
    orderRef: item.orderRef ?? '',
    onHold: item.onHold,
    internalNotes: item.internalNotes ?? '',
  }
}

function toPayload(v: Values): ProjectItemUpdate {
  const fx = Math.round(Number(v.fxRate.replace(',', '.').replace(/\s/g, '')) * 1_000_000)
  return {
    name: v.name,
    clientDescription: orNull(v.clientDescription),
    kind: v.kind,
    categoryId: v.categoryId ?? undefined,
    supplierId: v.supplierId,
    unit: v.unit,
    finish: orNull(v.finish),
    color: orNull(v.color),
    materials: orNull(v.materials),
    unitCostCents: v.unitCostCents ?? 0,
    discountBp: v.priceMode === 'net' ? 0 : (v.discountBp ?? 0),
    currency: v.currency,
    fxRateMicro: v.currency === 'EUR' ? 1_000_000 : fx > 0 ? fx : undefined,
    vatRateBp: v.vatRateBp ?? 0,
    leadTimeWeeks: v.leadTimeWeeks.trim() === '' ? null : Number.parseInt(v.leadTimeWeeks, 10),
    requiredOnSite: v.requiredOnSite,
    quoteRef: orNull(v.quoteRef),
    orderRef: orNull(v.orderRef),
    onHold: v.onHold,
    internalNotes: orNull(v.internalNotes),
  }
}

function PlacementsEditor({ item, zones, readOnly }: { item: ProjectItemRead; zones: ZoneRead[]; readOnly: boolean }) {
  const add = useAddPlacement()
  const update = useUpdatePlacement()
  const remove = useDeletePlacement()
  const toast = useToast()
  const [newZone, setNewZone] = useState<string>('')
  const [newQty, setNewQty] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const used = new Set(item.placements.map((p) => p.zoneId))
  const free = zones.filter((z) => z.archivedAt === null && !used.has(z.id))
  const zoneLabel = (id: number | null) => (id === null ? 'Non affecté' : (zones.find((z) => z.id === id)?.name ?? `Zone ${id}`))

  function fail(e: unknown) {
    const message = isApiError(e) ? (e.details[0]?.message ?? e.message) : String(e)
    setError(message)
    toast.show({ kind: 'error', message })
  }

  return (
    <fieldset className="rounded border border-neutral-200 p-3">
      <legend className="px-1 text-sm font-medium text-neutral-600">Placements</legend>
      <ul className="space-y-1 text-sm">
        {item.placements.map((placement) => (
          <li key={placement.id} className="flex items-center gap-2">
            <span className="w-40">{zoneLabel(placement.zoneId)}</span>
            <input
              aria-label={`Quantité ${zoneLabel(placement.zoneId)}`}
              defaultValue={milliToText(placement.qtyMilli)}
              className="w-20 rounded border border-neutral-300 px-2 py-1 text-right"
              disabled={readOnly}
              onBlur={(event) => {
                const milli = textToMilli(event.target.value)
                if (milli !== undefined && milli !== null && milli !== placement.qtyMilli)
                  update.mutateAsync({ id: placement.id, data: { qtyMilli: milli } }).catch(fail)
              }}
            />
            {!readOnly && (
              <button
                type="button"
                className="text-xs text-red-700 underline"
                onClick={() => remove.mutateAsync(placement.id).catch(fail)}
                aria-label={`Retirer de ${zoneLabel(placement.zoneId)}`}
              >
                Retirer
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="mt-2 flex items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Ajouter à une autre zone
            <select
              value={newZone}
              onChange={(event) => setNewZone(event.target.value)}
              className="rounded border border-neutral-300 bg-white px-2 py-1"
              aria-label="Zone à ajouter"
            >
              <option value="">Choisir…</option>
              {!used.has(null) && <option value="none">Non affecté</option>}
              {free.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name} (×{z.multiplier})
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label="Quantité à ajouter"
            value={newQty}
            onChange={(event) => setNewQty(event.target.value)}
            className="w-20 rounded border border-neutral-300 px-2 py-1 text-right"
          />
          <Button
            disabled={!newZone || add.isPending}
            onClick={() => {
              const milli = textToMilli(newQty)
              if (milli === undefined || milli === null) return setError('Quantité invalide.')
              add
                .mutateAsync({ itemId: item.id, data: { zoneId: newZone === 'none' ? null : Number(newZone), qtyMilli: milli, sortOrder: 0, notes: null } })
                .then(() => setNewZone(''))
                .catch(fail)
            }}
          >
            Ajouter
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function ItemForm({
  item,
  categories,
  suppliers,
  onSubmit,
  serverErrors,
  banner,
  readOnly,
}: {
  item: ProjectItemRead
  categories: { id: number; label: string }[]
  suppliers: { id: number; label: string }[]
  onSubmit: (v: Values) => Promise<void>
  serverErrors: ErrorDetail[]
  banner: string | null
  readOnly: boolean
}) {
  const form = useForm<Values>({ defaultValues: fromItem(item) })
  const priceMode = useWatch({ control: form.control, name: 'priceMode' })
  const currency = useWatch({ control: form.control, name: 'currency' })
  useEffect(() => {
    for (const detail of serverErrors) {
      const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
      if (field in form.getValues()) form.setError(field as Path<Values>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])
  const terminal = item.status === 'cancelled' || item.status === 'replaced'
  const locked = readOnly || terminal
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <fieldset disabled={locked} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <TextInput name="name" label="Désignation" />
          <Select
            name="kind"
            label="Type"
            options={(Object.keys(ITEM_KIND_LABELS) as ProjectItemRead['kind'][]).map((k) => ({ value: k, label: ITEM_KIND_LABELS[k] }))}
          />
          <EntityPicker name="categoryId" label="Catégorie" options={categories} required />
          <EntityPicker name="supplierId" label="Fournisseur" options={suppliers} />
          <Select name="unit" label="Unité" options={UNIT_OPTIONS} />
          <TextInput name="finish" label="Finition" />
          <TextInput name="color" label="Couleur" />
          <TextInput name="materials" label="Matériaux" />
        </div>
        <fieldset className="rounded border border-neutral-200 p-3">
          <legend className="px-1 text-sm font-medium text-neutral-600">Prix figé</legend>
          <div className="grid grid-cols-2 gap-3">
            <Select
              name="priceMode"
              label="Saisie"
              options={[
                { value: 'net', label: 'Net direct' },
                { value: 'list', label: 'Tarif + remise' },
              ]}
            />
            <MoneyField name="unitCostCents" label={priceMode === 'net' ? 'Prix unitaire net HT' : 'Tarif unitaire HT'} currency={currency} />
            {priceMode === 'list' && <BpField name="discountBp" label="Remise" />}
            <Select name="currency" label="Devise" options={CURRENCIES} />
            {currency !== 'EUR' && <TextInput name="fxRate" label="Taux (1 unité = … €)" hint="Figé sur la ligne" />}
            <BpField name="vatRateBp" label="TVA" />
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <TextInput name="leadTimeWeeks" label="Délai (semaines)" inputMode="numeric" />
          <DateField name="requiredOnSite" label="Besoin sur chantier" />
          <TextInput name="quoteRef" label="Réf. devis" />
          <TextInput name="orderRef" label="Réf. commande" hint="Requise pour « commandé »" />
        </div>
        <TextArea name="clientDescription" label="Description client" rows={2} />
        <TextArea name="internalNotes" label="Notes internes" rows={2} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('onHold')} /> En attente
        </label>
        {!locked && (
          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        )}
      </fieldset>
    </Form>
  )
}

// --- 7c : statut avec confirmation et note, remplacement, historique ---------------------------

const NEXT_STATUSES: Record<ItemStatus, ItemStatus[]> = {
  draft: ['specified', 'quoted', 'approved', 'cancelled'],
  specified: ['draft', 'quoted', 'approved', 'cancelled'],
  quoted: ['draft', 'specified', 'approved', 'cancelled'],
  approved: ['draft', 'specified', 'quoted', 'ordered', 'cancelled'],
  ordered: ['delivered', 'cancelled'],
  delivered: ['installed', 'cancelled'],
  installed: ['cancelled'],
  cancelled: ['draft'],
  replaced: [],
}

function StatusSection({ item, readOnly }: { item: ProjectItemRead; readOnly: boolean }) {
  const change = useChangeItemStatus()
  const toast = useToast()
  const [target, setTarget] = useState<ItemStatus | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const options = NEXT_STATUSES[item.status]
  const noteRequired =
    target === 'cancelled' || item.status === 'cancelled' || (item.status === 'approved' && ['draft', 'specified', 'quoted'].includes(target))

  function confirm() {
    if (!target) return
    change
      .mutateAsync({ id: item.id, data: { status: target, note: note.trim() || null } })
      .then(() => {
        toast.show({ kind: 'success', message: `Ligne ${item.itemCode} : ${ITEM_STATUS_LABELS[target]}.` })
        setTarget('')
        setNote('')
        setError(null)
      })
      .catch((e: unknown) => setError(isApiError(e) ? e.details.map((d) => d.message).join(' ') || e.message : String(e)))
  }

  if (readOnly || options.length === 0) return null
  return (
    <fieldset className="rounded border border-neutral-200 p-3">
      <legend className="px-1 text-sm font-medium text-neutral-600">Statut</legend>
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Passer en
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value as ItemStatus | '')}
            className="rounded border border-neutral-300 bg-white px-2 py-1"
            aria-label="Nouveau statut"
          >
            <option value="">Choisir…</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {ITEM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <Button variant={target === 'cancelled' ? 'danger' : 'primary'} disabled={!target || change.isPending} onClick={confirm}>
          Confirmer
        </Button>
      </div>
      {target && (
        <label className="mt-2 flex flex-col gap-1 text-sm">
          Note {noteRequired ? '(obligatoire)' : '(facultative)'}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            className="rounded border border-neutral-300 px-2 py-1"
            aria-label="Note de transition"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function ReplaceSection({ item, onReplaced }: { item: ProjectItemRead; onReplaced: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const products = useProducts({ q: search, includeArchived: false, categoryId: null, manufacturerId: null, supplierId: null, limit: 50, offset: 0 })
  const replace = useReplaceItemProduct()
  const toast = useToast()
  if (item.status !== 'approved') return null
  return (
    <fieldset className="rounded border border-neutral-200 p-3">
      <legend className="px-1 text-sm font-medium text-neutral-600">Remplacer le produit</legend>
      {!open && <Button onClick={() => setOpen(true)}>Remplacer (nouvelle ligne, celle-ci devient « remplacée »)</Button>}
      {open && (
        <div className="space-y-2 text-sm">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un produit…"
            aria-label="Produit de remplacement : recherche"
            className="w-full rounded border border-neutral-300 px-2 py-1"
          />
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1"
            aria-label="Produit de remplacement"
          >
            <option value="">Choisir…</option>
            {(products.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Note (rupture, changement client…)"
            className="w-full rounded border border-neutral-300 px-2 py-1"
            aria-label="Note de remplacement"
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={!productId || replace.isPending}
              onClick={() =>
                replace
                  .mutateAsync({ id: item.id, data: { productId: Number(productId), note: note.trim() || null } })
                  .then((created) => {
                    toast.show({ kind: 'success', message: `Nouvelle ligne ${created.itemCode} ; l'ancienne est remplacée.` })
                    onReplaced(created.id)
                  })
                  .catch((e: unknown) => setError(isApiError(e) ? e.message : String(e)))
              }
            >
              Remplacer
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}

const EVENT_LABELS: Record<string, string> = {
  created: 'Création',
  status: 'Statut',
  price: 'Prix',
  fx: 'Taux de change',
  qty: 'Quantité',
  product: 'Produit',
  placement: 'Placements',
  approval: 'Validation client',
  other: 'Autre',
}

function describeEvent(e: { kind: string; fromStatus: string | null; toStatus: string | null; oldValue: string | null; newValue: string | null }): string {
  if (e.kind === 'status' && e.toStatus)
    return `${e.fromStatus ? ITEM_STATUS_LABELS[e.fromStatus as ItemStatus] + ' → ' : ''}${ITEM_STATUS_LABELS[e.toStatus as ItemStatus]}`
  if (e.kind === 'approval' && e.newValue) {
    try {
      const v = JSON.parse(e.newValue) as { unitNetEur: number; qty: number }
      return `validé à ${centsToText(v.unitNetEur)} € l'unité × ${v.qty / 1000}`
    } catch {
      return e.newValue
    }
  }
  if ((e.kind === 'price' || e.kind === 'quote') && e.newValue) {
    try {
      const o = e.oldValue ? (JSON.parse(e.oldValue) as { cost: number; currency: string }) : null
      const n = JSON.parse(e.newValue) as { cost: number; currency: string; discount: number }
      return `${o ? centsToText(o.cost) + ' → ' : ''}${centsToText(n.cost)} ${n.currency} brut, remise ${n.discount / 100} %`
    } catch {
      return e.newValue
    }
  }
  return [e.oldValue, e.newValue].filter(Boolean).join(' → ')
}

function QuotesSection({ item, readOnly }: { item: ProjectItemRead; readOnly: boolean }) {
  const quotes = useItemQuotes(item.id)
  const retain = useRetainQuoteLine()
  const toast = useToast()
  const canRetain = !readOnly && !['ordered', 'delivered', 'installed', 'cancelled', 'replaced'].includes(item.status)
  if (!quotes.data || quotes.data.length === 0) return null
  return (
    <section className="space-y-1 border-t border-neutral-200 pt-3" aria-label="Devis de la ligne">
      <h3 className="text-sm font-medium">Devis</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left uppercase text-neutral-500">
            <th className="px-1">Fournisseur</th>
            <th className="px-1">Réf.</th>
            <th className="px-1 text-right">Net</th>
            <th className="px-1 text-right">Net €</th>
            <th className="px-1 text-right">Délai</th>
            <th className="px-1"></th>
          </tr>
        </thead>
        <tbody>
          {quotes.data.map((q) => (
            <tr key={q.quoteLineId} className={q.retained ? 'bg-green-50 font-medium' : q.declined ? 'text-neutral-400 line-through' : ''}>
              <td className="px-1">{q.supplierName}</td>
              <td className="px-1 font-mono">{q.reference}</td>
              <td className="px-1 text-right">
                {centsToText(q.netUnitCents)} {q.currency}
              </td>
              <td className="px-1 text-right">{centsToText(q.netUnitEurCents)}</td>
              <td className="px-1 text-right">{q.leadTimeWeeks !== null ? `${q.leadTimeWeeks} sem.` : ''}</td>
              <td className="px-1 text-right">
                {q.retained ? (
                  <span className="text-green-800">retenu</span>
                ) : (
                  canRetain &&
                  !q.declined && (
                    <Button
                      onClick={() =>
                        retain
                          .mutateAsync(q.quoteLineId)
                          .then(() => toast.show({ kind: 'success', message: `Devis ${q.reference} retenu.` }))
                          .catch((e: unknown) =>
                            toast.show({ kind: 'error', message: isApiError(e) ? (e.details[0]?.message ?? e.message) : String(e), persistent: true }),
                          )
                      }
                      aria-label={`Retenir le devis ${q.reference}`}
                    >
                      Retenir
                    </Button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function HistorySection({ itemId }: { itemId: number }) {
  const events = useItemEvents(itemId)
  const [open, setOpen] = useState(false)
  return (
    <fieldset className="rounded border border-neutral-200 p-3">
      <legend className="px-1 text-sm font-medium text-neutral-600">
        <button type="button" className="underline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Historique {events.data ? `(${events.data.length})` : ''}
        </button>
      </legend>
      {open && (
        <ol className="space-y-1 text-xs" aria-label="Historique de la ligne">
          {(events.data ?? []).map((e) => (
            <li key={e.id} className="flex gap-2">
              <span className="w-36 shrink-0 font-mono text-neutral-500">{e.changedAt.replace('T', ' ').replace('Z', '')}</span>
              <span className="w-28 shrink-0 font-medium">{EVENT_LABELS[e.kind] ?? e.kind}</span>
              <span>
                {describeEvent(e)}
                {e.note && <em className="ml-1 text-neutral-600">— {e.note}</em>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  )
}

export function ItemPanel({ itemId: initialItemId, zones, readOnly, onClose }: { itemId: number; zones: ZoneRead[]; readOnly: boolean; onClose: () => void }) {
  const [itemId, setItemId] = useState(initialItemId)
  const item = useProjectItem(itemId)
  const categories = useCategories(false)
  const suppliers = useSuppliers(ALL)
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const refresh = useRefreshItem()
  const toast = useToast()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)

  async function submit(values: Values) {
    setServerErrors([])
    setBanner(null)
    try {
      await update.mutateAsync({ id: itemId, data: toPayload(values) })
      toast.show({ kind: 'success', message: 'Ligne enregistrée.' })
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') {
        setServerErrors(error.details)
        setBanner(error.message)
      } else setBanner(error.message)
    }
  }

  const categoryOptions = (categories.data ?? []).map((c) => ({ id: c.id, label: c.parentId != null ? `  ↳ ${c.name}` : `${c.code} — ${c.name}` }))
  const supplierOptions = (suppliers.data?.items ?? []).map((s) => ({ id: s.id, label: s.name }))

  return (
    <aside
      role="dialog"
      aria-label="Fiche de la ligne"
      className="fixed inset-y-0 right-0 z-30 w-[34rem] overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {item.data ? (
            <>
              <span className="font-mono text-sm text-neutral-500">{item.data.itemCode}</span> {item.data.name}
              <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs">{ITEM_STATUS_LABELS[item.data.status]}</span>
            </>
          ) : (
            'Chargement…'
          )}
        </h2>
        <Button variant="ghost" onClick={onClose} aria-label="Fermer le panneau">
          ✕
        </Button>
      </div>
      {item.isError && <p className="text-sm text-red-700">{item.error.message}</p>}
      {item.data && (
        <div className="space-y-4">
          <ItemForm
            key={item.data.updatedAt}
            item={item.data}
            categories={categoryOptions}
            suppliers={supplierOptions}
            onSubmit={submit}
            serverErrors={serverErrors}
            banner={banner}
            readOnly={readOnly}
          />
          <PlacementsEditor item={item.data} zones={zones} readOnly={readOnly || item.data.status === 'cancelled' || item.data.status === 'replaced'} />
          <QuotesSection item={item.data} readOnly={readOnly} />
          <StatusSection item={item.data} readOnly={readOnly} />
          {!readOnly && <ReplaceSection item={item.data} onReplaced={setItemId} />}
          <HistorySection itemId={item.data.id} />
          {!readOnly && (
            <div className="flex gap-2 border-t border-neutral-200 pt-3">
              {item.data.productId !== null && (
                <Button
                  onClick={() =>
                    refresh
                      .mutateAsync(itemId)
                      .then(() => toast.show({ kind: 'success', message: 'Prix catalogue recopié.' }))
                      .catch((e: unknown) => setBanner(isApiError(e) ? e.message : String(e)))
                  }
                >
                  Rafraîchir depuis le catalogue
                </Button>
              )}
              {item.data.status === 'draft' && (
                <Button
                  variant="danger"
                  onClick={() =>
                    remove
                      .mutateAsync(itemId)
                      .then(() => {
                        toast.show({ kind: 'success', message: 'Brouillon supprimé.' })
                        onClose()
                      })
                      .catch((e: unknown) => setBanner(isApiError(e) ? e.message : String(e)))
                  }
                >
                  Supprimer le brouillon
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
