// Filter dropdown with several values: a button that reads like a select (« Toutes », the value,
// or « 3 sélectionnées ») opening a list of checkboxes. Closes on outside click or Escape.
import { useEffect, useId, useRef, useState } from 'react'

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  all = 'Toutes',
}: {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  all?: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const summary =
    value.length === 0 ? all : value.length === 1 ? (options.find((o) => o.value === value[0])?.label ?? value[0]) : `${value.length} sélectionnées`
  return (
    <div ref={root} className="relative" onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        disabled={options.length === 0}
        onClick={() => setOpen((o) => !o)}
        className={`control flex h-8 w-full items-center justify-between gap-2 bg-white text-left text-[13px] disabled:text-ink-3 ${value.length ? 'font-medium' : ''}`}
      >
        <span className="truncate">{options.length === 0 ? '—' : summary}</span>
        <span aria-hidden="true" className="text-ink-3">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={listId}
          role="group"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-full min-w-[200px] overflow-auto rounded-lg border border-line-strong bg-white py-1 text-[13px] shadow-lg"
        >
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-sunken">
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={(event) => onChange(event.target.checked ? [...value, option.value] : value.filter((v) => v !== option.value))}
              />
              {option.label}
            </label>
          ))}
          {value.length > 0 && (
            <button type="button" className="w-full border-t border-line-soft px-3 py-1.5 text-left text-ink-2 hover:bg-sunken" onClick={() => onChange([])}>
              {all}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
