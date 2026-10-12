// « Prescription » tab (ADR-0012): Typologie · Code · Désignation · Localisation · Qté · Fournisseur · Statut · Indice,
// grouped by zone; amounts, « Commander avant le » and subtotals come from the server summary and show in advanced mode only.
import { useMemo, useState } from 'react'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl } from '../../api/queries/product'
import { useZones, type ZoneRead } from '../../api/queries/project'
import {
  ITEM_KIND_LABELS,
  ITEM_LOCATION_LABELS,
  ITEM_STATUS_LABELS,
  useProjectItems,
  useProjectSummary,
  type ItemFilters,
  type ItemKind,
  type ItemStatus,
  type LineAmountsRead,
  type ProjectItemRead,
} from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { centsToText } from '../../components/forms/MoneyField'
import { milliToText } from '../../components/forms/QuantityField'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAdvancedMode } from '../../components/useAdvancedMode'
import { AddItemDrawer } from './AddItemDrawer'
import { ExportsBar } from './ExportsBar'
import { ItemPanel } from './ItemPanel'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }
const NO_FILTERS: ItemFilters = { status: null, kind: null, supplierId: null, q: '' }

type Row = { item: ProjectItemRead; placement: ProjectItemRead['placements'][number]; amounts: LineAmountsRead | undefined }

export function ItemsTab({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const [filters, setFilters] = useState<ItemFilters>(NO_FILTERS)
  const [sortByOrder, setSortByOrder] = useState(false)
  const [client, setClient] = useState(false)
  const items = useProjectItems(projectId, filters)
  const summary = useProjectSummary(projectId)
  const zones = useZones(projectId, true)
  const suppliers = useSuppliers(ALL)
  const categories = useCategories(false)
  const advanced = useAdvancedMode()
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const typologyOf = (categoryId: number) => {
    const category = (categories.data ?? []).find((c) => c.id === categoryId)
    const level1 = category?.parentId != null ? (categories.data ?? []).find((c) => c.id === category.parentId) : category
    return level1?.name ?? ''
  }

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

  const money = advanced && !client
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
        {!readOnly && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Ajouter un produit
          </Button>
        )}
        {select(
          'Filtrer : statut',
          filters.status ?? '',
          (v) => setFilters({ ...filters, status: (v || null) as ItemStatus | null }),
          (Object.keys(ITEM_STATUS_LABELS) as ItemStatus[]).map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] })),
        )}
        {advanced &&
          select(
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
        {advanced && (
          <label className="flex items-center gap-1 text-sm text-neutral-700">
            <input type="checkbox" checked={sortByOrder} onChange={(event) => setSortByOrder(event.target.checked)} /> Trier par « commander avant le »
          </label>
        )}
        <label className="flex items-center gap-1 text-sm text-neutral-700">
          <input type="checkbox" checked={client} onChange={(event) => setClient(event.target.checked)} /> Variante client
        </label>
        <Button variant="ghost" onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>
      {adding && <AddItemDrawer projectId={projectId} zones={(zones.data ?? []).filter((z) => z.archivedAt === null)} onClose={() => setAdding(false)} />}
      {(items.data ?? []).length === 0 && <EmptyState title="Aucune ligne.">« Ajouter un produit » : depuis le catalogue ou en ligne libre.</EmptyState>}
      {(items.data ?? []).length > 0 && (
        <table className="w-full text-xs" aria-label="Lignes du projet">
          <thead>
            <tr className="border-b border-neutral-300 text-left uppercase tracking-wide text-neutral-500">
              <th className="px-2 py-1">Typologie</th>
              <th className="px-2 py-1">Code</th>
              <th className="px-2 py-1">Désignation</th>
              <th className="px-2 py-1">Localisation</th>
              <th className="px-2 py-1"></th>
              <th className="px-2 py-1 text-right">Qté/zone</th>
              <th className="px-2 py-1 text-right">×</th>
              <th className="px-2 py-1 text-right">Qté totale</th>
              {money && <th className="px-2 py-1 text-right">PU net</th>}
              {money && <th className="px-2 py-1 text-right">PU net €</th>}
              {money && <th className="px-2 py-1 text-right">Total HT €</th>}
              {!client && <th className="px-2 py-1">Fournisseur</th>}
              {money && <th className="px-2 py-1 text-right">Délai</th>}
              {money && <th className="px-2 py-1">Commander avant le</th>}
              <th className="px-2 py-1">Statut</th>
              <th className="px-2 py-1">Indice</th>
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
                typologyOf={typologyOf}
                onSelect={setSelected}
                client={client}
                money={money}
              />
            ))}
          </tbody>
          {money && (
            <tfoot>
              <tr className="border-t-2 border-neutral-400 font-semibold">
                <td colSpan={10} className="px-2 py-2 text-right">
                  Prescrit HT €
                </td>
                <td className="px-2 py-2 text-right">{centsToText(summary.data?.specifiedCents ?? 0)}</td>
                <td colSpan={5} className="px-2 py-2 text-neutral-600">
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
  typologyOf,
  onSelect,
  client,
  money,
}: {
  zone: ZoneRead | null
  rows: Row[]
  total: number
  supplierName: (id: number | null) => string
  typologyOf: (categoryId: number) => string
  onSelect: (id: number) => void
  client: boolean
  money: boolean
}) {
  const span = 10 + (money ? 5 : 0) + (client ? 0 : 1)
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
            <td className="px-2 py-1">{typologyOf(item.categoryId)}</td>
            <td className="px-2 py-1 font-mono">{item.itemCode}</td>
            <td className="px-2 py-1 font-medium">{client ? (item.clientDescription ?? item.name) : item.name}</td>
            <td className="px-2 py-1">{item.location ? ITEM_LOCATION_LABELS[item.location] : ''}</td>
            <td className="px-2 py-1">{image ? <img src={fileContentUrl(image.fileId)} alt="" className="h-8 w-8 rounded object-cover" /> : null}</td>
            <td className="px-2 py-1 text-right">{milliToText(placement.qtyMilli)}</td>
            <td className="px-2 py-1 text-right">{zone?.multiplier ?? 1}</td>
            <td className="px-2 py-1 text-right">{amounts ? milliToText(amounts.totalQtyMilli) : ''}</td>
            {money && <td className="px-2 py-1 text-right">{amounts ? `${centsToText(amounts.netUnitCents)} ${item.currency}` : ''}</td>}
            {money && <td className="px-2 py-1 text-right">{amounts ? centsToText(amounts.netUnitEurCents) : ''}</td>}
            {money && <td className="px-2 py-1 text-right">{amounts ? centsToText(amounts.totalHtCents) : ''}</td>}
            {!client && <td className="px-2 py-1">{supplierName(item.supplierId)}</td>}
            {money && <td className="px-2 py-1 text-right">{item.leadTimeWeeks !== null ? `${item.leadTimeWeeks} sem.` : ''}</td>}
            {money && (
              <td className={`px-2 py-1 ${overdue ? 'font-semibold text-amber-900' : ''}`}>
                {amounts?.orderBy ?? ''}
                {overdue && ' ⚠'}
              </td>
            )}
            <td className="px-2 py-1">
              {ITEM_STATUS_LABELS[item.status]}
              {item.onHold && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">en attente</span>}
            </td>
            <td className="px-2 py-1">{item.indice ?? ''}</td>
          </tr>
        )
      })}
      {money && (
        <tr className="border-b border-neutral-300 text-neutral-600">
          <td colSpan={10} className="px-2 py-1 text-right">
            Sous-total zone HT €
          </td>
          <td className="px-2 py-1 text-right font-medium">{centsToText(total)}</td>
          <td colSpan={5}></td>
        </tr>
      )}
    </>
  )
}
