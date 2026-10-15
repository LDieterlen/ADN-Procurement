// Articles of a project (ADR-0013), grouped by location: photo · Code · Type · Désignation · Qté ·
// Fournisseur · Montant HT · État · Indice ; a row opens the article page ; « + Ajouter un article »
// opens the creation page. Amounts come from the server summary
// (the share of each placement, the total for a fee line).
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useProjectSummary, type LineAmountsRead } from '../../api/queries/budget'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl } from '../../api/queries/file'
import type { LocationRead } from '../../api/queries/project'
import { ITEM_STATUS_LABELS, useProjectItems, type ProjectItemRead } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { centsToText } from '../../components/forms/MoneyField'
import { MultiSelectFilter } from '../../components/forms/MultiSelectFilter'
import { milliToText } from '../../components/forms/QuantityField'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { buttonClass } from '../../components/ui/Button'
import { StatusSelect } from './StatusSelect'

const ALL = { q: '', includeArchived: true, limit: 1000, offset: 0 } // every supplier, archived ones too: names of existing articles

// An option (ADR-0021) is shown right under its base, on each of the base's placements, with the
// code of that placement followed by its letter; its amount is indicative (in brackets).
type Row = {
  item: ProjectItemRead
  placement: ProjectItemRead['placements'][number] | null
  amounts: LineAmountsRead | undefined
  code: string
  option: boolean
}
type Group = { key: string; code: string; title: string; detail: string; zone: string | null; level: string | null; multiplier: number; rows: Row[] }

export function ItemsSection({ projectId, locations, readOnly }: { projectId: number; locations: LocationRead[]; readOnly: boolean }) {
  const items = useProjectItems(projectId)
  const summary = useProjectSummary(projectId)
  const suppliers = useSuppliers(ALL)
  const categories = useCategories(false)
  const navigate = useNavigate()
  // Group totals come from the summary: a location's Prescrit, « Non affecté » (key ''), the fee lines.
  const subtotalOf = (key: string) =>
    key === 'fees'
      ? summary.data?.byType.find((r) => r.key === 'fee')?.specifiedCents
      : summary.data?.byLocation.find((r) => r.key === (key === 'none' ? '' : key))?.specifiedCents
  const amountsById = useMemo(() => new Map((summary.data?.lines ?? []).map((l) => [l.projectItemId, l])), [summary.data])
  const supplierName = (id: number | null) => suppliers.data?.items.find((s) => s.id === id)?.name ?? ''
  const typeName = (id: number | null) => categories.data?.find((c) => c.id === id)?.name ?? ''

  const groups: Group[] = useMemo(() => {
    const list = items.data ?? []
    const toRow = (item: ProjectItemRead, placement: Row['placement']): Row => ({
      item,
      placement,
      amounts: amountsById.get(item.id),
      code: placement?.code ?? item.itemCode,
      option: false,
    })
    // A base row followed by the rows of its options on the same placement.
    const withOptions = (item: ProjectItemRead, placement: NonNullable<Row['placement']>): Row[] => [
      toRow(item, placement),
      ...list
        .filter((o) => o.optionOfId === item.id)
        .sort((a, b) => (a.optionLetter ?? '').localeCompare(b.optionLetter ?? ''))
        .map((o) => ({ ...toRow(o, placement), code: `${placement.code}-${o.optionLetter ?? ''}`, option: true })),
    ]
    // Active locations, and an archived one while it still holds placements (never hidden under « Non affecté »).
    const enabled = locations.filter((l) => l.archivedAt === null || list.some((item) => item.placements.some((p) => p.locationId === l.id)))
    const result: Group[] = enabled.map((location) => ({
      key: String(location.id),
      code: location.code,
      title: location.archivedAt === null ? location.name : `${location.name} (archivée)`,
      detail: [location.zone, location.level].filter(Boolean).join(' · '),
      zone: location.zone,
      level: location.level,
      multiplier: location.multiplier,
      rows: list.flatMap((item) => item.placements.filter((p) => p.locationId === location.id).flatMap((p) => withOptions(item, p))),
    }))
    const unassigned = list.flatMap((item) => item.placements.filter((p) => p.locationId === null).flatMap((p) => withOptions(item, p)))
    if (unassigned.length) result.push({ key: 'none', code: '', title: 'Non affecté', detail: '', zone: null, level: null, multiplier: 1, rows: unassigned })
    const fees = list.filter((item) => item.kind === 'fee').map((item) => toRow(item, null))
    if (fees.length) result.push({ key: 'fees', code: '', title: 'Frais', detail: 'livraison, emballage…', zone: null, level: null, multiplier: 1, rows: fees })
    return result
  }, [items.data, locations, amountsById])

  // Filters (display only, combined): locations, zones and levels (dropdowns, several values
  // each; none = all), and « code article » (part of the FF&E code, e.g. « LUD » or
  // « AS-02 »). A location, zone or level filter hides « Non affecté » and « Frais ».
  const [locationKeys, setLocationKeys] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const active = locations.filter((l) => l.archivedAt === null)
  const zoneOptions = distinct(active.map((l) => l.zone))
  const levelOptions = distinct(active.map((l) => l.level))
  const needle = code.trim().toUpperCase()
  const filtering = locationKeys.length > 0 || needle !== '' || zones.length > 0 || levels.length > 0
  const shown = groups
    .filter((g) => !locationKeys.length || locationKeys.includes(g.key))
    .filter((g) => !zones.length || (g.zone !== null && zones.includes(g.zone)))
    .filter((g) => !levels.length || (g.level !== null && levels.includes(g.level)))
    .map((g) => (needle ? { ...g, rows: g.rows.filter((r) => r.code.toUpperCase().includes(needle)) } : g))
    .filter((g) => !needle || g.rows.length > 0)

  const count = (items.data ?? []).filter((i) => i.optionOfId === null).length // options aside
  const shownCount = new Set(shown.flatMap((g) => g.rows.filter((r) => !r.option).map((r) => r.item.id))).size
  const groupCount = shown.filter((g) => g.key !== 'none' && g.key !== 'fees').length
  return (
    <Card
      title="Articles"
      label="Articles"
      padding="table"
      meta={
        count > 0
          ? `${filtering ? `${shownCount} sur ${count}` : count} article${count > 1 ? 's' : ''} · ${groupCount} localisation${groupCount > 1 ? 's' : ''}`
          : undefined
      }
      actions={
        !readOnly ? (
          <Link to={`/projects/${projectId}/items/new`} className={buttonClass('primary', 'sm')}>
            + Ajouter un article
          </Link>
        ) : undefined
      }
    >
      {items.isPending && <p className="px-5 py-4 text-sm text-ink-3">Chargement…</p>}
      {items.isError && (
        <p className="px-5 py-6 text-sm text-ink-2">
          <span className="font-medium text-danger">Impossible de charger les articles</span> · {items.error.message}
        </p>
      )}
      {items.data && count === 0 && <p className="px-5 py-6 text-sm text-ink-2">Aucun article. Ajouter le premier avec « + Ajouter un article ».</p>}
      {count > 0 && (
        <div className="grid grid-cols-2 items-end gap-3 border-b border-line bg-sunken px-5 py-3 text-[13px] md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <FilterField label="Localisation">
            <MultiSelectFilter
              label="Localisation"
              value={locationKeys}
              onChange={setLocationKeys}
              options={active.map((l) => ({ value: String(l.id), label: `${l.code} — ${l.name}` }))}
            />
          </FilterField>
          <FilterField label="Zone">
            <MultiSelectFilter label="Zone" value={zones} onChange={setZones} options={zoneOptions.map((z) => ({ value: z, label: z }))} />
          </FilterField>
          <FilterField label="Niveau">
            <MultiSelectFilter label="Niveau" all="Tous" value={levels} onChange={setLevels} options={levelOptions.map((v) => ({ value: v, label: v }))} />
          </FilterField>
          <FilterField label="Code article">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="LUD, AS-02…"
              aria-label="Code article"
              className="control control-sm w-full bg-surface"
            />
          </FilterField>
          <button
            type="button"
            disabled={!filtering}
            className="h-8 text-ink-2 hover:underline disabled:invisible"
            onClick={() => {
              setLocationKeys([])
              setCode('')
              setZones([])
              setLevels([])
            }}
          >
            Effacer les filtres
          </button>
        </div>
      )}
      {count > 0 && filtering && shown.length === 0 && <p className="px-5 py-6 text-sm text-ink-2">Aucun article ne correspond aux filtres.</p>}
      {count > 0 && (
        <table className="w-full text-sm" aria-label="Articles du projet">
          <colgroup>
            <col className="w-[108px]" />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col />
            <col className="w-20" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[60px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line text-left text-[12.5px] font-medium text-ink-2">
              <th className="py-2.5 pl-5"></th>
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Désignation</th>
              <th className="px-3 py-2.5 text-right">Qté</th>
              <th className="px-3 py-2.5">Fournisseur</th>
              <th className="px-3 py-2.5 text-right">Montant HT</th>
              <th className="px-3 py-2.5">État</th>
              <th className="py-2.5 pr-5 pl-3 text-center">Ind.</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                readOnly={readOnly}
                subtotal={needle ? undefined : subtotalOf(group.key)} // a location's total, meaningless once filtered by code
                supplierName={supplierName}
                typeName={typeName}
                onOpen={(id) => navigate(`/projects/${projectId}/items/${id}`)}
              />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'fr'))
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-medium text-ink-2">{label}</div>
      {children}
    </div>
  )
}

const PREVIEW = 256

/** Thumbnail with a larger preview on hover. The preview is `position: fixed`, placed from the
 * thumbnail's box and kept inside the window, so the card's rounded clipping never cuts it. */
function PhotoThumb({ src, alt }: { src: string; alt: string }) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null)
  return (
    <span
      className="block h-[72px] w-[72px]"
      onMouseEnter={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        const top = Math.min(Math.max(box.top + box.height / 2 - PREVIEW / 2, 8), window.innerHeight - PREVIEW - 8)
        setAt({ top, left: box.right + 12 })
      }}
      onMouseLeave={() => setAt(null)}
    >
      <img src={src} alt={alt} className="h-full w-full rounded-md border border-line bg-surface object-contain p-0.5" />
      {at && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          style={{ top: at.top, left: at.left, width: PREVIEW, height: PREVIEW }}
          className="pointer-events-none fixed z-50 max-w-none rounded-lg border border-line bg-surface object-contain p-1.5 shadow-xl"
        />
      )}
    </span>
  )
}

function GroupRows({
  group,
  subtotal,
  readOnly,
  supplierName,
  typeName,
  onOpen,
}: {
  group: Group
  /** The group's total from the server summary (the front never adds amounts). */
  subtotal: number | undefined
  readOnly: boolean
  supplierName: (id: number | null) => string
  typeName: (id: number | null) => string
  onOpen: (id: number) => void
}) {
  return (
    <>
      <tr className="border-t border-line bg-sunken">
        <td colSpan={6} className="py-2.5 pl-5 text-[13.5px]">
          {group.code && <span className="mr-2 inline-block min-w-[30px] font-mono text-xs text-ink-2">{group.code}</span>}
          <span className="font-semibold">{group.title}</span>
          {group.detail && <span className="text-ink-3"> · {group.detail}</span>}
          {group.multiplier > 1 && (
            <span className="ml-2 rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink">× {group.multiplier}</span>
          )}
        </td>
        <td colSpan={3} className="py-2.5 pr-5 text-right text-[13px] text-ink-2 tabular-nums">
          {group.rows.length === 0 ? 'Aucun article' : subtotal !== undefined ? `${centsToText(subtotal)} €` : ''}
        </td>
      </tr>
      {group.rows.map(({ item, placement, amounts, code, option }) => {
        if (option) {
          // An option row says only what differs: its name and its (indicative) price; the rest is
          // its base's (placement, quantity), shown on the row above.
          const optionShare = placement ? amounts?.placements.find((p) => p.placementId === placement.id)?.totalHtCents : undefined
          return (
            <tr
              key={`${item.id}-${placement?.id ?? 'fee'}`}
              onClick={() => onOpen(item.id)}
              className="cursor-pointer border-b border-line-soft text-ink-2 transition-colors duration-[120ms] hover:bg-sunken"
              aria-label={`${code} dans ${group.code || 'non affecté'}`}
            >
              <td />
              <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                <span aria-hidden="true">↳ </span>
                {code}
              </td>
              <td />
              <td className={`px-3 py-2 ${item.status === 'cancelled' ? 'line-through' : ''}`}>
                <span className="mr-1.5 rounded-[4px] bg-track px-1.5 py-0.5 text-[11.5px]">Option {item.optionLetter}</span>
                {item.name}
              </td>
              <td colSpan={2} />
              <td className="px-3 py-2 text-right tabular-nums">{optionShare === undefined ? '' : `(${centsToText(optionShare)} €)`}</td>
              <td colSpan={2} />
            </tr>
          )
        }
        const image = item.files.find((f) => f.isPrimary)
        const muted = item.status === 'cancelled'
        const share = placement ? amounts?.placements.find((p) => p.placementId === placement.id)?.totalHtCents : amounts?.totalHtCents
        return (
          <tr
            key={`${item.id}-${placement?.id ?? 'fee'}`}
            onClick={() => onOpen(item.id)}
            className={`cursor-pointer border-b border-line-soft transition-colors duration-[120ms] hover:bg-sunken ${muted ? 'text-ink-3' : ''}`}
            aria-label={`${code} dans ${group.key === 'fees' ? 'frais' : group.code || 'non affecté'}`}
          >
            <td className="py-2.5 pl-5">
              {/* The photo leads the row (whole product, never cropped); hovering shows it larger. */}
              {image ? (
                <PhotoThumb src={fileContentUrl(image.fileId, image.sha256)} alt={`Photo ${item.name}`} />
              ) : item.kind === 'fee' ? null : (
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-md border border-dashed border-line-strong bg-sunken text-[11px] text-ink-3">
                  Sans photo
                </span>
              )}
            </td>
            <td className="px-3 py-2 font-mono text-xs text-ink-2">{code}</td>
            <td className="px-3 py-2 text-ink-2">{item.kind === 'fee' ? 'Frais' : typeName(item.categoryId)}</td>
            <td className={`px-3 py-2 font-medium ${muted ? 'line-through' : ''}`}>{item.name}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {placement ? milliToText(placement.qtyMilli) : '—'}
              {placement && group.multiplier > 1 && <span className="text-[12.5px] text-ink-3"> × {group.multiplier}</span>}
            </td>
            <td className="px-3 py-2 text-ink-2">{supplierName(item.supplierId)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{share === undefined || muted ? '' : `${centsToText(share)} €`}</td>
            <td className="px-3 py-2">
              {readOnly ? <Pill status={item.status}>{ITEM_STATUS_LABELS[item.status]}</Pill> : <StatusSelect item={item} readOnly={readOnly} />}
            </td>
            <td className="py-2 pr-5 pl-3 text-center text-ink-2">{item.indice ?? '—'}</td>
          </tr>
        )
      })}
    </>
  )
}
