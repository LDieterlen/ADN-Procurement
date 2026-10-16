// The article page (ADR-0013): photo and drawing, the spec sheet and budget, the status, the
// placements by location, the options, the journal. Every change is a draft until « Enregistrer »
// (next to « Retour au projet », and in a bar at the bottom while something is pending), saved in
// one transaction (`POST /project-items/{id}/save`, all or nothing); leaving with pending changes
// asks first (2026-10-15). The supplier can be created in place.
import { useEffect, useRef, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useProjectSummary } from '../../api/queries/budget'
import { useCategories } from '../../api/queries/category'
import { CLOSED_STATUSES, useLocations, useProject } from '../../api/queries/project'
import {
  ITEM_STATUS_LABELS,
  useDeleteItem,
  useItemEvents,
  useProjectItem,
  useProjectItems,
  useSaveItem,
  type ItemFileRead,
  type ItemSave,
  type ItemStatus,
  type ProjectItemRead,
  type ProjectItemUpdate,
} from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { Form } from '../../components/forms/Form'
import { centsToText } from '../../components/forms/MoneyField'
import { milliToText } from '../../components/forms/QuantityField'
import { Button, buttonClass } from '../../components/ui/Button'
import { Card, Dot, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pill } from '../../components/ui/Pill'
import { useToast } from '../../components/ui/Toast'
import { UnsavedChanges, useUnsavedGuard } from '../../components/ui/UnsavedChanges'
import { NewSupplierModal } from './InlineCreate'
import { ItemFiles } from './ItemFiles'
import { ItemHistory } from './ItemHistory'
import { OptionsCard } from './OptionsCard'
import { PlacementsCard, type DraftPlacement } from './PlacementsCard'
import { fromItem, ItemFields, toUpdatePayload, type ItemFormValues } from './ItemForm'
import { StatusSelect } from './StatusSelect'

const ALL = { q: '', includeArchived: true, limit: 1000, offset: 0 } // every supplier, archived ones too: names of existing articles

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

/** Only the fields typed on the page go to the server (an archived supplier left untouched never
 * blocks saving a comment). The rate goes with the currency, the designation with the name. */
function changedFields(full: ProjectItemUpdate, dirty: string[]): ProjectItemUpdate {
  const wanted = new Set(dirty.map((key) => (key === 'fxRate' ? 'fxRateMicro' : key)))
  if (wanted.has('currency')) wanted.add('fxRateMicro')
  if (wanted.has('name') || wanted.has('productName')) ['name', 'productName'].forEach((key) => wanted.add(key))
  return Object.fromEntries(Object.entries(full).filter(([key]) => wanted.has(key))) as ProjectItemUpdate
}

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
  const [version, setVersion] = useState(0) // bumped when the page reloads the article: resets the typed quantities

  // The draft is compared with the article it started from, never with a newer copy of it: a
  // refetch (the article became an option elsewhere, lost its placements…) must not make the old
  // draft look like a change and send stale placements.
  const [startedFrom, setStartedFrom] = useState<ProjectItemRead | null>(item.data ?? null)
  const original = startedFrom ? draftOf(startedFrom) : null
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
      setStartedFrom(item.data)
      setVersion((v) => v + 1)
    }
  }, [item.data, form])
  useEffect(() => {
    for (const detail of serverErrors) {
      const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
      if (item.data && field in fromItem(item.data)) form.setError(field as Path<ItemFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form, item.data])
  const readOnly = project.data ? CLOSED_STATUSES.includes(project.data.status) : false
  const blocker = useUnsavedGuard(dirty && !readOnly, leaving)

  // An article that does not load (deleted, wrong address, API stopped) says so, never « Chargement… » forever.
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
  if (project.isPending || item.isPending || draft === null) return <p className="text-sm text-ink-3">Chargement…</p>
  const p = project.data
  const it = item.data
  const d = draft
  const amounts = summary.data?.lines.find((l) => l.projectItemId === it.id)
  const supplier = suppliers.data?.items.find((s) => s.id === it.supplierId)
  const typeName = categories.data?.find((c) => c.id === it.categoryId)?.name ?? ''
  const all = projectItems.data ?? []
  const base = it.optionOfId !== null ? all.find((i) => i.id === it.optionOfId) : undefined
  const itemOptions = all.filter((i) => i.optionOfId === it.id)
  // An article never presented in a diffusion can be deleted; a diffused one is cancelled (ADR-0022).
  const deletable = !readOnly && itemOptions.length === 0 && !it.diffused
  // Always from the latest draft: an upload finishing later never undoes the changes made meanwhile.
  const patch = (change: Partial<Draft>) => setDraft((prev) => (prev ? { ...prev, ...change } : prev))

  /** Saves everything pending; true when saved. */
  async function saveAll(): Promise<boolean> {
    setServerErrors([])
    setBanner(null)
    let saved = false
    await form.handleSubmit(async (values) => {
      const data: ItemSave = { attachOptions: d.attach }
      if (form.formState.isDirty) data.sheet = changedFields(toUpdatePayload(values, it), Object.keys(form.formState.dirtyFields))
      // Against the article the draft started from, not a later read (another tab's change kept).
      if (d.status.status !== (original?.status.status ?? it.status)) data.status = d.status
      // An option or a fee has no placement of its own: never sent.
      if (it.kind === 'product' && it.optionOfId === null && !sameJson(d.placements, original?.placements))
        data.placements = d.placements.map((pl) => ({ id: pl.id, locationId: pl.locationId, qtyMilli: pl.qtyMilli, sortOrder: pl.sortOrder }))
      if (!sameJson(d.files, original?.files))
        data.files = d.files.map((f, index) => ({ fileId: f.fileId, kind: f.kind, isPrimary: f.isPrimary, caption: f.caption, sortOrder: index }))
      if (d.optionAction) data.optionAction = d.optionAction
      try {
        const result = await save.mutateAsync({ id: it.id, data })
        form.reset(fromItem(result))
        setDraft(draftOf(result))
        setStartedFrom(result)
        setVersion((v) => v + 1)
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
    setStartedFrom(it)
    setVersion((v) => v + 1)
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
            {d.status.status !== (original?.status.status ?? it.status) && <span className="text-xs text-warn">à enregistrer</span>}
            {amounts && (
              <>
                <Dot />
                <span className="tabular-nums">
                  {milliToText(amounts.totalQtyMilli)} × {centsToText(amounts.netUnitEurCents)} € ={' '}
                  <strong className="font-semibold text-ink">{centsToText(amounts.totalHtCents)} € HT</strong>
                </span>
              </>
            )}
            {it.diffused && (
              <>
                <Dot />
                <span>Diffusé</span>
              </>
            )}
          </>
        }
        actions={
          <>
            <Link to={`/projects/${p.id}`} className={buttonClass('ghost')}>
              Retour au projet
            </Link>
            {saveButton}
          </>
        }
      />
      <div className="grid grid-cols-[340px_1fr] items-start gap-6">
        <div className="space-y-4">
          <Card title="Photo et plan" padding="form">
            <ItemFiles files={d.files} onChange={(update) => setDraft((prev) => (prev ? { ...prev, files: update(prev.files) } : prev))} readOnly={readOnly} />
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
              {/* A closed project is read only: the fields are shown, never editable. */}
              <fieldset disabled={readOnly} className="contents">
                <ItemFields
                  form={form}
                  kind={it.kind}
                  categories={(categories.data ?? [])
                    .filter((c) => (it.optionOfId === null && !it.diffused) || c.id === it.categoryId) // an option, or a diffused article (frozen code), keeps its type
                    .map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
                  suppliers={options(suppliers.data?.items.filter((s) => s.archivedAt === null || s.id === it.supplierId))}
                  onCreateSupplier={readOnly ? undefined : () => setModal('supplier')}
                />
              </fieldset>
            </Card>
          </Form>
          {it.kind === 'product' && it.optionOfId === null && (
            <PlacementsCard
              item={it}
              placements={d.placements}
              version={version}
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
            <ItemHistory events={events.data ?? []} />
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
      <NewSupplierModal
        open={modal === 'supplier'}
        onClose={() => setModal(null)}
        onCreated={(id) => {
          setModal(null)
          form.setValue('supplierId', id, { shouldDirty: true })
          toast.show({ kind: 'success', message: 'Fournisseur créé.' })
        }}
      />
      <UnsavedChanges guarded={dirty && !readOnly} blocker={blocker} saveButton={saveButton} onDiscard={discard} onSave={saveAll}>
        Les modifications de cet article ne sont pas enregistrées.
      </UnsavedChanges>
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
        {p.diffusionCount === 0
          ? 'Avant la première diffusion, tout article se supprime ; ses codes sont libérés et les suivants remontent.'
          : 'Cet article n’a encore figuré dans aucune diffusion : il se supprime ; son code reste libre pour le prochain article.'}
      </ConfirmDialog>
    </section>
  )
}
