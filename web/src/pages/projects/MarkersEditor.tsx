// « Mettre les repères » (ADR-0024): a full-screen window to put the numbered dots on the plan. The plan is shown as
// large as the screen allows, zoomed with the wheel or the buttons and moved by dragging; the dots keep their size on
// screen, so they are placed precisely once zoomed. Choose an article of the page, click on the plan to add its dot;
// drag a dot to move it; click a dot to select it, then « Supprimer le repère » or the Delete key. Changes go to the
// sheet's draft (saved by « Enregistrer » on the sheet page).
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { InstallationArticle } from '../../api/queries/installationSheet'
import { Button } from '../../components/ui/Button'
import { InstallationPhoto } from './InstallationPhoto'
import { PDF_INK, clampPermille, turn, unturn, usePlanFit, type Point } from './installationPlan'

type Cell = InstallationArticle | null
type View = { scale: number; x: number; y: number }
type Drag = { kind: 'pan'; startX: number; startY: number; view: View; moved: boolean } | { kind: 'dot'; placementId: number; index: number; moved: boolean }

const MAX_ZOOM = 12
const MOVE_THRESHOLD = 4 // px: below, a press is a click

export function MarkersEditor({
  planUrl,
  rotation,
  cells,
  perPage,
  colored,
  initialPlacementId,
  initialPage,
  onMarkersChange,
  onClose,
}: {
  planUrl: string
  rotation: number
  cells: Cell[]
  perPage: number
  colored: boolean
  initialPlacementId: number | null
  initialPage: number // shown when no article is given: the page of the preview
  onMarkersChange: (placementId: number, change: (markers: Point[]) => Point[]) => void
  onClose: () => void
}) {
  // The plan fitted in the viewport at zoom 1 (its turned shape, 16 px free all round), centred.
  const { boxRef: viewport, box, fitted, origin, onPlanLoad, quarter } = usePlanFit(rotation, 16)
  const base = fitted ?? { w: 0, h: 0 }
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const [selected, setSelected] = useState<number | null>(initialPlacementId)
  const [selectedDot, setSelectedDot] = useState<{ placementId: number; index: number } | null>(null)
  const [page, setPage] = useState(() => {
    const index = cells.findIndex((c) => c !== null && c.placementId === initialPlacementId)
    return index < 0 ? initialPage : Math.floor(index / perPage)
  })
  const done = useRef<HTMLButtonElement>(null)
  const drag = useRef<Drag | null>(null)
  const pageCount = Math.max(1, Math.ceil(cells.length / perPage))
  const pageCells = cells.slice(page * perPage, (page + 1) * perPage)
  const articles = pageCells.flatMap((c, i) => (c ? [{ article: c, number: i + 1 }] : []))
  const colorOf = (article: InstallationArticle) => (colored ? article.color : PDF_INK)

  useEffect(() => {
    done.current?.focus() // the window takes the keyboard (Échap, Suppr) at once
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedDot) {
        removeDot(selectedDot)
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** Another page: its own articles and dots; a dot of the page left is never deleted unseen. */
  function goTo(next: number) {
    setPage(next)
    setSelectedDot(null)
    setSelected(null)
  }

  /** Screen point (relative to the viewport) → thousandths of the turned plan, or null outside the plan. */
  function toPlan(px: number, py: number): Point | null {
    if (!base.w || !base.h) return null
    const u = (px - origin.x - view.x) / (base.w * view.scale)
    const v = (py - origin.y - view.y) / (base.h * view.scale)
    if (u < 0 || u > 1 || v < 0 || v > 1) return null
    return { x: clampPermille(u * 1000), y: clampPermille(v * 1000) }
  }

  function local(event: { clientX: number; clientY: number }) {
    const bounds = viewport.current?.getBoundingClientRect()
    return { x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) }
  }

  function zoomAt(factor: number, at: { x: number; y: number } | null = null) {
    setView((current) => {
      const scale = Math.max(1, Math.min(MAX_ZOOM, current.scale * factor))
      const center = at ?? { x: (box?.w ?? 0) / 2, y: (box?.h ?? 0) / 2 }
      // The point under the cursor stays under it.
      const ratio = scale / current.scale
      const ox = center.x - origin.x
      const oy = center.y - origin.y
      return scale === 1 ? { scale: 1, x: 0, y: 0 } : { scale, x: ox - (ox - current.x) * ratio, y: oy - (oy - current.y) * ratio }
    })
  }

  function removeDot(dot: { placementId: number; index: number }) {
    onMarkersChange(dot.placementId, (markers) => markers.filter((_, i) => i !== dot.index))
    setSelectedDot(null)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, view, moved: false }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current) return
    if (event.buttons === 0) {
      drag.current = null // the press ended elsewhere (window left, gesture cancelled)
      return
    }
    if (current.kind === 'pan') {
      const dx = event.clientX - current.startX
      const dy = event.clientY - current.startY
      if (!current.moved && Math.hypot(dx, dy) < MOVE_THRESHOLD) return
      current.moved = true
      if (current.view.scale > 1) setView({ ...current.view, x: current.view.x + dx, y: current.view.y + dy })
    } else {
      const at = local(event)
      const point = toPlan(at.x, at.y)
      if (!point) return
      current.moved = true
      onMarkersChange(current.placementId, (markers) => markers.map((m, i) => (i === current.index ? unturn(point, rotation) : m)))
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current
    drag.current = null
    if (!current || current.moved) return
    if (current.kind === 'dot') {
      setSelectedDot({ placementId: current.placementId, index: current.index })
      setSelected(current.placementId)
      return
    }
    // A click on the plan: a dot for the chosen article.
    setSelectedDot(null)
    const at = local(event)
    const point = toPlan(at.x, at.y)
    if (point && selected !== null && articles.some((a) => a.article.placementId === selected)) {
      const stored = unturn(point, rotation)
      onMarkersChange(selected, (markers) => [...markers, stored])
    }
  }

  const chosen = articles.find((a) => a.article.placementId === selected) ?? null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface" role="dialog" aria-modal="true" aria-label="Mettre les repères">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <h2 className="text-base font-semibold text-ink">Mettre les repères</h2>
        <span className="text-[13px] text-ink-3" role="status">
          {chosen
            ? `Cliquer sur le plan pour placer le repère ${chosen.number} (${chosen.article.code}) · glisser un repère pour le déplacer`
            : 'Choisir un article à gauche, puis cliquer sur le plan'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {selectedDot && (
            <Button size="sm" variant="danger" onClick={() => removeDot(selectedDot)}>
              Supprimer le repère
            </Button>
          )}
          <Button size="sm" variant="ghost" aria-label="Dézoomer" onClick={() => zoomAt(1 / 1.5)} disabled={view.scale <= 1}>
            −
          </Button>
          <span className="w-12 text-center text-[12.5px] text-ink-2 tabular-nums">{Math.round(view.scale * 100)} %</span>
          <Button size="sm" variant="ghost" aria-label="Zoomer" onClick={() => zoomAt(1.5)} disabled={view.scale >= MAX_ZOOM}>
            +
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setView({ scale: 1, x: 0, y: 0 })}>
            Ajuster
          </Button>
          <Button ref={done} variant="primary" onClick={onClose}>
            Terminé
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-line">
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[12.5px] text-ink-2">
              <Button size="sm" variant="ghost" aria-label="Page précédente" disabled={page === 0} onClick={() => goTo(page - 1)}>
                ←
              </Button>
              Page {page + 1} / {pageCount}
              <Button size="sm" variant="ghost" aria-label="Page suivante" disabled={page === pageCount - 1} onClick={() => goTo(page + 1)}>
                →
              </Button>
            </div>
          )}
          <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Articles de la page">
            {articles.map(({ article, number }) => {
              const active = article.placementId === selected
              return (
                <li key={article.placementId}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelected(active ? null : article.placementId)
                      setSelectedDot(null)
                    }}
                    className={`flex w-full items-center gap-2.5 border-b border-line-soft px-4 py-2 text-left text-sm ${active ? 'bg-accent-soft' : 'hover:bg-sunken'}`}
                  >
                    <span
                      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[11px] font-semibold text-white"
                      style={{ background: colorOf(article) }}
                    >
                      {number}
                    </span>
                    <InstallationPhoto article={article} className="h-8 w-8 shrink-0 rounded-[3px] border border-line" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        <span className="font-mono text-xs font-medium">{article.code}</span> {article.name}
                      </span>
                      <span className="block text-[12px] text-ink-3">
                        {article.markers.length === 0 ? 'Pas de repère' : `${article.markers.length} repère(s)`}
                      </span>
                    </span>
                  </button>
                  {active && article.markers.length > 0 && (
                    <div className="border-b border-line-soft bg-accent-soft px-4 pb-2 text-right">
                      <button
                        type="button"
                        className="text-[12.5px] text-danger hover:underline"
                        onClick={() => onMarkersChange(article.placementId, () => [])}
                      >
                        Retirer ses repères
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </aside>
        <div
          ref={viewport}
          className={`relative min-w-0 flex-1 touch-none overflow-hidden bg-sunken select-none ${chosen ? 'cursor-crosshair' : view.scale > 1 ? 'cursor-grab' : ''}`}
          aria-label="Plan à repérer"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          onLostPointerCapture={() => (drag.current = null)}
          onWheel={(event) => zoomAt(event.deltaY < 0 ? 1.15 : 1 / 1.15, local(event))}
        >
          {/* Loaded once, hidden, to read the plan's own size. */}
          <img src={planUrl} alt="" className="hidden" onLoad={onPlanLoad} />
          <div
            className="absolute bg-surface shadow-[0_2px_12px_rgba(0,0,0,.12)]"
            style={{
              left: origin.x,
              top: origin.y,
              width: base.w,
              height: base.h,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: '0 0',
            }}
          >
            <img
              src={planUrl}
              alt="Plan"
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
              style={{ width: quarter ? base.h : base.w, height: quarter ? base.w : base.h, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
            />
          </div>
          {/* The dots, outside the zoomed layer: the same size on screen at every zoom. */}
          {articles.flatMap(({ article, number }) =>
            article.markers.map((marker, index) => {
              const at = turn(marker, rotation)
              const left = origin.x + view.x + (at.x / 1000) * base.w * view.scale
              const top = origin.y + view.y + (at.y / 1000) * base.h * view.scale
              const isSelected = selectedDot?.placementId === article.placementId && selectedDot.index === index
              const dim = selected !== null && selected !== article.placementId
              return (
                <button
                  key={`${article.placementId}-${index}`}
                  type="button"
                  aria-label={`Repère ${number} (${article.code})`}
                  aria-pressed={isSelected}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    viewport.current?.setPointerCapture?.(event.pointerId)
                    drag.current = { kind: 'dot', placementId: article.placementId, index, moved: false }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault() // selected from the keyboard, then Suppr deletes it
                      setSelectedDot({ placementId: article.placementId, index })
                      setSelected(article.placementId)
                    }
                  }}
                  className={`absolute flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded-full border-2 px-1 text-[10.5px] font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,.3)] ${isSelected ? 'border-accent ring-2 ring-accent/40' : 'border-white'} ${dim ? 'opacity-50' : ''}`}
                  style={{ left, top, background: colorOf(article) }}
                >
                  {number}
                </button>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
