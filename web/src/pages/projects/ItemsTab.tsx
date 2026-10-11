// « Lignes » tab: lines grouped by zone, amounts from the server summary (never computed here),
// quick add from the catalogue or as a free line, side panel for editing (D7b.1, D7b.2).
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
import { ItemPanel } from './ItemPanel'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

export function fxToText(micro: number): string {
  return (micro / 1_000_000).toFixed(6).replace('.', ',')
}

type QuickValues = {
  productId: number | null
  name: string
  categoryId: number | null
  kind: ProjectItemRead['kind']
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
    <div className="rounded border border-neutral-300 bg-white p-4">
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
          <Select
            name="kind"
            label="Type"
            options={(Object.keys(ITEM_KIND_LABELS) as ProjectItemRead['kind'][]).map((k) => ({ value: k, label: ITEM_KIND_LABELS[k] }))}
          />
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
  const items = useProjectItems(projectId)
  const summary = useProjectSummary(projectId)
  const zones = useZones(projectId, true)
  const suppliers = useSuppliers(ALL)
  const [adding, setAdding] = useState<'catalogue' | 'free' | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  const amountsById = useMemo(() => new Map((summary.data?.lines ?? []).map((l) => [l.projectItemId, l])), [summary.data])
  const supplierName = (id: number | null) => suppliers.data?.items.find((s) => s.id === id)?.name ?? ''
  const zoneTotals = new Map((summary.data?.zones ?? []).map((z) => [z.zoneId, z.specifiedCents]))

  const groups: { zone: ZoneRead | null; rows: Row[] }[] = useMemo(() => {
    const list = items.data ?? []
    const activeZones = (zones.data ?? []).filter((z) => z.archivedAt === null)
    const result: { zone: ZoneRead | null; rows: Row[] }[] = activeZones.map((zone) => ({
      zone,
      rows: list.flatMap((item) =>
        item.placements.filter((p) => p.zoneId === zone.id).map((placement) => ({ item, placement, amounts: amountsById.get(item.id) })),
      ),
    }))
    const unassigned = list.flatMap((item) =>
      item.placements.filter((p) => p.zoneId === null).map((placement) => ({ item, placement, amounts: amountsById.get(item.id) })),
    )
    if (unassigned.length) result.push({ zone: null, rows: unassigned })
    return result
  }, [items.data, zones.data, amountsById])

  if (items.isPending || summary.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (items.isError) return <EmptyState title="Impossible de charger les lignes">{items.error.message}</EmptyState>

  return (
    <section className="space-y-4">
      {!readOnly && adding === null && (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setAdding('catalogue')}>
            Depuis le catalogue
          </Button>
          <Button onClick={() => setAdding('free')}>Ligne libre</Button>
        </div>
      )}
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
              <th className="px-2 py-1 text-right">PU net</th>
              <th className="px-2 py-1 text-right">PU net €</th>
              <th className="px-2 py-1 text-right">Total HT €</th>
              <th className="px-2 py-1">Fournisseur</th>
              <th className="px-2 py-1 text-right">Délai</th>
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
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-400 font-semibold">
              <td colSpan={10} className="px-2 py-2 text-right">
                Prescrit HT €
              </td>
              <td className="px-2 py-2 text-right">{centsToText(summary.data?.specifiedCents ?? 0)}</td>
              <td colSpan={3} className="px-2 py-2 text-neutral-600">
                TVA {centsToText(summary.data?.vatCents ?? 0)} · TTC {centsToText(summary.data?.ttcCents ?? 0)}
                {summary.data && summary.data.oseCents > 0 && ` · OS&E hors enveloppe ${centsToText(summary.data.oseCents)}`}
              </td>
            </tr>
          </tfoot>
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
}: {
  zone: ZoneRead | null
  rows: Row[]
  total: number
  supplierName: (id: number | null) => string
  onSelect: (id: number) => void
}) {
  return (
    <>
      <tr className="bg-neutral-100">
        <td colSpan={14} className="px-2 py-1 font-semibold">
          {zone ? `${zone.code} — ${zone.name} ×${zone.multiplier}` : 'Non affecté'}
        </td>
      </tr>
      {rows.length === 0 && (
        <tr>
          <td colSpan={14} className="px-2 py-1 text-neutral-400">
            Aucune ligne dans cette zone.
          </td>
        </tr>
      )}
      {rows.map(({ item, placement, amounts }) => {
        const image = item.files.find((f) => f.isPrimary)
        const muted = item.status === 'cancelled' || item.status === 'replaced'
        return (
          <tr
            key={`${item.id}-${placement.id}`}
            onClick={() => onSelect(item.id)}
            className={`cursor-pointer border-b border-neutral-200 hover:bg-neutral-50 ${muted ? 'text-neutral-400 line-through' : ''}`}
            aria-label={`${item.itemCode} dans ${zone?.code ?? 'non affecté'}`}
          >
            <td className="px-2 py-1 font-mono">{item.itemCode}</td>
            <td className="px-2 py-1">{ITEM_KIND_LABELS[item.kind]}</td>
            <td className="px-2 py-1 font-medium">{item.name}</td>
            <td className="px-2 py-1">{item.finish ?? ''}</td>
            <td className="px-2 py-1">{image ? <img src={fileContentUrl(image.fileId)} alt="" className="h-8 w-8 rounded object-cover" /> : null}</td>
            <td className="px-2 py-1 text-right">{milliToText(placement.qtyMilli)}</td>
            <td className="px-2 py-1 text-right">{zone?.multiplier ?? 1}</td>
            <td className="px-2 py-1 text-right">{amounts ? milliToText(amounts.totalQtyMilli) : ''}</td>
            <td className="px-2 py-1 text-right">{amounts ? `${centsToText(amounts.netUnitCents)} ${item.currency}` : ''}</td>
            <td className="px-2 py-1 text-right">{amounts ? centsToText(amounts.netUnitEurCents) : ''}</td>
            <td className="px-2 py-1 text-right">{amounts ? centsToText(amounts.totalHtCents) : ''}</td>
            <td className="px-2 py-1">{supplierName(item.supplierId)}</td>
            <td className="px-2 py-1 text-right">{item.leadTimeWeeks !== null ? `${item.leadTimeWeeks} sem.` : ''}</td>
            <td className="px-2 py-1">
              {ITEM_STATUS_LABELS[item.status]}
              {item.onHold && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">en attente</span>}
            </td>
          </tr>
        )
      })}
      <tr className="border-b border-neutral-300 text-neutral-600">
        <td colSpan={10} className="px-2 py-1 text-right">
          Sous-total zone HT €
        </td>
        <td className="px-2 py-1 text-right font-medium">{centsToText(total)}</td>
        <td colSpan={3}></td>
      </tr>
    </>
  )
}
