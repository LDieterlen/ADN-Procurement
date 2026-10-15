// The article page (ADR-0013): photo and drawing, the spec sheet and budget, the status, the
// placements by location, the options, the journal. Every change is a draft until « Enregistrer »
// (next to « Retour au projet », and in a bar at the bottom while something is pending), saved in
// one transaction (`POST /project-items/{id}/save`, all or nothing); leaving with pending changes
// asks first (2026-10-15). The supplier can be created in place.
import { useEffect, useRef, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useProjectSummary } from '../../api/queries/budget'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl } from '../../api/queries/file'
import { CLOSED_STATUSES, locationLabel, useLocations, useProject, type LocationRead } from '../../api/queries/project'
import {
  ITEM_STATUS_LABELS,
  useDeleteItem,
  useItemEvents,
  useProjectItem,
  useProjectItems,
  useSaveItem,
  type EventRead,
  type ItemFileRead,
  type ItemSave,
  type ItemStatus,
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

/** A placement as edited: `id` null = added on the page, saved with the rest. */
type DraftPlacement = { key: string; id: number | null; locationId: number | null; qtyMilli: number; sortOrder: number }
/** Everything of the page that is not the sheet form: saved by the same « Enregistrer ». */
type Draft = {
  status: { status: ItemStatus; note: string | null }
  placements: DraftPlacement[]
  files: ItemFileRead[]
  attach: number[]
  optionAction: 'retain' | 'detach' | null
}

function draftOf(item: ProjectItemRead): Draft {
  return {
    status: { status: item.status, note: null },
    placements: item.placements.map((p) => ({ key: `p${p.id}`, id: p.id, locationId: p.locationId, qtyMilli: p.qtyMilli, sortOrder: p.sortOrder })),
    files: item.files,
    attach: [],
    optionAction: null,
  }
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

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
  const projectItems = useProjectItems(projectId)
  const save = useSaveItem()
  const remove = useDeleteItem()
  const toast = useToast()
  const [modal, setModal] = useState<'supplier' | null>(null)
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const form = useForm<ItemFormValues>({ defaultValues: item.data ? fromItem(item.data) : undefined })
  const [draft, setDraft] = useState<Draft | null>(item.data ? draftOf(item.data) : null)
  const leaving = useRef(false) // set before a navigation that must not be stopped (after a delete)

  const original = item.data ? draftOf(item.data) : null
  const draftDirty = draft !== null && original !== null && !sameJson(draft, original)
  const dirty = form.formState.isDirty || draftDirty

  // Load the article into the page: on another article (option links) always, otherwise (a refetch
  // after a save elsewhere) only when nothing is pending.
  const loaded = useRef<number | null>(null)
  const dirtyNow = useRef(false)
  dirtyNow.current = dirty
  useEffect(() => {
    if (!item.data) return
    if (loaded.current !== item.data.id || !dirtyNow.current) {
      loaded.current = item.data.id
      form.reset(fromItem(item.data))
      setDraft(draftOf(item.data))
    }
  }, [item.data, form])
  useEffect(() => {
    for (const detail of serverErrors) {
      const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
      if (item.data && field in fromItem(item.data)) form.setError(field as Path<ItemFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form, item.data])
  // Closing the tab or reloading with pending changes: the browser's own warning.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname)

  if (project.isPending || item.isPending || draft === null) return <p className="text-sm text-ink-3">Chargement…</p>
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
  const d = draft
  const readOnly = CLOSED_STATUSES.includes(p.status)
  const amounts = summary.data?.lines.find((l) => l.projectItemId === it.id)
  const supplier = suppliers.data?.items.find((s) => s.id === it.supplierId)
  const typeName = categories.data?.find((c) => c.id === it.categoryId)?.name ?? ''
  const all = projectItems.data ?? []
  const base = it.optionOfId !== null ? all.find((i) => i.id === it.optionOfId) : undefined
  const itemOptions = all.filter((i) => i.optionOfId === it.id)
  // Before the project's first indice any article can be deleted (ADR-0021); after, only a new one.
  const deletable = !readOnly && itemOptions.length === 0 && (p.indice === null || it.status === 'to_quote')
  const patch = (change: Partial<Draft>) => setDraft({ ...d, ...change })

  /** Saves everything pending; true when saved. */
  async function saveAll(): Promise<boolean> {
    setServerErrors([])
    setBanner(null)
    let saved = false
    await form.handleSubmit(async (values) => {
      const data: ItemSave = { attachOptions: d.attach }
      if (form.formState.isDirty) data.sheet = toUpdatePayload(values, it)
      if (d.status.status !== it.status) data.status = d.status
      if (!sameJson(d.placements, original?.placements))
        data.placements = d.placements.map((pl) => ({ id: pl.id, locationId: pl.locationId, qtyMilli: pl.qtyMilli, sortOrder: pl.sortOrder }))
      if (!sameJson(d.files, original?.files))
        data.files = d.files.map((f, index) => ({ fileId: f.fileId, kind: f.kind, isPrimary: f.isPrimary, caption: f.caption, sortOrder: index }))
      if (d.optionAction) data.optionAction = d.optionAction
      try {
        const result = await save.mutateAsync({ id: it.id, data })
        form.reset(fromItem(result))
        setDraft(draftOf(result))
        toast.show({ kind: 'success', message: 'Article enregistré.' })
        saved = true
      } catch (error) {
        if (!isApiError(error)) throw error
        if (error.code === 'validation_error') setServerErrors(error.details)
        setBanner(error.details[0]?.message ?? error.message)
        toast.show({ kind: 'error', message: `Rien n'a été enregistré : ${error.details[0]?.message ?? error.message}`, persistent: true })
      }
    })()
    return saved
  }
  function discard() {
    form.reset(fromItem(it))
    setDraft(draftOf(it))
    setBanner(null)
  }

  const options = (rows: { id: number; name: string }[] | undefined) => (rows ?? []).map((r) => ({ id: r.id, label: r.name }))
  const saveButton = !readOnly && (
    <Button variant="primary" disabled={!dirty || save.isPending} onClick={() => void saveAll()}>
      {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
    </Button>
  )

  return (
    <section className={dirty ? 'pb-20' : ''}>
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
            {readOnly ? (
              <Pill status={it.status}>{ITEM_STATUS_LABELS[it.status]}</Pill>
            ) : (
              <StatusSelect item={it} readOnly={readOnly} value={d.status.status} onChange={(status, note) => patch({ status: { status, note } })} />
            )}
            {d.status.status !== it.status && <span className="text-[12px] text-warn">à enregistrer</span>}
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
          <>
            <Link to={`/projects/${p.id}`}>
              <Button variant="ghost">Retour au projet</Button>
            </Link>
            {saveButton}
          </>
        }
      />
      <div className="grid grid-cols-[340px_1fr] items-start gap-6">
        <div className="space-y-4">
          <Card title="Photo et dessin" padding="form">
            <ItemFiles files={d.files} onChange={(files) => patch({ files })} readOnly={readOnly} />
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
          {it.optionOfId !== null && (
            <Card title={`Option ${it.optionLetter ?? ''}`} label="Option" padding="form">
              <p className="text-sm text-ink-2">
                Alternative à{' '}
                <Link to={`/projects/${p.id}/items/${it.optionOfId}`} className="font-medium text-ink hover:underline">
                  <span className="font-mono">{base?.itemCode}</span> — {base?.name}
                </Link>
                . Elle reprend ses localisations et quantités ; son montant est indicatif, hors des totaux du projet.
              </p>
              {!readOnly &&
                (d.optionAction ? (
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn" role="status">
                    {d.optionAction === 'retain'
                      ? "Sera retenue à la place de l'article de base à l'enregistrement."
                      : "Sera détachée (article indépendant, non affecté) à l'enregistrement."}
                    <button type="button" className="ml-auto font-medium underline" onClick={() => patch({ optionAction: null })}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button variant="primary" onClick={() => patch({ optionAction: 'retain' })}>
                      Retenir cette option
                    </Button>
                    <Button variant="secondary" onClick={() => patch({ optionAction: 'detach' })}>
                      Détacher
                    </Button>
                  </div>
                ))}
            </Card>
          )}
          <Form form={form} onSubmit={() => void saveAll()} banner={banner}>
            <Card title="Fiche" label="Fiche" padding="form">
              <ItemFields
                form={form}
                kind={it.kind}
                categories={(categories.data ?? [])
                  .filter((c) => it.optionOfId === null || c.id === it.categoryId) // an option keeps its base's type
                  .map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
                suppliers={options(suppliers.data?.items)}
                onCreateSupplier={readOnly ? undefined : () => setModal('supplier')}
              />
            </Card>
          </Form>
          {it.kind === 'product' && it.optionOfId === null && (
            <PlacementsCard
              item={it}
              placements={d.placements}
              onChange={(placements) => patch({ placements })}
              locations={(locations.data ?? []).filter((l) => l.archivedAt === null || it.placements.some((pl) => pl.locationId === l.id))}
              readOnly={readOnly}
            />
          )}
          {it.kind === 'product' && it.optionOfId === null && (
            <OptionsCard
              item={it}
              options={itemOptions}
              pending={d.attach.map((id) => all.find((i) => i.id === id)).filter((i): i is ProjectItemRead => i !== undefined)}
              onPendingChange={(attach) => patch({ attach })}
              candidates={all.filter(
                (i) =>
                  i.id !== it.id &&
                  i.kind === 'product' &&
                  i.categoryId === it.categoryId && // an option has its base's type (ADR-0021)
                  i.optionOfId === null &&
                  !d.attach.includes(i.id) &&
                  !all.some((o) => o.optionOfId === i.id),
              )}
              amountOf={(id) => summary.data?.lines.find((l) => l.projectItemId === id)?.totalHtCents}
              supplierName={(id) => suppliers.data?.items.find((s) => s.id === id)?.name ?? ''}
              readOnly={readOnly}
            />
          )}
          <Card title="Historique" padding="form">
            <History events={events.data ?? []} />
          </Card>
          {deletable && (
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer l'article
              </Button>
            </div>
          )}
        </div>
      </div>
      {dirty && !readOnly && (
        <div
          role="region"
          aria-label="Modifications non enregistrées"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-6 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-[1240px] items-center gap-3">
            <span className="text-sm text-ink-2">Modifications non enregistrées.</span>
            <Button variant="ghost" className="ml-auto" onClick={discard}>
              Annuler les modifications
            </Button>
            {saveButton}
          </div>
        </div>
      )}
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
        open={blocker.state === 'blocked'}
        title="Modifications non enregistrées"
        actions={[
          {
            label: 'Enregistrer et quitter',
            variant: 'primary',
            onClick: () =>
              void saveAll().then((ok) => {
                if (ok) blocker.proceed?.()
                else blocker.reset?.()
              }),
          },
          { label: 'Quitter sans enregistrer', variant: 'danger', onClick: () => blocker.proceed?.() },
          { label: 'Rester sur la page', onClick: () => blocker.reset?.() },
        ]}
      >
        Les modifications de cet article ne sont pas enregistrées.
      </ConfirmDialog>
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
                  leaving.current = true
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
        {p.indice === null
          ? 'Avant le premier indice, tout article se supprime ; ses codes sont libérés et les suivants remontent.'
          : "Possible tant que l'article est « à chiffrer » et sans historique ; sinon, l'annuler."}
      </ConfirmDialog>
    </section>
  )
}

/** The options of a base article (ADR-0021): list, « + Nouvelle option » (creation page) or an
 * existing article of the project attached as an option, pending until « Enregistrer ». */
function OptionsCard({
  item,
  options,
  pending,
  onPendingChange,
  candidates,
  amountOf,
  supplierName,
  readOnly,
}: {
  item: ProjectItemRead
  options: ProjectItemRead[]
  pending: ProjectItemRead[]
  onPendingChange: (ids: number[]) => void
  candidates: ProjectItemRead[]
  amountOf: (id: number) => number | undefined
  supplierName: (id: number | null) => string
  readOnly: boolean
}) {
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState('')
  const thumb = (row: ProjectItemRead) => {
    const photo = row.files.find((f) => f.isPrimary)
    return photo ? (
      <img
        src={fileContentUrl(photo.fileId, photo.sha256)}
        alt={`Photo ${row.name}`}
        className="h-10 w-10 rounded-[5px] border border-line bg-white object-contain"
      />
    ) : (
      <span className="block h-10 w-10 rounded-[5px] border border-dashed border-line-strong bg-sunken" />
    )
  }
  return (
    <Card
      title="Options"
      label="Options"
      padding="table"
      meta={options.length ? `${options.length} option${options.length > 1 ? 's' : ''} · montants indicatifs, hors totaux` : undefined}
      actions={
        !readOnly && (
          <Link to={`/projects/${item.projectId}/items/new?optionOf=${item.id}`}>
            <Button variant="secondary" size="sm">
              + Nouvelle option
            </Button>
          </Link>
        )
      }
    >
      {options.length === 0 && pending.length === 0 ? (
        <p className="px-5 py-4 text-sm text-ink-3">Aucune option : proposer une alternative à cet article.</p>
      ) : (
        <table className="w-full text-sm" aria-label="Options de l'article">
          <tbody>
            {options.map((option) => {
              const amount = amountOf(option.id)
              return (
                <tr
                  key={option.id}
                  onClick={() => navigate(`/projects/${item.projectId}/items/${option.id}`)}
                  className="cursor-pointer border-b border-line-soft hover:bg-sunken"
                >
                  <td className="w-14 py-2 pl-5">{thumb(option)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium whitespace-nowrap">{option.itemCode}</td>
                  <td className="px-3 py-2.5 font-medium">{option.name}</td>
                  <td className="px-3 py-2.5 text-right text-ink-2 tabular-nums">{amount !== undefined ? `(${centsToText(amount)} €)` : ''}</td>
                  <td className="py-2.5 pr-5 pl-3 text-right">
                    <Pill status={option.status}>{ITEM_STATUS_LABELS[option.status]}</Pill>
                  </td>
                </tr>
              )
            })}
            {pending.map((row) => (
              <tr key={`pending-${row.id}`} className="border-b border-line-soft bg-warn-soft/40">
                <td className="w-14 py-2 pl-5">{thumb(row)}</td>
                <td className="px-3 py-2.5 text-[12px] text-warn">à enregistrer</td>
                <td className="px-3 py-2.5 font-medium">{row.name}</td>
                <td className="px-3 py-2.5 text-right text-ink-3 text-[12.5px]">devient une option</td>
                <td className="py-2.5 pr-5 pl-3 text-right">
                  <button
                    type="button"
                    className="text-[13px] text-danger hover:underline"
                    aria-label={`Ne pas rattacher ${row.name}`}
                    onClick={() => onPendingChange(pending.filter((o) => o.id !== row.id).map((o) => o.id))}
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!readOnly && candidates.length > 0 && (
        <div className="flex items-end gap-3 border-t border-line bg-sunken px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[12.5px] font-medium text-ink-2">Article existant du même type à rattacher</div>
            <CandidatePicker candidates={candidates} value={candidate} onChange={setCandidate} supplierName={supplierName} />
          </div>
          <Button
            size="sm"
            disabled={!candidate}
            onClick={() => {
              onPendingChange([...pending.map((o) => o.id), Number(candidate)])
              setCandidate('')
            }}
          >
            Rattacher comme option
          </Button>
        </div>
      )}
    </Card>
  )
}

const fold = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Choice of an article with its thumbnail (a native select cannot show images), made for long
 * lists: a search box (code, name, reference, supplier, finish, dimensions; accents and case
 * ignored), the match count, keyboard (↑ ↓ Entrée Échap), supplier and reference under each name. */
function CandidatePicker({
  candidates,
  value,
  onChange,
  supplierName,
}: {
  candidates: ProjectItemRead[]
  value: string
  onChange: (value: string) => void
  supplierName: (id: number | null) => string
}) {
  // The panel is `position: fixed`, placed from the button (below, or above when the window lacks
  // room): the card clips what overflows it, so an absolute list was hidden under the next card.
  const [at, setAt] = useState<{ left: number; width: number; maxHeight: number; top?: number; bottom?: number } | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const open = at !== null
  const root = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (!(event.target instanceof Node && root.current?.contains(event.target))) setAt(null)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function toggle(button: HTMLElement) {
    if (open) return setAt(null)
    const box = button.getBoundingClientRect()
    const below = window.innerHeight - box.bottom
    // At most 380 px (search box + list), never past the window: the list scrolls inside.
    const down = below >= 260 || below >= box.top
    const room = (down ? below : box.top) - 12
    setQuery('')
    setActive(0)
    setAt({
      left: box.left,
      width: box.width,
      maxHeight: Math.min(380, room),
      ...(down ? { top: box.bottom + 4 } : { bottom: window.innerHeight - box.top + 4 }),
    })
  }
  function choose(c: ProjectItemRead) {
    onChange(String(c.id))
    setAt(null)
  }

  const words = fold(query).split(/\s+/).filter(Boolean)
  const haystack = (c: ProjectItemRead) =>
    fold([c.itemCode, c.name, c.productName, c.reference, supplierName(c.supplierId), c.finish, c.dimensions].filter(Boolean).join(' '))
  const matches = words.length ? candidates.filter((c) => words.every((w) => haystack(c).includes(w))) : candidates
  const chosen = candidates.find((c) => String(c.id) === value)
  const line = (c: ProjectItemRead) => {
    const photo = c.files.find((f) => f.isPrimary)
    const detail = [supplierName(c.supplierId), c.reference && `réf. ${c.reference}`, c.dimensions].filter(Boolean).join(' · ')
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        {photo ? (
          <img src={fileContentUrl(photo.fileId, photo.sha256)} alt="" className="h-10 w-10 shrink-0 rounded border border-line bg-white object-contain" />
        ) : (
          <span className="h-10 w-10 shrink-0 rounded border border-dashed border-line-strong bg-sunken" />
        )}
        <span className="min-w-0">
          <span className="block truncate">
            <span className="font-mono text-xs text-ink-2">{c.itemCode}</span> {c.name}
          </span>
          {detail && <span className="block truncate text-[12px] text-ink-3">{detail}</span>}
        </span>
      </span>
    )
  }
  // The chosen article inside the field: one line and a small thumbnail, so the field keeps the
  // height of every other control (the two-line rows with 40 px thumbnails are for the list).
  const compact = (c: ProjectItemRead) => {
    const photo = c.files.find((f) => f.isPrimary)
    return (
      <span className="flex min-w-0 items-center gap-2">
        {photo && (
          <img src={fileContentUrl(photo.fileId, photo.sha256)} alt="" className="h-6 w-6 shrink-0 rounded-[4px] border border-line bg-white object-contain" />
        )}
        <span className="min-w-0 truncate">
          <span className="font-mono text-xs text-ink-2">{c.itemCode}</span> {c.name}
        </span>
      </span>
    )
  }
  return (
    <div ref={root} className="relative" onKeyDown={(event) => event.key === 'Escape' && setAt(null)}>
      <button
        type="button"
        aria-label="Article existant à rattacher"
        aria-expanded={open}
        onClick={(event) => toggle(event.currentTarget)}
        className="control flex h-[34px] w-full items-center justify-between gap-2 bg-white text-left text-[13px]"
      >
        {chosen ? compact(chosen) : <span className="text-ink-3">Choisir un article du projet…</span>}
        <span aria-hidden="true" className="text-ink-3">
          ▾
        </span>
      </button>
      {at && (
        <div
          style={{ left: at.left, width: at.width, top: at.top, bottom: at.bottom, maxHeight: at.maxHeight }}
          className="fixed z-50 flex flex-col overflow-hidden rounded-lg border border-line-strong bg-white text-[13px] shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActive((i) => Math.min(i + 1, matches.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActive((i) => Math.max(i - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  const c = matches[active]
                  if (c) choose(c)
                }
              }}
              placeholder="Rechercher : code, nom, référence, fournisseur…"
              aria-label="Rechercher un article à rattacher"
              className="control h-8 min-w-0 flex-1 text-[13px]"
            />
            <span className="shrink-0 text-[12px] text-ink-3 tabular-nums">
              {words.length ? `${matches.length} sur ${candidates.length}` : `${candidates.length} article${candidates.length > 1 ? 's' : ''}`}
            </span>
          </div>
          <ul ref={listRef} role="listbox" aria-label="Articles à rattacher" className="min-h-0 flex-1 overflow-auto py-1">
            {matches.length === 0 && <li className="px-3 py-2 text-ink-3">Aucun article ne correspond.</li>}
            {matches.map((c, index) => (
              <li
                key={c.id}
                role="option"
                aria-selected={String(c.id) === value}
                data-active={index === active}
                className={`cursor-pointer px-3 py-1.5 ${index === active ? 'bg-sunken' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(c)}
              >
                {line(c)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PlacementsCard({
  item,
  placements,
  onChange,
  locations,
  readOnly,
}: {
  item: ProjectItemRead
  placements: DraftPlacement[]
  onChange: (placements: DraftPlacement[]) => void
  locations: LocationRead[]
  readOnly: boolean
}) {
  const toast = useToast()
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const locationOf = (id: number | null) => locations.find((l) => l.id === id)
  const saved = (draft: DraftPlacement) => item.placements.find((p) => p.id === draft.id)
  const set = (key: string, change: Partial<DraftPlacement>) => onChange(placements.map((p) => (p.key === key ? { ...p, ...change } : p)))

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
          {placements.map((placement) => {
            const location = locationOf(placement.locationId)
            const multiplier = location?.multiplier ?? 1
            const before = saved(placement)
            // A new placement, or one moved to another location, gets its code when saved.
            const code = before && before.locationId === placement.locationId ? before.code : null
            return (
              <tr key={placement.key} className="border-b border-line-soft">
                <td className="py-2 pl-5 font-mono text-xs font-medium whitespace-nowrap">
                  {code ?? <span className="font-sans text-[12px] font-normal text-warn">à l'enregistrement</span>}
                </td>
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
                      onChange={(event) => set(placement.key, { locationId: event.target.value ? Number(event.target.value) : null })}
                    >
                      <option value="">Non affecté</option>
                      {locations
                        .filter(
                          (l) =>
                            l.id === placement.locationId ||
                            (l.archivedAt === null && !placements.some((other) => other.key !== placement.key && other.locationId === l.id)),
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
                        if (milli === undefined || milli === null) return toast.show({ kind: 'error', message: 'Quantité invalide.' })
                        if (milli !== placement.qtyMilli) set(placement.key, { qtyMilli: milli })
                      }}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right text-ink-2">× {multiplier}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{milliToText(placement.qtyMilli * multiplier)}</td>
                <td className="py-2 pr-5 text-right text-[13px]">
                  {!readOnly && placements.length > 1 && (
                    <button
                      type="button"
                      className="text-danger hover:underline"
                      onClick={() => onChange(placements.filter((p) => p.key !== placement.key))}
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
                .filter((l) => l.archivedAt === null && !placements.some((p) => p.locationId === l.id))
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
            onClick={() => {
              const milli = textToMilli(qty)
              if (milli === undefined || milli === null) return toast.show({ kind: 'error', message: 'Quantité invalide.' })
              const target = locationId ? Number(locationId) : null
              if (placements.some((p) => p.locationId === target))
                return toast.show({ kind: 'error', message: "L'article est déjà implanté dans cette localisation." })
              onChange([...placements, { key: `new${Date.now()}`, id: null, locationId: target, qtyMilli: milli, sortOrder: placements.length }])
              setQty('1')
              setLocationId('')
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
