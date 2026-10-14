// Articles of a project (ADR-0013), grouped by location: photo · Code · Type · Désignation · Qté ·
// Fournisseur · Montant HT · État · Indice ; a row opens the article page ; « + Ajouter un article »
// opens the creation page. Amounts come from the server summary
// (the share of each placement, the total for a fee line).
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useProjectSummary, type LineAmountsRead } from '../../api/queries/budget'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl } from '../../api/queries/file'
import type { LocationRead } from '../../api/queries/project'
import { ITEM_STATUS_LABELS, useProjectItems, type ProjectItemRead } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { centsToText } from '../../components/forms/MoneyField'
import { milliToText } from '../../components/forms/QuantityField'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { buttonClass } from '../../components/ui/Button'
import { StatusSelect } from './StatusSelect'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

type Row = { item: ProjectItemRead; placement: ProjectItemRead['placements'][number] | null; amounts: LineAmountsRead | undefined }
type Group = { key: string; code: string; title: string; detail: string; multiplier: number; rows: Row[] }

export function ItemsSection({ projectId, locations, readOnly }: { projectId: number; locations: LocationRead[]; readOnly: boolean }) {
  const items = useProjectItems(projectId)
  const summary = useProjectSummary(projectId)
  const suppliers = useSuppliers(ALL)
  const categories = useCategories(false)
  const navigate = useNavigate()
  const amountsById = useMemo(() => new Map((summary.data?.lines ?? []).map((l) => [l.projectItemId, l])), [summary.data])
  const supplierName = (id: number | null) => suppliers.data?.items.find((s) => s.id === id)?.name ?? ''
  const typeName = (id: number | null) => categories.data?.find((c) => c.id === id)?.name ?? ''

  const groups: Group[] = useMemo(() => {
    const list = items.data ?? []
    const toRow = (item: ProjectItemRead, placement: Row['placement']): Row => ({ item, placement, amounts: amountsById.get(item.id) })
    const active = locations.filter((l) => l.archivedAt === null)
    const result: Group[] = active.map((location) => ({
      key: String(location.id),
      code: location.code,
      title: location.name,
      detail: [location.zone, location.level].filter(Boolean).join(' · '),
      multiplier: location.multiplier,
      rows: list.flatMap((item) => item.placements.filter((p) => p.locationId === location.id).map((p) => toRow(item, p))),
    }))
    const unassigned = list.flatMap((item) =>
      item.placements.filter((p) => p.locationId === null || !active.some((l) => l.id === p.locationId)).map((p) => toRow(item, p)),
    )
    if (unassigned.length) result.push({ key: 'none', code: '', title: 'Non affecté', detail: '', multiplier: 1, rows: unassigned })
    const fees = list.filter((item) => item.kind === 'fee').map((item) => toRow(item, null))
    if (fees.length) result.push({ key: 'fees', code: '', title: 'Frais', detail: 'livraison, emballage…', multiplier: 1, rows: fees })
    return result
  }, [items.data, locations, amountsById])

  const count = (items.data ?? []).length
  const groupCount = groups.filter((g) => g.key !== 'none' && g.key !== 'fees').length
  return (
    <Card
      title="Articles"
      label="Articles"
      padding="table"
      meta={count > 0 ? `${count} article${count > 1 ? 's' : ''} · ${groupCount} localisation${groupCount > 1 ? 's' : ''}` : undefined}
      actions={
        !readOnly ? (
          <Link to={`/projects/${projectId}/items/new`} className={buttonClass('primary', 'sm')}>
            + Ajouter un article
          </Link>
        ) : undefined
      }
    >
      {items.isPending && <p className="px-5 py-4 text-sm text-ink-3">Chargement…</p>}
      {items.data && count === 0 && <p className="px-5 py-6 text-sm text-ink-2">Aucun article. Ajouter le premier avec « + Ajouter un article ».</p>}
      {count > 0 && (
        <table className="w-full text-sm" aria-label="Articles du projet">
          <colgroup>
            <col className="w-14" />
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
            {groups.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                readOnly={readOnly}
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

function GroupRows({
  group,
  readOnly,
  supplierName,
  typeName,
  onOpen,
}: {
  group: Group
  readOnly: boolean
  supplierName: (id: number | null) => string
  typeName: (id: number | null) => string
  onOpen: (id: number) => void
}) {
  const subtotal = group.rows.reduce<number | null>((sum, { item, placement, amounts }) => {
    if (item.status === 'cancelled' || !amounts) return sum
    const share = placement ? amounts.placements.find((p) => p.placementId === placement.id)?.totalHtCents : amounts.totalHtCents
    return share === undefined ? sum : (sum ?? 0) + share
  }, null)
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
          {group.rows.length === 0 ? 'Aucun article' : subtotal !== null ? `${centsToText(subtotal)} €` : ''}
        </td>
      </tr>
      {group.rows.map(({ item, placement, amounts }) => {
        const image = item.files.find((f) => f.isPrimary)
        const muted = item.status === 'cancelled'
        const share = placement ? amounts?.placements.find((p) => p.placementId === placement.id)?.totalHtCents : amounts?.totalHtCents
        return (
          <tr
            key={`${item.id}-${placement?.id ?? 'fee'}`}
            onClick={() => onOpen(item.id)}
            className={`cursor-pointer border-b border-line-soft transition-colors duration-[120ms] hover:bg-sunken ${muted ? 'text-ink-3' : ''}`}
            aria-label={`${placement?.code ?? item.itemCode} dans ${group.key === 'fees' ? 'frais' : group.code || 'non affecté'}`}
          >
            <td className="py-2 pl-5">
              {image ? (
                <img src={fileContentUrl(image.fileId, image.sha256)} alt="" className="h-9 w-9 rounded-[5px] border border-line object-cover" />
              ) : (
                <span className="block h-9 w-9 rounded-[5px] border border-line bg-sunken" />
              )}
            </td>
            <td className="px-3 py-2 font-mono text-xs text-ink-2">{placement?.code ?? item.itemCode}</td>
            <td className="px-3 py-2 text-ink-2">{item.kind === 'fee' ? 'Frais' : typeName(item.categoryId)}</td>
            <td className={`px-3 py-2 font-medium ${muted ? 'line-through' : ''}`}>{item.name}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {placement ? milliToText(placement.qtyMilli) : '—'}
              {placement && group.multiplier > 1 && <span className="text-[12.5px] text-ink-3"> × {group.multiplier}</span>}
            </td>
            <td className="px-3 py-2 text-ink-2">{supplierName(item.supplierId)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{share !== undefined && !muted ? `${centsToText(share)} €` : ''}</td>
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
