// The article page (ADR-0013): photo and drawing, the spec sheet and budget in one form, the
// placements by location, the journal. The supplier can be created in place.
import { useEffect, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useProjectSummary } from '../../api/queries/budget'
import { useCategories } from '../../api/queries/category'
import { CLOSED_STATUSES, locationLabel, useLocations, useProject, type LocationRead } from '../../api/queries/project'
import {
  ENGAGED_STATUSES,
  ITEM_STATUS_LABELS,
  useAddPlacement,
  useDeleteItem,
  useDeletePlacement,
  useItemEvents,
  useProjectItem,
  useUpdateItem,
  useUpdatePlacement,
  type EventRead,
  type ProjectItemRead,
} from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { Form } from '../../components/forms/Form'
import { centsToText } from '../../components/forms/MoneyField'
import { milliToText, textToMilli } from '../../components/forms/QuantityField'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pill } from '../../components/ui/Pill'
import { useToast } from '../../components/ui/Toast'
import { NewSupplierModal } from './InlineCreate'
import { ItemFiles } from './ItemFiles'
import { fromItem, ItemFields, toUpdatePayload, type ItemFormValues } from './ItemForm'
import { StatusSelect } from './StatusSelect'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

export function ItemPage() {
  const params = useParams<{ id: string; itemId: string }>()
  const projectId = Number(params.id)
  const itemId = Number(params.itemId)
  const navigate = useNavigate()
  const project = useProject(projectId)
  const item = useProjectItem(itemId)
  const locations = useLocations(projectId, true)
  const summary = useProjectSummary(projectId)
  const categories = useCategories(false)
  const suppliers = useSuppliers(ALL)
  const events = useItemEvents(itemId)
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const toast = useToast()
  const [modal, setModal] = useState<'supplier' | null>(null)
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const form = useForm<ItemFormValues>({ defaultValues: item.data ? fromItem(item.data) : undefined })

  useEffect(() => {
    if (item.data && !form.formState.isDirty) form.reset(fromItem(item.data))
  }, [item.data, form])
  useEffect(() => {
    for (const detail of serverErrors) {
      const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
      if (item.data && field in fromItem(item.data)) form.setError(field as Path<ItemFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form, item.data])

  if (project.isPending || item.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (project.isError || item.isError) {
    const message = project.isError ? project.error.message : item.isError ? item.error.message : ''
    return (
      <EmptyState title={message}>
        <Link to={`/projects/${projectId}`} className="underline">
          Retour au projet
        </Link>
      </EmptyState>
    )
  }
  const p = project.data
  const it = item.data
  const readOnly = CLOSED_STATUSES.includes(p.status)
  const amounts = summary.data?.lines.find((l) => l.projectItemId === it.id)
  const supplier = suppliers.data?.items.find((s) => s.id === it.supplierId)
  const typeName = categories.data?.find((c) => c.id === it.categoryId)?.name ?? ''

  async function submit(values: ItemFormValues) {
    setServerErrors([])
    setBanner(null)
    try {
      const saved = await update.mutateAsync({ id: it.id, data: toUpdatePayload(values, it) })
      form.reset(fromItem(saved))
      toast.show({ kind: 'success', message: 'Article enregistré.' })
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') setServerErrors(error.details)
      setBanner(error.message)
    }
  }

  const options = (rows: { id: number; name: string }[] | undefined) => (rows ?? []).map((r) => ({ id: r.id, label: r.name }))

  return (
    <section>
      <PageHeader
        title={it.name}
        crumbs={
          <>
            <Link to="/projects" className="hover:underline">
              Projets
            </Link>
            {' / '}
            <Link to={`/projects/${p.id}`} className="hover:underline">
              {p.name}
            </Link>
            {' / '}
            <span className="font-mono">{it.itemCode}</span>
          </>
        }
        subtitle={
          <>
            <span className="font-mono text-xs">{it.itemCode}</span>
            <span>·</span>
            <span>{it.kind === 'fee' ? 'Frais' : typeName}</span>
            <span>·</span>
            {readOnly ? (
              <Pill filled={ENGAGED_STATUSES.includes(it.status)}>{ITEM_STATUS_LABELS[it.status]}</Pill>
            ) : (
              <StatusSelect item={it} readOnly={readOnly} />
            )}
            {amounts && (
              <>
                <span>·</span>
                <span>
                  {milliToText(amounts.totalQtyMilli)} × {centsToText(amounts.netUnitEurCents)} € ={' '}
                  <strong className="text-neutral-900">{centsToText(amounts.totalHtCents)} € HT</strong>
                </span>
              </>
            )}
            {it.indice && (
              <>
                <span>·</span>
                <span>Indice {it.indice}</span>
              </>
            )}
          </>
        }
        actions={
          <>
            {!readOnly && it.status === 'to_quote' && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
            <Link to={`/projects/${p.id}`}>
              <Button variant="ghost">Retour au projet</Button>
            </Link>
          </>
        }
      />
      <div className="space-y-6">
        <Card title="Photo et dessin">
          <ItemFiles item={it} readOnly={readOnly} />
        </Card>
        <Card title="Article">
          <Form form={form} onSubmit={submit} banner={banner}>
            <ItemFields
              form={form}
              kind={it.kind}
              categories={(categories.data ?? []).map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
              suppliers={options(suppliers.data?.items)}
              onCreateSupplier={readOnly ? undefined : () => setModal('supplier')}
              contact={
                supplier && (supplier.contactName || supplier.phone || supplier.email)
                  ? [supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(' · ')
                  : undefined
              }
            />
            {!readOnly && (
              <Button type="submit" variant="primary" disabled={update.isPending}>
                Enregistrer
              </Button>
            )}
          </Form>
        </Card>
        {it.kind === 'product' && (
          <PlacementsCard
            item={it}
            locations={(locations.data ?? []).filter((l) => l.archivedAt === null || it.placements.some((pl) => pl.locationId === l.id))}
            readOnly={readOnly}
          />
        )}
        <Card title="Historique">
          <History events={events.data ?? []} />
        </Card>
      </div>
      <NewSupplierModal
        open={modal === 'supplier'}
        onClose={() => setModal(null)}
        onCreated={(id) => {
          setModal(null)
          form.setValue('supplierId', id, { shouldDirty: true })
          toast.show({ kind: 'success', message: 'Fournisseur créé.' })
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Supprimer ${it.itemCode} ?`}
        actions={[
          {
            label: 'Supprimer',
            variant: 'danger',
            onClick: () =>
              void remove
                .mutateAsync(it.id)
                .then(() => {
                  toast.show({ kind: 'success', message: 'Article supprimé.' })
                  navigate(`/projects/${p.id}`)
                })
                .catch((error: unknown) => {
                  setConfirmDelete(false)
                  toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
                }),
          },
          { label: 'Annuler', onClick: () => setConfirmDelete(false) },
        ]}
      >
        Possible tant que l'article est « à chiffrer » et sans historique ; sinon, l'annuler.
      </ConfirmDialog>
    </section>
  )
}

function PlacementsCard({ item, locations, readOnly }: { item: ProjectItemRead; locations: LocationRead[]; readOnly: boolean }) {
  const add = useAddPlacement()
  const update = useUpdatePlacement()
  const remove = useDeletePlacement()
  const toast = useToast()
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const fail = (error: unknown) =>
    toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true })
  const locationOf = (id: number | null) => locations.find((l) => l.id === id)

  return (
    <Card title="Implantation" label="Implantation">
      <table className="mb-4 w-full text-sm" aria-label="Implantations de l'article">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-sm text-neutral-900">
            <th className="px-2 py-2 font-medium">Localisation</th>
            <th className="px-2 py-2 text-right font-medium">Quantité</th>
            <th className="px-2 py-2 text-right font-medium">Nombre</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {item.placements.map((placement) => {
            const location = locationOf(placement.locationId)
            const multiplier = location?.multiplier ?? 1
            return (
              <tr key={placement.id} className="border-b border-neutral-200">
                <td className="px-2 py-2">{location ? locationLabel(location) : 'Non affecté'}</td>
                <td className="px-2 py-2 text-right">
                  {readOnly ? (
                    milliToText(placement.qtyMilli)
                  ) : (
                    <input
                      key={placement.qtyMilli}
                      defaultValue={milliToText(placement.qtyMilli)}
                      inputMode="decimal"
                      aria-label={`Quantité dans ${location?.code ?? 'non affecté'}`}
                      className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-right text-sm"
                      onBlur={(event) => {
                        const milli = textToMilli(event.target.value)
                        if (milli !== undefined && milli !== null && milli !== placement.qtyMilli)
                          update.mutateAsync({ id: placement.id, data: { qtyMilli: milli } }).catch(fail)
                      }}
                    />
                  )}
                </td>
                <td className="px-2 py-2 text-right">×{multiplier}</td>
                <td className="px-2 py-2 text-right">{milliToText(placement.qtyMilli * multiplier)}</td>
                <td className="px-2 py-2 text-right text-xs">
                  {!readOnly && item.placements.length > 1 && (
                    <button
                      type="button"
                      className="text-red-700 underline"
                      onClick={() => remove.mutateAsync(placement.id).catch(fail)}
                      aria-label={`Retirer de ${location?.code ?? 'non affecté'}`}
                    >
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Localisation à ajouter
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="">Non affecté</option>
              {locations
                .filter((l) => l.archivedAt === null && !item.placements.some((p) => p.locationId === l.id))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {locationLabel(l)}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Quantité à ajouter
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-right text-sm font-normal"
            />
          </label>
          <Button
            variant="primary"
            disabled={add.isPending}
            onClick={() => {
              const milli = textToMilli(qty)
              if (milli === undefined || milli === null) return toast.show({ kind: 'error', message: 'Quantité invalide.' })
              add
                .mutateAsync({ itemId: item.id, data: { locationId: locationId ? Number(locationId) : null, qtyMilli: milli, sortOrder: 0 } })
                .then(() => setQty('1'))
                .catch(fail)
            }}
          >
            Ajouter
          </Button>
        </div>
      )}
    </Card>
  )
}

const EVENT_LABELS: Record<string, string> = {
  created: 'Création',
  status: 'Statut',
  price: 'Prix',
  product: 'Produit',
  placement: 'Implantation',
  other: 'Autre',
}

function History({ events }: { events: EventRead[] }) {
  if (events.length === 0) return <p className="text-sm text-neutral-500">Aucun événement.</p>
  return (
    <ul className="space-y-1 text-sm" aria-label="Historique de l'article">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className="w-40 shrink-0 text-neutral-500">{e.changedAt.replace('T', ' ').slice(0, 16)}</span>
          <span className="w-24 shrink-0 font-medium">{EVENT_LABELS[e.kind] ?? e.kind}</span>
          <span>
            {e.kind === 'status' && e.fromStatus && e.toStatus
              ? `${ITEM_STATUS_LABELS[e.fromStatus as keyof typeof ITEM_STATUS_LABELS] ?? e.fromStatus} → ${ITEM_STATUS_LABELS[e.toStatus as keyof typeof ITEM_STATUS_LABELS] ?? e.toStatus}`
              : e.kind === 'price' && e.newValue
                ? 'Prix, remise ou devise modifiés'
                : e.kind === 'created' && e.note
                  ? e.note
                  : ''}
            {e.note && e.kind !== 'created' ? ` — ${e.note}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
