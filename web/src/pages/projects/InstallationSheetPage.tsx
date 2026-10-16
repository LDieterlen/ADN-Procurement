// One installation sheet (ADR-0024), laid out like the article page: crumbs and « Retour au projet », the settings
// (name, plan and its orientation, position of the articles, articles per page, colours by type), the articles in their
// cells (↑ ↓, empty cells, Retirer, added from the room, « Repères ») and the preview of its A3 pages. Everything is a draft saved at once (« Enregistrer », also in the bottom bar with
// « Annuler les modifications »), with a warning when leaving with pending changes.
import { useEffect, useRef, useState } from 'react'
import { Checkbox } from '../../components/forms/Checkbox'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { Form } from '../../components/forms/Form'
import { Select } from '../../components/forms/Select'
import { TextInput } from '../../components/forms/TextInput'
import { fileContentUrl } from '../../api/queries/file'
import { useInstallationPlans } from '../../api/queries/installationPlan'
import {
  ARRANGEMENT_OPTIONS,
  PER_PAGE_OPTIONS,
  ROTATION_OPTIONS,
  sheetPdfUrl,
  useDeleteInstallationSheet,
  useInstallationSheet,
  useSetInstallationSheetItems,
  useUpdateInstallationSheet,
  type Arrangement,
  type InstallationArticle,
  type InstallationLayout,
  type InstallationSheetDetail,
  type PerPage,
  type Rotation,
} from '../../api/queries/installationSheet'
import { CLOSED_STATUSES, useLocations, useProject } from '../../api/queries/project'
import { Button, buttonClass, linkButtonClass } from '../../components/ui/Button'
import { Card, Dot, PageHeader } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { UnsavedChanges, useUnsavedGuard } from '../../components/ui/UnsavedChanges'
import { MarkersEditor } from './MarkersEditor'
import { InstallationPhoto } from './InstallationPhoto'
import { PDF_INK, turn, usePlanFit, type Point } from './installationPlan'

// The sheet's settings are a form (fields of `components/forms`), its ordered articles a draft list; both are saved
// together by « Enregistrer ».
type Values = {
  name: string
  planId: string
  perPage: '8' | '12' | '16'
  arrangement: Arrangement
  planRotation: '0' | '90' | '180' | '270'
  colorByType: boolean
}
const FIELDS: (keyof Values)[] = ['name', 'planId', 'perPage', 'arrangement', 'planRotation', 'colorByType']
/** A cell of the sheet: an article, or null for a cell left empty on purpose (to face its spot on the plan). */
type Cell = InstallationArticle | null

function valuesOf(sheet: InstallationSheetDetail): Values {
  return {
    name: sheet.name,
    planId: sheet.planId === null ? '' : String(sheet.planId),
    perPage: String(sheet.perPage) as Values['perPage'],
    arrangement: sheet.arrangement,
    planRotation: String(sheet.planRotation) as Values['planRotation'],
    colorByType: sheet.colorByType,
  }
}

/** A cell and its dots; the empty cells at the end are dropped by the API: they never count as a change. */
function cellKey(cells: Cell[]): string {
  return cells
    .map((c) => (c ? `${c.placementId}:${c.markers.map((m) => `${m.x}/${m.y}`).join(';')}` : ''))
    .join(',')
    .replace(/,+$/, '')
}
const sameOrder = (a: Cell[], b: Cell[]) => cellKey(a) === cellKey(b)

// How the list reads on the page, for each arrangement (`ffe.installation.layout`).
const READING_ORDER: Record<Arrangement, string> = {
  ring: 'n° 1 en haut à gauche, puis sens horaire',
  sides: 'colonne de gauche de haut en bas, puis celle de droite',
  ends: 'rangée du haut de gauche à droite, puis celle du bas',
  right: 'à droite du plan, ligne par ligne',
}

type PlanDot = { key: string; number: number; color: string; at: Point }

/** The plan turned clockwise, as large as its box allows, with its numbered dots (placed in « Mettre les repères »). */
function PlanWithDots({ src, rotation, dots }: { src: string; rotation: number; dots: PlanDot[] }) {
  const { boxRef, fitted, origin, onPlanLoad, quarter } = usePlanFit(rotation)
  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      {/* Loaded once, hidden, to read the plan's own size. */}
      <img src={src} alt="" className="hidden" onLoad={onPlanLoad} />
      {fitted && (
        <div className="absolute" style={{ left: origin.x, top: origin.y, width: fitted.w, height: fitted.h }}>
          <img
            src={src}
            alt="Plan"
            className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
            style={{
              width: quarter ? fitted.h : fitted.w,
              height: quarter ? fitted.w : fitted.h,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
          />
          {dots.map((dot) => {
            const at = turn(dot.at, rotation)
            return (
              <span
                key={dot.key}
                aria-label={`Repère ${dot.number}`}
                className="absolute flex h-[12px] min-w-[12px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 px-[2px] text-[7.5px] leading-none font-semibold text-white opacity-90"
                style={{ left: `${at.x / 10}%`, top: `${at.y / 10}%`, background: dot.color }}
              >
                {dot.number}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** One A3 landscape page as printed: the grid of the PDF (column widths and row heights in proportion), the plan
 * in its block with the dots of the page's articles, the cards in the other cells; an empty cell asked for is outlined. */
function PagePreview({
  cells,
  layout,
  planUrl,
  rotation,
  offset,
  colored,
}: {
  cells: Cell[]
  layout: InstallationLayout
  planUrl: string | null
  rotation: number
  offset: number
  colored: boolean
}) {
  const { plan } = layout
  const colorOf = (article: InstallationArticle) => (colored ? article.color : PDF_INK)
  const dots: PlanDot[] = cells.flatMap((article, i) =>
    article
      ? article.markers.map((at, m) => ({
          key: `${article.placementId}-${m}`,
          number: i + 1,
          color: colorOf(article),
          at,
        }))
      : [],
  )
  return (
    <div
      className="grid aspect-[1.414] w-full gap-1 rounded-[6px] border border-line bg-surface p-2"
      style={{
        gridTemplateColumns: layout.colWidths.map((w) => `${w}fr`).join(' '),
        gridTemplateRows: layout.rowHeights.map((h) => `${h}fr`).join(' '),
      }}
      aria-label={`Aperçu de la page ${offset / layout.perPage + 1}`}
    >
      <div
        className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-[3px] border border-ink bg-surface"
        style={{ gridRow: `${plan.row + 1} / span ${plan.rows}`, gridColumn: `${plan.col + 1} / span ${plan.cols}` }}
      >
        {planUrl ? <PlanWithDots src={planUrl} rotation={rotation} dots={dots} /> : <span className="text-[12px] text-ink-3">Aucun plan choisi</span>}
      </div>
      {layout.slots.map((slot, i) => {
        const article = cells[i]
        const asked = i < cells.length
        return (
          <div
            key={`${slot.row}-${slot.col}`}
            className="flex min-h-0 min-w-0 flex-col items-center justify-center"
            style={{ gridRow: slot.row + 1, gridColumn: slot.col + 1 }}
          >
            {asked && article === null && (
              <div className="flex h-full max-h-[110px] w-full max-w-[120px] items-center justify-center rounded-[3px] border border-dashed border-line-strong text-[9.5px] text-ink-3">
                {i + 1} · vide
              </div>
            )}
            {article && (
              <div
                className="relative flex h-full max-h-[110px] w-full max-w-[120px] min-w-0 flex-col overflow-hidden rounded-[3px] border border-line bg-surface"
                style={colored ? { borderLeft: `3px solid ${article.color}` } : undefined}
              >
                <span
                  className="absolute top-1 left-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-1 text-[8.5px] font-semibold text-white"
                  style={{ background: colorOf(article) }}
                >
                  {i + 1}
                </span>
                <InstallationPhoto article={article} className="min-h-0 w-full flex-1" />
                <div className="truncate border-t border-line px-1 py-0.5 font-mono text-[9.5px] text-ink">{article.code}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function InstallationSheetPage() {
  const params = useParams<{ id: string; sheetId: string }>()
  const projectId = Number(params.id)
  const sheetId = Number(params.sheetId)
  const project = useProject(projectId)
  const sheet = useInstallationSheet(sheetId)
  const plans = useInstallationPlans(projectId)
  const locations = useLocations(projectId, true)
  const update = useUpdateInstallationSheet(projectId)
  const setItems = useSetInstallationSheetItems(projectId)
  const remove = useDeleteInstallationSheet(projectId)
  const navigate = useNavigate()
  const toast = useToast()
  const form = useForm<Values>({ defaultValues: { name: '', planId: '', perPage: '12', arrangement: 'ring', planRotation: '0', colorByType: false } })
  const [items, setDraftItems] = useState<Cell[] | null>(null)
  const [startedFrom, setStartedFrom] = useState<InstallationSheetDetail | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  // « Mettre les repères » open, on this article if one was chosen.
  const [editor, setEditor] = useState<{ placementId: number | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const leaving = useRef(false)
  const watched = useWatch({ control: form.control })
  const dirty = startedFrom !== null && items !== null && (form.formState.isDirty || !sameOrder(items, startedFrom.items))

  // The draft starts from the sheet as read; a later read (after a save, or a refetch) replaces it only when nothing is
  // pending, so a refetch never undoes the changes in progress.
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  useEffect(() => {
    if (sheet.data && !dirtyRef.current) {
      form.reset(valuesOf(sheet.data))
      setDraftItems(sheet.data.items)
      setStartedFrom(sheet.data)
    }
  }, [sheet.data, form])
  const readOnly = project.data ? CLOSED_STATUSES.includes(project.data.status) : false
  const blocker = useUnsavedGuard(dirty && !readOnly, leaving)

  if (project.isError || sheet.isError) {
    const message = project.isError ? project.error.message : sheet.isError ? sheet.error.message : ''
    return (
      <EmptyState title={message}>
        <Link to={`/projects/${projectId}?vue=installation`} className="underline">
          Retour au projet
        </Link>
      </EmptyState>
    )
  }
  if (project.isPending || sheet.isPending || items === null || startedFrom === null) return <p className="text-sm text-ink-3">Chargement…</p>
  const p = project.data
  const s = startedFrom
  const backTo = `/projects/${p.id}?vue=installation`
  const perPage = Number(watched.perPage ?? s.perPage)
  const arrangement = watched.arrangement ?? s.arrangement
  const rotation = Number(watched.planRotation ?? s.planRotation)
  const colored = watched.colorByType ?? s.colorByType
  const planId = watched.planId ? Number(watched.planId) : null
  const room = locations.data?.find((l) => l.id === s.locationId)
  const plan = plans.data?.find((pl) => pl.id === planId)
  const savedCells = s.items.filter((c): c is InstallationArticle => c !== null)
  const saved = new Set(savedCells.map((a) => a.placementId))
  const onSheet = new Set(items.filter((c): c is InstallationArticle => c !== null).map((a) => a.placementId))
  // The room's articles not in the draft: those taken off since the last save come back here too.
  const pool = [...s.candidates, ...savedCells].filter((a) => !onSheet.has(a.placementId) && !a.outOfRoom)
  pool.sort((a, b) => Number(a.otherSheets.length > 0) - Number(b.otherSheets.length > 0) || a.code.localeCompare(b.code))
  const unplaced = pool.filter((a) => a.otherSheets.length === 0)
  const removed = savedCells.filter((a) => !onSheet.has(a.placementId)).length
  const articleCount = onSheet.size
  const pageCount = Math.max(1, Math.ceil(items.length / perPage))
  const shownPage = Math.min(page, pageCount - 1)
  // The grid of the chosen arrangement and page size (laid out by the API, `ffe.installation.layout`).
  const shown = items.slice(shownPage * perPage, (shownPage + 1) * perPage)
  const legend = [...new Map(shown.filter((c): c is InstallationArticle => c !== null).map((c) => [c.typeName ?? 'Sans type', c.color])).entries()]
  const layout = s.layouts.find((l) => l.perPage === perPage && l.arrangement === arrangement) ?? s.layouts[0]!

  function move(index: number, by: -1 | 1) {
    const next = [...items!]
    const target = index + by
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setDraftItems(next)
  }

  function setMarkers(placementId: number, change: (markers: Point[]) => Point[]) {
    setDraftItems((prev) => prev && prev.map((c) => (c && c.placementId === placementId ? { ...c, markers: change(c.markers) } : c)))
  }

  /** Back to the sheet as last read (a refetch kept aside while editing), never an older copy. */
  function discard() {
    const latest = sheet.data ?? s
    form.reset(valuesOf(latest))
    setDraftItems(latest.items)
    setStartedFrom(latest)
    setBanner(null)
  }

  /** Saves everything pending; true when saved. */
  async function saveAll(): Promise<boolean> {
    setBanner(null)
    let ok = false
    await form.handleSubmit(async (values) => {
      // The settings, then the cells: two calls, so a refusal of the second keeps the first.
      let settingsSaved: InstallationSheetDetail | null = null
      try {
        let result: InstallationSheetDetail | null = null
        if (form.formState.isDirty) {
          result = settingsSaved = await update.mutateAsync({
            id: sheetId,
            name: values.name,
            planId: values.planId ? Number(values.planId) : null,
            perPage: Number(values.perPage) as PerPage,
            colorByType: values.colorByType,
            arrangement: values.arrangement,
            planRotation: Number(values.planRotation) as Rotation,
          })
        }
        if (!sameOrder(items!, s.items))
          result = await setItems.mutateAsync({ id: sheetId, cells: items!.map((c) => (c ? { placementId: c.placementId, markers: c.markers } : null)) })
        if (result) {
          form.reset(valuesOf(result))
          setDraftItems(result.items)
          setStartedFrom(result)
        }
        toast.show({ kind: 'success', message: 'Planche enregistrée.' })
        ok = true
      } catch (error) {
        if (!isApiError(error)) throw error
        if (settingsSaved) {
          form.reset(valuesOf(settingsSaved))
          setStartedFrom(settingsSaved)
        }
        for (const detail of error.details) {
          if ((FIELDS as string[]).includes(detail.field)) form.setError(detail.field as keyof Values, { type: 'server', message: detail.message })
        }
        setBanner(error.details[0]?.message ?? error.message)
        const reason = error.details[0]?.message ?? error.message
        toast.show({
          kind: 'error',
          message: settingsSaved ? `Réglages enregistrés, articles et repères non enregistrés : ${reason}` : `Rien n'a été enregistré : ${reason}`,
          persistent: true,
        })
      }
    })()
    return ok
  }

  const saving = update.isPending || setItems.isPending
  const saveButton = !readOnly && (
    <Button variant="primary" disabled={!dirty || saving} onClick={() => void saveAll()}>
      {saving ? 'Enregistrement…' : 'Enregistrer'}
    </Button>
  )
  return (
    <section className={dirty ? 'pb-20' : ''}>
      <PageHeader
        title={s.name}
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
            <Link to={backTo} className="hover:underline">
              Installation
            </Link>
          </>
        }
        subtitle={
          <>
            <span>{room ? `${room.code} — ${room.name}` : ''}</span>
            <Dot />
            <span>{plan ? `Plan ${plan.name}` : 'Sans plan'}</span>
            <Dot />
            <span>
              {articleCount} article(s) · {pageCount} page(s) A3
            </span>
          </>
        }
        actions={
          <>
            <Link to={backTo} className={buttonClass('ghost')}>
              Retour au projet
            </Link>
            {dirty ? (
              <Button disabled title="Enregistrer d’abord : le PDF reprend la planche enregistrée">
                PDF A3
              </Button>
            ) : (
              <>
                <a href={sheetPdfUrl(sheetId)} download className={linkButtonClass}>
                  PDF A3
                </a>
                <a href={sheetPdfUrl(sheetId, true)} download className={linkButtonClass} title="Papier blanc, pour l’imprimante">
                  PDF à imprimer
                </a>
              </>
            )}
            {saveButton}
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-6">
        <div className="space-y-4">
          <Form form={form} onSubmit={() => void saveAll()} banner={banner}>
            <Card title="Planche" label="Réglages de la planche" padding="form">
              {/* A closed project is read only: the fields are shown, never editable. */}
              <fieldset disabled={readOnly} className="contents">
                <div className="space-y-4">
                  <TextInput name="name" label="Nom" placeholder="Coin TV" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      name="planId"
                      label="Plan"
                      options={[{ value: '', label: 'Sans plan' }, ...(plans.data ?? []).map((pl) => ({ value: String(pl.id), label: pl.name }))]}
                    />
                    <Select name="planRotation" label="Orientation du plan" options={ROTATION_OPTIONS} />
                    <Select name="arrangement" label="Position des articles" options={ARRANGEMENT_OPTIONS} />
                    <Select name="perPage" label="Articles par page" options={PER_PAGE_OPTIONS} />
                  </div>
                  <Checkbox
                    className="text-[13px] text-ink-2"
                    label="Couleurs par type (repères et cartes, légende sur la page)"
                    {...form.register('colorByType')}
                  />
                </div>
              </fieldset>
            </Card>
          </Form>
          <Card
            title="Ordre des articles"
            meta={removed > 0 ? <span className="text-warn">{removed} retiré(s), à enregistrer</span> : READING_ORDER[arrangement]}
            padding="table"
            actions={
              !readOnly && (
                <Button size="sm" onClick={() => setDraftItems([...items, null])}>
                  + Case vide
                </Button>
              )
            }
          >
            {items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-3">
                Aucun article : les ajouter depuis la pièce, ci-dessous. « + Case vide » laisse une case libre pour placer un article en face de sa place sur le
                plan.
              </p>
            ) : (
              <table className="w-full text-sm" aria-label="Articles de la planche">
                <tbody>
                  {items.map((article, index) => {
                    const added = article !== null && !saved.has(article.placementId)
                    const label = article?.code ?? `la case vide n° ${index + 1}`
                    return [
                      index > 0 && index % perPage === 0 && (
                        <tr key={`page-${index}`}>
                          <td colSpan={3} className="bg-sunken px-5 py-1 text-[11.5px] font-medium tracking-wide text-ink-3 uppercase">
                            Page {index / perPage + 1}
                          </td>
                        </tr>
                      ),
                      <tr key={article ? article.placementId : `empty-${index}`} className={`border-b border-line-soft ${added ? 'bg-warn-soft/40' : ''}`}>
                        <td className="w-14 py-2 pl-5">
                          <div className="flex items-center gap-2">
                            {/* Its number on the page: the one of its dots on the plan. */}
                            <span
                              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] font-semibold ${article ? 'text-white' : ''}`}
                              style={article ? { background: colored ? article.color : PDF_INK } : undefined}
                            >
                              {(index % perPage) + 1}
                            </span>
                            {article ? (
                              <InstallationPhoto article={article} className="h-9 w-9 shrink-0 rounded-[3px] border border-line" />
                            ) : (
                              <div className="h-9 w-9 shrink-0 rounded-[3px] border border-dashed border-line-strong" aria-hidden="true" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {article ? (
                            <>
                              <Link to={`/projects/${p.id}/items/${article.itemId}`} className="font-mono text-xs font-medium hover:underline">
                                {article.code}
                              </Link>{' '}
                              <span className="font-medium">{article.name}</span>
                              <div className="truncate text-[12px] text-ink-3">
                                {added && <span className="mr-2 text-warn">à enregistrer</span>}
                                <span className="mr-2">{article.markers.length === 0 ? 'Pas de repère' : `${article.markers.length} repère(s)`}</span>
                                {article.outOfRoom && <span className="mr-2 text-danger">A changé de pièce</span>}
                                {article.otherSheets.length > 0 && `Aussi sur : ${article.otherSheets.join(', ')}`}
                              </div>
                            </>
                          ) : (
                            <span className="text-ink-3">Case vide</span>
                          )}
                        </td>
                        <td className="py-2 pr-5 pl-3 text-right whitespace-nowrap">
                          {!readOnly && (
                            <>
                              {article && plan && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Repères de ${article.code}`}
                                  onClick={() => setEditor({ placementId: article.placementId })}
                                >
                                  Repères
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" aria-label={`Monter ${label}`} disabled={index === 0} onClick={() => move(index, -1)}>
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Descendre ${label}`}
                                disabled={index === items.length - 1}
                                onClick={() => move(index, 1)}
                              >
                                ↓
                              </Button>
                              <button
                                type="button"
                                className="ml-2 text-[13px] text-danger hover:underline"
                                aria-label={`Retirer ${label}`}
                                onClick={() => setDraftItems(items.filter((_, i) => i !== index))}
                              >
                                Retirer
                              </button>
                            </>
                          )}
                        </td>
                      </tr>,
                    ]
                  })}
                </tbody>
              </table>
            )}
          </Card>
          {!readOnly && (
            <Card
              title="Articles de la pièce"
              meta={`${unplaced.length} sur aucune planche`}
              padding="table"
              actions={
                unplaced.length > 0 && (
                  <Button size="sm" onClick={() => setDraftItems([...items, ...unplaced])}>
                    + Ajouter les {unplaced.length} absents des planches
                  </Button>
                )
              }
            >
              {pool.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-3">Tous les articles de la pièce sont sur cette planche.</p>
              ) : (
                <table className="w-full text-sm" aria-label="Articles de la pièce à ajouter">
                  <tbody>
                    {pool.map((article) => (
                      <tr key={article.placementId} className="border-b border-line-soft last:border-b-0">
                        <td className="w-14 py-2 pl-5">
                          <InstallationPhoto article={article} className="h-9 w-9 rounded-[3px] border border-line" />
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-medium">{article.code}</span> <span className="font-medium">{article.name}</span>
                          <div className="truncate text-[12px] text-ink-3">
                            {article.otherSheets.length > 0 ? `Déjà sur : ${article.otherSheets.join(', ')}` : 'Sur aucune planche'}
                          </div>
                        </td>
                        <td className="py-2 pr-5 pl-3 text-right">
                          <Button size="sm" aria-label={`Ajouter ${article.code}`} onClick={() => setDraftItems([...items, article])}>
                            Ajouter
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
          {!readOnly && (
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer la planche
              </Button>
            </div>
          )}
        </div>
        <div className="sticky top-4">
          <Card
            title="Aperçu A3"
            label="Aperçu de la planche"
            actions={
              pageCount > 1 && (
                <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
                  <Button size="sm" variant="ghost" aria-label="Page précédente" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)}>
                    ←
                  </Button>
                  Page {shownPage + 1} / {pageCount}
                  <Button size="sm" variant="ghost" aria-label="Page suivante" disabled={shownPage === pageCount - 1} onClick={() => setPage(shownPage + 1)}>
                    →
                  </Button>
                </div>
              )
            }
          >
            <PagePreview
              cells={shown}
              layout={layout}
              planUrl={plan ? fileContentUrl(plan.fileId) : null}
              rotation={rotation}
              offset={shownPage * perPage}
              colored={colored}
            />
            {plan && !readOnly && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-ink-3">Les repères indiquent la place de chaque article sur le plan, avec le numéro de sa carte.</span>
                <Button onClick={() => setEditor({ placementId: null })}>Mettre les repères</Button>
              </div>
            )}
            {colored && legend.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2" aria-label="Légende des couleurs">
                {legend.map(([name, color]) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      {editor && plan && (
        <MarkersEditor
          planUrl={fileContentUrl(plan.fileId)}
          rotation={rotation}
          cells={items}
          perPage={perPage}
          colored={colored}
          initialPlacementId={editor.placementId}
          initialPage={shownPage}
          onMarkersChange={setMarkers}
          onClose={() => setEditor(null)}
        />
      )}
      <UnsavedChanges guarded={dirty && !readOnly} blocker={blocker} saveButton={saveButton} onDiscard={discard} onSave={saveAll}>
        Les modifications de cette planche ne sont pas enregistrées.
      </UnsavedChanges>
      <ConfirmDialog
        open={confirmDelete}
        title={`Supprimer la planche « ${s.name} » ?`}
        actions={[
          {
            label: 'Supprimer',
            variant: 'danger',
            onClick: () => {
              leaving.current = true
              remove.mutate(sheetId, {
                onSuccess: () => void navigate(backTo),
                onError: (error) => {
                  leaving.current = false
                  setConfirmDelete(false)
                  toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
                },
              })
            },
          },
          { label: 'Garder', onClick: () => setConfirmDelete(false) },
        ]}
      >
        Les articles restent dans le projet ; seule la planche disparaît.
      </ConfirmDialog>
    </section>
  )
}
