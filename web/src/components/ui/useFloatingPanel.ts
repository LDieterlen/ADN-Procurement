// A list or panel opened from a field and drawn above the page (`position: fixed`), so a card that
// clips its content (`overflow-hidden`, rounded corners) never cuts it. Placed under the field, or
// above when the window lacks room; never taller than the room left; it follows its field when the
// page scrolls or resizes, and closes on a click outside or once the field has left the window (the
// caller handles Escape). Shared by every drop-down of the app.
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type PanelBox = { left: number; width: number; maxHeight: number; top?: number; bottom?: number }

export function useFloatingPanel<T extends HTMLElement = HTMLDivElement>({ maxHeight = 320, minRoom = 240 } = {}) {
  const [box, setBox] = useState<PanelBox | null>(null)
  const root = useRef<T>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const open = box !== null

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (!(event.target instanceof Node && root.current?.contains(event.target))) setBox(null)
    }
    // The page scrolls (also when the browser brings a focused field into view): the panel follows
    // its field, and closes once the field has left the window.
    const follow = (event: Event) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return
      const field = anchor.current
      if (!field) return setBox(null)
      const rect = field.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) setBox(null)
      else openFrom(field)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open])

  function openFrom(field: HTMLElement) {
    anchor.current = field
    const rect = field.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    const down = below >= minRoom || below >= rect.top
    const room = (down ? below : rect.top) - 12
    setBox({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(maxHeight, room)),
      ...(down ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
    })
  }

  const style: CSSProperties | undefined = box
    ? { position: 'fixed', left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.maxHeight }
    : undefined

  return {
    root,
    open,
    style,
    openFrom,
    close: () => setBox(null),
    toggle: (anchor: HTMLElement) => (open ? setBox(null) : openFrom(anchor)),
  }
}
