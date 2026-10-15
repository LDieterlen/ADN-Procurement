// Filter dropdown with several values: a button that reads like a select (« Toutes », the value,
// or « 3 sélectionnées ») opening a list of checkboxes, drawn above the page (useFloatingPanel) so
// a card never cuts it. Values no longer offered (an archived location) are ignored.
import { useId } from 'react'
import { useFloatingPanel } from '../ui/useFloatingPanel'

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
  const panel = useFloatingPanel({ maxHeight: 288 })
  const listId = useId()
  const chosen = value.filter((v) => options.some((o) => o.value === v))
  const summary =
    chosen.length === 0 ? all : chosen.length === 1 ? (options.find((o) => o.value === chosen[0])?.label ?? chosen[0]) : `${chosen.length} sélectionnées`
  return (
    <div ref={panel.root} className="relative" onKeyDown={(event) => event.key === 'Escape' && panel.close()}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={panel.open}
        aria-controls={listId}
        disabled={options.length === 0}
        onClick={(event) => panel.toggle(event.currentTarget)}
        className={`control control-sm flex w-full items-center justify-between gap-2 text-left ${chosen.length ? 'font-medium' : ''}`}
      >
        <span className="truncate">{options.length === 0 ? '—' : summary}</span>
        <span aria-hidden="true" className="text-ink-3">
          ▾
        </span>
      </button>
      {panel.open && (
        <div
          id={listId}
          role="group"
          aria-label={`${label} : choix`}
          style={panel.style}
          className="z-50 min-w-[200px] overflow-auto rounded-lg border border-line-strong bg-surface py-1 text-[13px] shadow-lg"
        >
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-sunken">
              <input
                type="checkbox"
                checked={chosen.includes(option.value)}
                onChange={(event) => onChange(event.target.checked ? [...chosen, option.value] : chosen.filter((v) => v !== option.value))}
              />
              {option.label}
            </label>
          ))}
          {chosen.length > 0 && (
            <button type="button" className="w-full border-t border-line-soft px-3 py-1.5 text-left text-ink-2 hover:bg-sunken" onClick={() => onChange([])}>
              {all}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
