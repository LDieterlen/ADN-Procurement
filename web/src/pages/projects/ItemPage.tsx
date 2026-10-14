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
import { Card, Dot, PageHeader } from '../../components/ui/Card'
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

  if (project.isPending || item.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
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
            <span className="font-mono text-[12.5px] text-ink-2">{it.itemCode}</span>
            <Dot />
            <span>{it.kind === 'fee' ? 'Frais' : typeName}</span>
            <Dot />
            {readOnly ? <Pill status={it.status}>{ITEM_STATUS_LABELS[it.status]}</Pill> : <StatusSelect item={it} readOnly={readOnly} />}
            {amounts && (
              <>
                <Dot />
                <span className="tabular-nums">
                  {milliToText(amounts.totalQtyMilli)} × {centsToText(amounts.netUnitEurCents)} € ={' '}
                  <strong className="font-semibold text-ink">{centsToText(amounts.totalHtCents)} € HT</strong>
                </span>
              </>
            )}
            {it.indice && (
              <>
                <Dot />
                <span>Indice {it.indice}</span>
              </>
            )}
          </>
        }
        actions={
          <Link to={`/projects/${p.id}`}>
            <Button variant="ghost">Retour au projet</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-[340px_1fr] items-start gap-6">
        <div className="space-y-4">
          <Card title="Photo et dessin" padding="form">
            <ItemFiles item={it} readOnly={readOnly} />
          </Card>
          {supplier && (
            <Card label="Représentant" padding="form">
              <div className="text-[12.5px] font-medium text-ink-2">Représentant {supplier.name}</div>
              {supplier.contactName || supplier.mobile || supplier.phone || supplier.email ? (
                <div className="mt-1.5 space-y-0.5 text-sm">
                  {supplier.contactName && <div className="font-medium">{supplier.contactName}</div>}
                  {(supplier.mobile ?? supplier.phone) && <div className="text-ink-2">{supplier.mobile ?? supplier.phone}</div>}
                  {supplier.email && (
                    <div>
                      <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 text-sm text-ink-3">Aucun contact renseigné.</div>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Form form={form} onSubmit={submit} banner={banner}>
            <Card title="Fiche" label="Fiche" padding="form">
              <ItemFields
                form={form}
                kind={it.kind}
                categories={(categories.data ?? []).map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
                suppliers={options(suppliers.data?.items)}
                onCreateSupplier={readOnly ? undefined : () => setModal('supplier')}
              />
            </Card>
            {!readOnly && (
              <div className="mt-4 flex items-center gap-3">
                <Button type="submit" variant="primary" disabled={update.isPending}>
                  Enregistrer
                </Button>
                <span className="text-[13px] text-ink-3">Fiche et budget s'enregistrent ensemble.</span>
              </div>
            )}
          </Form>
          {it.kind === 'product' && (
            <PlacementsCard
              item={it}
              locations={(locations.data ?? []).filter((l) => l.archivedAt === null || it.placements.some((pl) => pl.locationId === l.id))}
              readOnly={readOnly}
            />
          )}
          <Card title="Historique" padding="form">
            <History events={events.data ?? []} />
          </Card>
          {!readOnly && it.status === 'to_quote' && (
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer l'article
              </Button>
            </div>
          )}
        </div>
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
    <Card title="Implantation" label="Implantation" padding="table">
      <table className="w-full text-sm" aria-label="Implantations de l'article">
        <thead>
          <tr className="border-b border-line text-left text-[12.5px] font-medium text-ink-2">
            <th className="py-2.5 pl-5">Code</th>
            <th className="px-3 py-2.5">Localisation</th>
            <th className="px-3 py-2.5 text-right">Quantité</th>
            <th className="px-3 py-2.5 text-right">Nombre</th>
            <th className="px-3 py-2.5 text-right">Total</th>
            <th className="py-2.5 pr-5"></th>
          </tr>
        </thead>
        <tbody>
          {item.placements.map((placement) => {
            const location = locationOf(placement.locationId)
            const multiplier = location?.multiplier ?? 1
            return (
              <tr key={placement.id} className="border-b border-line-soft">
                <td className="py-2 pl-5 font-mono text-xs font-medium whitespace-nowrap">{placement.code}</td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    location ? (
                      <>
                        <span className="mr-2 font-mono text-xs text-ink-2">{location.code}</span>
                        {location.name}
                      </>
                    ) : (
                      'Non affecté'
                    )
                  ) : (
                    <select
                      value={placement.locationId ?? ''}
                      aria-label={`Localisation de l'implantation ${location?.code ?? 'non affecté'}`}
                      className="control h-[30px] max-w-[260px] text-[13px]"
                      onChange={(event) => {
                        const next = event.target.value ? Number(event.target.value) : null
                        if (next !== placement.locationId) update.mutateAsync({ id: placement.id, data: { locationId: next } }).catch(fail)
                      }}
                    >
                      <option value="">Non affecté</option>
                      {locations
                        .filter(
                          (l) =>
                            l.id === placement.locationId ||
                            (l.archivedAt === null && !item.placements.some((other) => other.id !== placement.id && other.locationId === l.id)),
                        )
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {locationLabel(l)}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {readOnly ? (
                    milliToText(placement.qtyMilli)
                  ) : (
                    <input
                      key={placement.qtyMilli}
                      defaultValue={milliToText(placement.qtyMilli)}
                      inputMode="decimal"
                      aria-label={`Quantité dans ${location?.code ?? 'non affecté'}`}
                      className="control h-[30px] w-16 px-2 text-right tabular-nums"
                      onBlur={(event) => {
                        const milli = textToMilli(event.target.value)
                        if (milli !== undefined && milli !== null && milli !== placement.qtyMilli)
                          update.mutateAsync({ id: placement.id, data: { qtyMilli: milli } }).catch(fail)
                      }}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right text-ink-2">× {multiplier}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{milliToText(placement.qtyMilli * multiplier)}</td>
                <td className="py-2 pr-5 text-right text-[13px]">
                  {!readOnly && item.placements.length > 1 && (
                    <button
                      type="button"
                      className="text-danger hover:underline"
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
        <div className="flex flex-wrap items-end gap-3 border-t border-line bg-sunken px-5 py-3">
          <label className="flex flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
            Localisation à ajouter
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="control h-8 font-normal">
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
          <label className="flex w-[110px] flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
            Quantité à ajouter
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="control h-8 text-right font-normal tabular-nums" />
          </label>
          <Button
            variant="secondary"
            size="xs"
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
  placement: 'Implantation',
  indice: 'Indice',
  other: 'Autre',
}

function History({ events }: { events: EventRead[] }) {
  if (events.length === 0) return <p className="text-sm text-ink-3">Aucun événement.</p>
  return (
    <ul className="text-[13.5px]" aria-label="Historique de l'article">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="grid grid-cols-[150px_100px_1fr] gap-3 border-t border-line-soft py-2.5 first:border-t-0">
          <span className="text-ink-3 tabular-nums">{e.changedAt.replace('T', ' ').slice(0, 16)}</span>
          <span className="font-medium">{EVENT_LABELS[e.kind] ?? e.kind}</span>
          <span className="text-ink-2">
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
