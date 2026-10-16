import { useEffect, useRef, useState, type SyntheticEvent } from 'react'

// Geometry of the plan on an installation sheet (ADR-0024): the dots are kept in thousandths of the plan as stored,
// before any rotation (`ffe.installation.turn`), so they never move when the plan is turned.
export type Point = { x: number; y: number }

/** A point of the plan as stored → on the plan turned clockwise (thousandths). */
export function turn({ x, y }: Point, rotation: number): Point {
  if (rotation === 90) return { x: 1000 - y, y: x }
  if (rotation === 180) return { x: 1000 - x, y: 1000 - y }
  if (rotation === 270) return { x: y, y: 1000 - x }
  return { x, y }
}

/** The way back: a point on the turned plan → the plan as stored. */
export function unturn({ x, y }: Point, rotation: number): Point {
  if (rotation === 90) return { x: y, y: 1000 - x }
  if (rotation === 180) return { x: 1000 - x, y: 1000 - y }
  if (rotation === 270) return { x: 1000 - y, y: x }
  return { x, y }
}

/** Width and height of the plan once turned (a quarter turn swaps them). */
export function turnedSize(natural: { w: number; h: number }, rotation: number): { w: number; h: number } {
  return rotation === 90 || rotation === 270 ? { w: natural.h, h: natural.w } : natural
}

export const clampPermille = (value: number) => Math.max(0, Math.min(1000, Math.round(value)))

/** The ink of the dots and numbers when the sheet is not in colour: the PDF's ink, not a screen token. */
export const PDF_INK = '#1c1a17'

/** The plan fitted in a measured box (`inset` px kept free all round), turned: the box's ref, the fitted size and its
 * offset in the box, and the handler that reads the plan's own size once loaded. */
export function usePlanFit(rotation: number, inset = 0) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const measure = () => setBox({ w: element.clientWidth, h: element.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const turned = natural ? turnedSize(natural, rotation) : null
  const scale = box && turned ? Math.min((box.w - 2 * inset) / turned.w, (box.h - 2 * inset) / turned.h) : 0
  const fitted = turned && scale > 0 ? { w: turned.w * scale, h: turned.h * scale } : null
  const origin = box && fitted ? { x: (box.w - fitted.w) / 2, y: (box.h - fitted.h) / 2 } : { x: 0, y: 0 }
  const onPlanLoad = (event: SyntheticEvent<HTMLImageElement>) => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
  return { boxRef, box, fitted, origin, onPlanLoad, quarter: rotation === 90 || rotation === 270 }
}
