// Articles of a project (ADR-0013), grouped by location: photo · Code · Type · Désignation · Qté ·
// Fournisseur · Montant HT · État · Indice ; a row opens the article page ; the add form sits at
// the bottom of the table (free article, or from the catalogue). Amounts come from the server summary
// (the share of each placement, the total for a fee line).
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useProjectSummary, type LineAmountsRead } from '../../api/queries/budget'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl, useProducts } from '../../api/queries/product'
import { locationLabel, type LocationRead } from '../../api/queries/project'
import {
  ENGAGED_STATUSES,
  ITEM_STATUS_LABELS,
  useCreateItem,
  useProjectItems,
  type ProjectItemCreate,
  type ProjectItemRead,
} from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { EntityPicker } from '../../components/forms/EntityPicker'
import { Form } from '../../components/forms/Form'
import { centsToText } from '../../components/forms/MoneyField'
import { milliToText, QuantityField } from '../../components/forms/QuantityField'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { useToast } from '../../components/ui/Toast'
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
  return (
    <Card
      title="Articles"
      label="Articles"
      actions={
        count > 0 ? (
          <span className="text-sm text-neutral-500">
            {count} article{count > 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      {items.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {items.data && count === 0 && (
        <p className="mb-4 text-sm text-neutral-500">Aucun article. Ajouter le premier ci-dessous : libre, ou depuis le catalogue.</p>
      )}
      {count > 0 && (
        <table className="mb-5 w-full text-sm" aria-label="Articles du projet">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
              <th className="w-12 px-2 py-2"></th>
              <th className="px-2 py-2">Code</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Désignation</th>
              <th className="px-2 py-2 text-right">Qté</th>
              <th className="px-2 py-2">Fournisseur</th>
              <th className="px-2 py-2 text-right">Montant HT</th>
              <th className="px-2 py-2">État</th>
              <th className="px-2 py-2 text-center">Indice</th>
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
      {!readOnly && <AddItemCard projectId={projectId} locations={locations.filter((l) => l.archivedAt === null)} />}
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
  return (
    <>
      <tr>
        <td colSpan={9} className="px-2 pt-5 pb-1.5 text-sm">
          {group.code && <span className="mr-2 font-mono text-xs text-neutral-500">{group.code}</span>}
          <span className="font-semibold">{group.title}</span>
          {group.detail && <span className="text-neutral-500"> · {group.detail}</span>}
          {group.multiplier > 1 && (
            <span className="ml-2 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700">× {group.multiplier}</span>
          )}
        </td>
      </tr>
      {group.rows.length === 0 && (
        <tr>
          <td colSpan={9} className="px-2 py-2 text-xs text-neutral-400">
            Aucun article ici.
          </td>
        </tr>
      )}
      {group.rows.map(({ item, placement, amounts }) => {
        const image = item.files.find((f) => f.isPrimary)
        const muted = item.status === 'cancelled'
        const share = placement ? amounts?.placements.find((p) => p.placementId === placement.id)?.totalHtCents : amounts?.totalHtCents
        return (
          <tr
            key={`${item.id}-${placement?.id ?? 'fee'}`}
            onClick={() => onOpen(item.id)}
            className={`cursor-pointer border-t border-neutral-100 hover:bg-neutral-50 ${muted ? 'text-neutral-400' : ''}`}
            aria-label={`${item.itemCode} dans ${group.key === 'fees' ? 'frais' : group.code || 'non affecté'}`}
          >
            <td className="px-2 py-2.5">
              {image ? (
                <img src={fileContentUrl(image.fileId)} alt="" className="h-9 w-9 rounded-md border border-neutral-200 object-cover" />
              ) : (
                <span className="block h-9 w-9 rounded-md border border-dashed border-neutral-200" />
              )}
            </td>
            <td className="px-2 py-2.5 font-mono text-xs text-neutral-600">{item.itemCode}</td>
            <td className="px-2 py-2.5 text-neutral-600">{item.kind === 'fee' ? 'Frais' : typeName(item.categoryId)}</td>
            <td className={`px-2 py-2.5 font-medium ${muted ? 'line-through' : ''}`}>{item.name}</td>
            <td className="px-2 py-2.5 text-right tabular-nums">
              {placement ? milliToText(placement.qtyMilli) : '—'}
              {placement && group.multiplier > 1 && <span className="text-xs text-neutral-400"> × {group.multiplier}</span>}
            </td>
            <td className="px-2 py-2.5 text-neutral-600">{supplierName(item.supplierId)}</td>
            <td className="px-2 py-2.5 text-right tabular-nums">{share !== undefined && !muted ? `${centsToText(share)} €` : ''}</td>
            <td className="px-2 py-2.5">
              {readOnly ? (
                <Pill filled={ENGAGED_STATUSES.includes(item.status)}>{ITEM_STATUS_LABELS[item.status]}</Pill>
              ) : (
                <StatusSelect item={item} readOnly={readOnly} />
              )}
            </td>
            <td className="px-2 py-2.5 text-center">{item.indice ?? ''}</td>
          </tr>
        )
      })}
    </>
  )
}

type AddValues = { productId: number | null; name: string; categoryId: number | null; locationId: number | null; qtyMilli: number | null; fxRate: string }

function AddItemCard({ projectId, locations }: { projectId: number; locations: LocationRead[] }) {
  const [search, setSearch] = useState('')
  const products = useProducts({ ...ALL, q: search, categoryId: null, manufacturerId: null, supplierId: null, limit: 50 })
  const categories = useCategories(false)
  const create = useCreateItem()
  const toast = useToast()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<AddValues>({
    defaultValues: { productId: null, name: '', categoryId: null, locationId: locations[0]?.id ?? null, qtyMilli: 1000, fxRate: '' },
  })
  const productId = useWatch({ control: form.control, name: 'productId' })
  const product = (products.data?.items ?? []).find((p) => p.id === productId)
  for (const detail of serverErrors) {
    const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field === 'placements' ? 'locationId' : detail.field
    if (field in form.getValues() && !form.formState.errors[field as keyof AddValues])
      form.setError(field as keyof AddValues, { type: 'server', message: detail.message })
  }

  async function submit(values: AddValues) {
    setServerErrors([])
    setBanner(null)
    const fx = values.fxRate.trim() ? Math.round(Number(values.fxRate.replace(',', '.')) * 1_000_000) : null
    const data: ProjectItemCreate = {
      kind: 'product',
      addToCatalogue: true,
      sortOrder: 0,
      productId: values.productId,
      name: values.name.trim() || null,
      categoryId: values.productId ? null : values.categoryId,
      fxRateMicro: fx && fx > 0 ? fx : null,
      placements: [{ locationId: values.locationId, qtyMilli: values.qtyMilli ?? 1000, sortOrder: 0 }],
    }
    try {
      const created = await create.mutateAsync({ projectId, data })
      toast.show({ kind: 'success', message: `${created.itemCode} ajouté.` })
      form.reset({ productId: null, name: '', categoryId: null, locationId: values.locationId, qtyMilli: 1000, fxRate: '' })
      setSearch('')
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') setServerErrors(error.details)
      setBanner(error.message)
    }
  }

  const productOptions = (products.data?.items ?? []).map((p) => ({ id: p.id, label: p.name, hint: p.reference ?? undefined }))
  const categoryOptions = (categories.data ?? []).map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))
  const locationOptions = locations.map((l) => ({ id: l.id, label: locationLabel(l) }))

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold">Ajouter un article</h3>
      <Form form={form} onSubmit={submit} banner={banner}>
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3">
            <TextInput name="name" label="Désignation" hint={product ? 'Vide = nom du produit du catalogue' : undefined} />
          </div>
          <EntityPicker name="categoryId" label="Type" options={categoryOptions} required={!product} hint={product ? 'Celui du produit' : undefined} />
          <EntityPicker name="locationId" label="Localisation" options={locationOptions} emptyLabel="Non affecté" />
          <QuantityField name="qtyMilli" label="Quantité" hint="Par localisation" />
          <div className="col-span-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              Ou depuis le catalogue
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                placeholder="Rechercher un produit…"
                aria-label="Rechercher un produit"
              />
            </label>
          </div>
          <div className="col-span-2">
            <EntityPicker name="productId" label="Produit" options={productOptions} emptyLabel="— aucun —" />
          </div>
          {product && product.currency !== 'EUR' ? (
            <TextInput name="fxRate" label={`Taux (1 ${product.currency} = … €)`} placeholder="vide si déjà connu" />
          ) : (
            <div />
          )}
        </div>
        <Button type="submit" variant="primary" disabled={create.isPending}>
          Ajouter l'article
        </Button>
      </Form>
    </div>
  )
}
