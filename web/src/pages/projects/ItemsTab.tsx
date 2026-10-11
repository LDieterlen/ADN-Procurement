// « Lignes » tab: lines grouped by zone, amounts from the server summary (never computed here),
// filters, « Commander avant le » (server), quick add, side panel, print with a client variant (7b, 7c).
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl, useProducts } from '../../api/queries/product'
import { useZones, type ZoneRead } from '../../api/queries/project'
import {
  ITEM_KIND_LABELS,
  ITEM_STATUS_LABELS,
  useCreateItem,
  useProjectItems,
  useProjectSummary,
  type ItemFilters,
  type ItemKind,
  type ItemStatus,
  type LineAmountsRead,
  type ProjectItemCreate,
  type ProjectItemRead,
} from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { EntityPicker } from '../../components/forms/EntityPicker'
import { Form } from '../../components/forms/Form'
import { centsToText, MoneyField } from '../../components/forms/MoneyField'
import { milliToText, QuantityField } from '../../components/forms/QuantityField'
import { Select } from '../../components/forms/Select'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { CURRENCIES } from '../suppliers/SupplierForm'
import { ExportsBar } from './ExportsBar'
import { ItemPanel } from './ItemPanel'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }
const NO_FILTERS: ItemFilters = { status: null, kind: null, supplierId: null, q: '' }

export function fxToText(micro: number): string {
  return (micro / 1_000_000).toFixed(6).replace('.', ',')
}

type QuickValues = {
  productId: number | null
  name: string
  categoryId: number | null
  kind: ItemKind
  zoneId: number | null
  qtyMilli: number | null
  unitCostCents: number | null
  currency: string
  fxRate: string
}

function QuickAdd({ projectId, zones, mode, onClose }: { projectId: number; zones: ZoneRead[]; mode: 'catalogue' | 'free'; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const products = useProducts({ ...ALL, q: search, categoryId: null, manufacturerId: null, supplierId: null, limit: 50 })
  const categories = useCategories(false)
  const create = useCreateItem()
  const toast = useToast()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<QuickValues>({
    defaultValues: {
      productId: null,
      name: '',
      categoryId: null,
      kind: 'ffe',
      zoneId: zones[0]?.id ?? null,
      qtyMilli: 1000,
      unitCostCents: null,
      currency: 'EUR',
      fxRate: '',
    },
  })
  for (const detail of serverErrors) {
    const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
    if (field in form.getValues() && !form.formState.errors[field as keyof QuickValues])
      form.setError(field as keyof QuickValues, { type: 'server', message: detail.message })
  }

  async function submit(values: QuickValues) {
    setServerErrors([])
    setBanner(null)
    const fx = values.fxRate.trim() ? Math.round(Number(values.fxRate.replace(',', '.')) * 1_000_000) : null
    const data: ProjectItemCreate = {
      productId: mode === 'catalogue' ? values.productId : null,
      name: mode === 'free' ? values.name : null,
      categoryId: mode === 'free' ? values.categoryId : null,
      kind: values.kind,
      unitCostCents: mode === 'free' ? (values.unitCostCents ?? 0) : null,
      currency: mode === 'free' ? values.currency : null,
      fxRateMicro: fx && fx > 0 ? fx : null,
      sortOrder: 0,
      placements: [{ zoneId: values.zoneId, qtyMilli: values.qtyMilli ?? 1000, sortOrder: 0, notes: null }],
    }
    try {
      const created = await create.mutateAsync({ projectId, data })
      toast.show({ kind: 'success', message: `Ligne ${created.itemCode} ajoutée.` })
      onClose()
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') {
        setServerErrors(error.details)
        setBanner(error.message)
      } else setBanner(error.message)
    }
  }

  const productOptions = (products.data?.items ?? []).map((p) => ({ id: p.id, label: p.name, hint: p.manufacturerRef ?? undefined }))
  const categoryOptions = (categories.data ?? []).map((c) => ({ id: c.id, label: c.parentId != null ? `  ↳ ${c.name}` : `${c.code} — ${c.name}` }))
  const zoneOptions = zones.map((z) => ({ id: z.id, label: `${z.code} — ${z.name} (×${z.multiplier})` }))

  return (
    <div className="no-print rounded border border-neutral-300 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">{mode === 'catalogue' ? 'Ajouter depuis le catalogue' : 'Ajouter une ligne libre'}</h3>
      <Form form={form} onSubmit={submit} banner={banner}>
        <div className="grid grid-cols-4 gap-3">
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
              <EntityPicker name="productId" label="Produit" options={productOptions} required />
            </>
          ) : (
            <>
              <TextInput name="name" label="Désignation" autoFocus />
              <EntityPicker name="categoryId" label="Catégorie" options={categoryOptions} required />
              <MoneyField name="unitCostCents" label="Prix unitaire HT" />
              <Select name="currency" label="Devise" options={CURRENCIES} />
            </>
          )}
          <Select name="kind" label="Type" options={(Object.keys(ITEM_KIND_LABELS) as ItemKind[]).map((k) => ({ value: k, label: ITEM_KIND_LABELS[k] }))} />
          <EntityPicker name="zoneId" label="Zone" options={zoneOptions} emptyLabel="Non affecté" />
          <QuantityField name="qtyMilli" label="Quantité par zone" />
          <TextInput name="fxRate" label="Taux de change (1 unité = … €)" placeholder="1,170000 — vide si EUR ou déjà saisi" />
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
    </div>
  )
}

type Row = { item: ProjectItemRead; placement: ProjectItemRead['placements'][number]; amounts: LineAmountsRead | undefined }

export function ItemsTab({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const [filters, setFilters] = useState<ItemFilters>(NO_FILTERS)
  const [sortByOrder, setSortByOrder] = useState(false)
  const [client, setClient] = useState(false)
  const items = useProjectItems(projectId, filters)
  const summary = useProjectSummary(projectId)
  const zones = useZones(projectId, true)
  const suppliers = useSuppliers(ALL)
  const [adding, setAdding] = useState<'catalogue' | 'free' | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  const amountsById = useMemo(() => new Map((summary.data?.lines ?? []).map((l) => [l.projectItemId, l])), [summary.data])
  const supplierName = (id: number | null) => suppliers.data?.items.find((s) => s.id === id)?.name ?? ''
  const zoneTotals = new Map((summary.data?.zones ?? []).map((z) => [z.zoneId, z.specifiedCents]))

  const groups: { zone: ZoneRead | null; rows: Row[] }[] = useMemo(() => {
    let list = items.data ?? []
    if (client) list = list.filter((i) => i.kind !== 'fee' && i.status !== 'cancelled' && i.status !== 'replaced') // D7c.1, D7c.2
    const toRow = (item: ProjectItemRead, placement: ProjectItemRead['placements'][number]): Row => ({ item, placement, amounts: amountsById.get(item.id) })
    const sortRows = (rows: Row[]) =>
      sortByOrder ? [...rows].sort((a, b) => (a.amounts?.orderBy ?? '9999').localeCompare(b.amounts?.orderBy ?? '9999')) : rows
    const activeZones = (zones.data ?? []).filter((z) => z.archivedAt === null)
    const result: { zone: ZoneRead | null; rows: Row[] }[] = activeZones.map((zone) => ({
      zone,
      rows: sortRows(list.flatMap((item) => item.placements.filter((p) => p.zoneId === zone.id).map((p) => toRow(item, p)))),
    }))
    const unassigned = sortRows(list.flatMap((item) => item.placements.filter((p) => p.zoneId === null).map((p) => toRow(item, p))))
    if (unassigned.length) result.push({ zone: null, rows: unassigned })
    return result
  }, [items.data, zones.data, amountsById, sortByOrder, client])

  if (items.isPending || summary.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (items.isError) return <EmptyState title="Impossible de charger les lignes">{items.error.message}</EmptyState>

  const select = (label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <label className="flex items-center gap-1 text-sm text-neutral-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm">
        <option value="">Tous</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="space-y-4">
      <ExportsBar projectId={projectId} />
      <div className="no-print flex flex-wrap items-center gap-3">
        {!readOnly && adding === null && (
          <>
            <Button variant="primary" onClick={() => setAdding('catalogue')}>
              Depuis le catalogue
            </Button>
            <Button onClick={() => setAdding('free')}>Ligne libre</Button>
          </>
        )}
        {select(
          'Filtrer : statut',
          filters.status ?? '',
          (v) => setFilters({ ...filters, status: (v || null) as ItemStatus | null }),
          (Object.keys(ITEM_STATUS_LABELS) as ItemStatus[]).map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] })),
        )}
        {select(
          'Filtrer : type',
          filters.kind ?? '',
          (v) => setFilters({ ...filters, kind: (v || null) as ItemKind | null }),
          (Object.keys(ITEM_KIND_LABELS) as ItemKind[]).map((k) => ({ value: k, label: ITEM_KIND_LABELS[k] })),
        )}
        {select(
          'Filtrer : fournisseur',
          filters.supplierId ? String(filters.supplierId) : '',
          (v) => setFilters({ ...filters, supplierId: v ? Number(v) : null }),
          (suppliers.data?.items ?? []).map((s) => ({ value: String(s.id), label: s.name })),
        )}
        <input
          type="search"
          value={filters.q}
          onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          placeholder="Code ou désignation…"
          aria-label="Rechercher une ligne"
          className="w-48 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-sm text-neutral-700">
          <input type="checkbox" checked={sortByOrder} onChange={(event) => setSortByOrder(event.target.checked)} /> Trier par « commander avant le »
        </label>
        <label className="flex items-center gap-1 text-sm text-neutral-700">
          <input type="checkbox" checked={client} onChange={(event) => setClient(event.target.checked)} /> Variante client
        </label>
        <Button variant="ghost" onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>
      {adding && (
        <QuickAdd projectId={projectId} zones={(zones.data ?? []).filter((z) => z.archivedAt === null)} mode={adding} onClose={() => setAdding(null)} />
      )}
      {(items.data ?? []).length === 0 && <EmptyState title="Aucune ligne.">Ajouter un produit du catalogue ou une ligne libre.</EmptyState>}
      {(items.data ?? []).length > 0 && (
        <table className="w-full text-xs" aria-label="Lignes du projet">
          <thead>
            <tr className="border-b border-neutral-300 text-left uppercase tracking-wide text-neutral-500">
              <th className="px-2 py-1">Code</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Désignation</th>
              <th className="px-2 py-1">Finition</th>
              <th className="px-2 py-1"></th>
              <th className="px-2 py-1 text-right">Qté/zone</th>
              <th className="px-2 py-1 text-right">×</th>
              <th className="px-2 py-1 text-right">Qté totale</th>
              {!client && <th className="px-2 py-1 text-right">PU net</th>}
              {!client && <th className="px-2 py-1 text-right">PU net €</th>}
              {!client && <th className="px-2 py-1 text-right">Total HT €</th>}
              {!client && <th className="px-2 py-1">Fournisseur</th>}
              <th className="px-2 py-1 text-right">Délai</th>
              {!client && <th className="px-2 py-1">Commander avant le</th>}
              <th className="px-2 py-1">Statut</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ zone, rows }) => (
              <ZoneGroup
                key={zone?.id ?? 'none'}
                zone={zone}
                rows={rows}
                total={zoneTotals.get(zone?.id ?? null) ?? 0}
                supplierName={supplierName}
                onSelect={setSelected}
                client={client}
              />
            ))}
          </tbody>
          {!client && (
            <tfoot>
              <tr className="border-t-2 border-neutral-400 font-semibold">
                <td colSpan={10} className="px-2 py-2 text-right">
                  Prescrit HT €
                </td>
                <td className="px-2 py-2 text-right">{centsToText(summary.data?.specifiedCents ?? 0)}</td>
                <td colSpan={4} className="px-2 py-2 text-neutral-600">
                  TVA {centsToText(summary.data?.vatCents ?? 0)} · TTC {centsToText(summary.data?.ttcCents ?? 0)}
                  {summary.data && summary.data.oseCents > 0 && ` · OS&E hors enveloppe ${centsToText(summary.data.oseCents)}`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
      {selected !== null && <ItemPanel itemId={selected} zones={zones.data ?? []} readOnly={readOnly} onClose={() => setSelected(null)} />}
    </section>
  )
}

function ZoneGroup({
  zone,
  rows,
  total,
  supplierName,
  onSelect,
  client,
}: {
  zone: ZoneRead | null
  rows: Row[]
  total: number
  supplierName: (id: number | null) => string
  onSelect: (id: number) => void
  client: boolean
}) {
  const span = client ? 10 : 15
  return (
    <>
      <tr className="bg-neutral-100">
        <td colSpan={span} className="px-2 py-1 font-semibold">
          {zone ? `${zone.code} — ${zone.name} ×${zone.multiplier}` : 'Non affecté'}
        </td>
      </tr>
      {rows.length === 0 && (
        <tr>
          <td colSpan={span} className="px-2 py-1 text-neutral-400">
            Aucune ligne dans cette zone.
          </td>
        </tr>
      )}
      {rows.map(({ item, placement, amounts }) => {
        const image = item.files.find((f) => f.isPrimary)
        const muted = item.status === 'cancelled' || item.status === 'replaced'
        const overdue = amounts?.orderOverdue === true
        return (
          <tr
            key={`${item.id}-${placement.id}`}
            onClick={() => onSelect(item.id)}
            className={`cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 ${muted ? 'text-neutral-400 line-through' : ''} ${overdue ? 'bg-amber-50' : ''}`}
            aria-label={`${item.itemCode} dans ${zone?.code ?? 'non affecté'}`}
          >
            <td className="px-2 py-1 font-mono">{item.itemCode}</td>
            <td className="px-2 py-1">{ITEM_KIND_LABELS[item.kind]}</td>
            <td className="px-2 py-1 font-medium">{client ? (item.clientDescription ?? item.name) : item.name}</td>
            <td className="px-2 py-1">{item.finish ?? ''}</td>
            <td className="px-2 py-1">{image ? <img src={fileContentUrl(image.fileId)} alt="" className="h-8 w-8 rounded object-cover" /> : null}</td>
            <td className="px-2 py-1 text-right">{milliToText(placement.qtyMilli)}</td>
            <td className="px-2 py-1 text-right">{zone?.multiplier ?? 1}</td>
            <td className="px-2 py-1 text-right">{amounts ? milliToText(amounts.totalQtyMilli) : ''}</td>
            {!client && <td className="px-2 py-1 text-right">{amounts ? `${centsToText(amounts.netUnitCents)} ${item.currency}` : ''}</td>}
            {!client && <td className="px-2 py-1 text-right">{amounts ? centsToText(amounts.netUnitEurCents) : ''}</td>}
            {!client && <td className="px-2 py-1 text-right">{amounts ? centsToText(amounts.totalHtCents) : ''}</td>}
            {!client && <td className="px-2 py-1">{supplierName(item.supplierId)}</td>}
            <td className="px-2 py-1 text-right">{item.leadTimeWeeks !== null ? `${item.leadTimeWeeks} sem.` : ''}</td>
            {!client && (
              <td className={`px-2 py-1 ${overdue ? 'font-semibold text-amber-900' : ''}`}>
                {amounts?.orderBy ?? ''}
                {overdue && ' ⚠'}
              </td>
            )}
            <td className="px-2 py-1">
              {ITEM_STATUS_LABELS[item.status]}
              {item.onHold && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">en attente</span>}
            </td>
          </tr>
        )
      })}
      {!client && (
        <tr className="border-b border-neutral-300 text-neutral-600">
          <td colSpan={10} className="px-2 py-1 text-right">
            Sous-total zone HT €
          </td>
          <td className="px-2 py-1 text-right font-medium">{centsToText(total)}</td>
          <td colSpan={4}></td>
        </tr>
      )}
    </>
  )
}
