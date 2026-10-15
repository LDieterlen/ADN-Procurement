// Choice of an article with its thumbnail (a native select cannot show images), made for long
// lists: a search box (code, name, reference, supplier, finish, dimensions; accents and case
// ignored), the match count, keyboard (↑ ↓ Entrée Échap), supplier and reference under each name.
// The list is drawn above the page (useFloatingPanel), so the card never cuts it.
import { useEffect, useRef, useState } from 'react'
import type { ProjectItemRead } from '../../api/queries/projectItem'
import { Thumb } from '../../components/Thumb'
import { useFloatingPanel } from '../../components/ui/useFloatingPanel'
import { fold } from '../../lib/text'

export function CandidatePicker({
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
  const panel = useFloatingPanel({ maxHeight: 380, minRoom: 260 })
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function toggle(button: HTMLElement) {
    setQuery('')
    setActive(0)
    panel.toggle(button)
  }
  function choose(c: ProjectItemRead) {
    onChange(String(c.id))
    panel.close()
  }

  const words = fold(query).split(/\s+/).filter(Boolean)
  const haystack = (c: ProjectItemRead) =>
    fold([c.itemCode, c.name, c.productName, c.reference, supplierName(c.supplierId), c.finish, c.dimensions].filter(Boolean).join(' '))
  const matches = words.length ? candidates.filter((c) => words.every((w) => haystack(c).includes(w))) : candidates
  const chosen = candidates.find((c) => String(c.id) === value)
  const line = (c: ProjectItemRead) => {
    const detail = [supplierName(c.supplierId), c.reference && `réf. ${c.reference}`, c.dimensions].filter(Boolean).join(' · ')
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <Thumb files={c.files} />
        <span className="min-w-0">
          <span className="block truncate">
            <span className="font-mono text-xs text-ink-2">{c.itemCode}</span> {c.name}
          </span>
          {detail && <span className="block truncate text-xs text-ink-3">{detail}</span>}
        </span>
      </span>
    )
  }
  return (
    <div ref={panel.root} className="relative" onKeyDown={(event) => event.key === 'Escape' && panel.close()}>
      <button
        type="button"
        aria-label={chosen ? `Article existant à rattacher : ${chosen.itemCode} ${chosen.name}` : 'Article existant à rattacher'}
        aria-expanded={panel.open}
        onClick={(event) => toggle(event.currentTarget)}
        className="control control-sm flex w-full items-center justify-between gap-2 text-left"
      >
        {/* The chosen article on one line with a small thumbnail: the field keeps its height. */}
        {chosen ? (
          <span className="flex min-w-0 items-center gap-2">
            <Thumb files={chosen.files} size="xs" />
            <span className="min-w-0 truncate">
              <span className="font-mono text-xs text-ink-2">{chosen.itemCode}</span> {chosen.name}
            </span>
          </span>
        ) : (
          <span className="text-ink-3">Choisir un article du projet…</span>
        )}
        <span aria-hidden="true" className="text-ink-3">
          ▾
        </span>
      </button>
      {panel.open && (
        <div style={panel.style} className="z-50 flex flex-col overflow-hidden rounded-lg border border-line-strong bg-surface text-[13px] shadow-lg">
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
              className="control control-sm min-w-0 flex-1"
            />
            <span className="shrink-0 text-xs text-ink-3 tabular-nums">
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
