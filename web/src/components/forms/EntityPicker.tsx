// Picks one entity id (or null) from a loaded list. Short lists: a native select. Long lists
// (FILTER_FROM and more): one search box that opens a filtered list — type, pick, done.
import { useEffect, useId, useRef, useState } from 'react'
import { fold } from '../../lib/text'
import { Button } from '../ui/Button'
import { useFloatingPanel } from '../ui/useFloatingPanel'
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export type PickerOption = { id: number; label: string; hint?: string }

const FILTER_FROM = 30
const MAX_SHOWN = 40

export function EntityPicker({
  name,
  label,
  options,
  emptyLabel = '—',
  required,
  hint,
  onCreate,
}: {
  name: string
  label: string
  options: PickerOption[]
  emptyLabel?: string
  required?: boolean
  hint?: string
  /** « + Nouveau » next to the control: the parent opens a creation modal and selects the created id (ADR-0012). */
  onCreate?: () => void
}) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  const value = field.value as number | null | undefined
  const createButton = onCreate && (
    <Button size="xs" onClick={onCreate} className="whitespace-nowrap" aria-label={`Nouveau : ${label.toLowerCase()}`}>
      + Nouveau
    </Button>
  )
  return (
    <Field name={name} label={label} hint={hint}>
      <div className="flex items-center gap-1">
        {options.length >= FILTER_FROM ? (
          <Combobox
            id={fieldId}
            options={options}
            value={value ?? null}
            required={required}
            invalid={Boolean(error)}
            onChange={(id) => field.onChange(id)}
            onBlur={field.onBlur}
          />
        ) : (
          <select
            id={fieldId}
            value={value ?? ''}
            aria-invalid={error ? true : undefined}
            className={`${controlClass} w-full min-w-0 flex-1`}
            onChange={(event) => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
            onBlur={field.onBlur}
          >
            {!required && <option value="">{emptyLabel}</option>}
            {required && value == null && <option value="">Choisir…</option>}
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
                {option.hint ? ` — ${option.hint}` : ''}
              </option>
            ))}
          </select>
        )}
        {createButton}
      </div>
    </Field>
  )
}

/** Search-as-you-type picker (ARIA combobox): the box shows the chosen name; typing filters the
 * list below; Enter or a click selects; Escape closes; emptying the box clears the choice. */
function Combobox({
  id,
  options,
  value,
  required,
  invalid,
  onChange,
  onBlur,
}: {
  id: string
  options: PickerOption[]
  value: number | null
  required?: boolean
  invalid: boolean
  onChange: (id: number | null) => void
  onBlur: () => void
}) {
  const selected = options.find((o) => o.id === value) ?? null
  const [query, setQuery] = useState(selected?.label ?? '')
  // The list is drawn above the page (useFloatingPanel): the form's card never cuts it.
  const panel = useFloatingPanel({ maxHeight: 256 })
  const open = panel.open
  const input = useRef<HTMLInputElement>(null)
  const setOpen = (value: boolean) => (value ? input.current && !open && panel.openFrom(input.current) : panel.close())
  const [active, setActive] = useState(0)
  const listId = useId()
  const root = panel.root

  // The chosen name follows the value when it changes from outside (reset, « + Nouveau », suggestion).
  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '')
  }, [selected, open])

  const needle = fold(query.trim())
  const matches = needle && query !== selected?.label ? options.filter((o) => fold(`${o.label} ${o.hint ?? ''}`).includes(needle)) : options
  const shown = matches.slice(0, MAX_SHOWN)

  function choose(option: PickerOption | null) {
    onChange(option?.id ?? null)
    setQuery(option?.label ?? '')
    setOpen(false)
  }

  function close() {
    setOpen(false)
    // Text that is not a choice goes back to the chosen name; an emptied box clears the choice.
    if (query.trim() === '') {
      if (selected) onChange(null)
    } else if (query !== selected?.label) setQuery(selected?.label ?? '')
    onBlur()
  }

  return (
    <div
      ref={root}
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) close()
      }}
    >
      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={query}
        placeholder={required ? 'Rechercher et choisir…' : 'Rechercher… (vide = aucun)'}
        className={`${controlClass} w-full min-w-0 pr-7`}
        onFocus={(event) => {
          setOpen(true)
          event.currentTarget.select()
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, shown.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            const option = shown[active]
            if (option) choose(option)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            close()
          }
        }}
      />
      {selected && !required && (
        <button
          type="button"
          aria-label="Effacer le choix"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-3 hover:text-ink"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(null)}
        >
          ×
        </button>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          style={panel.style}
          className="z-50 overflow-auto rounded-lg border border-line-strong bg-surface py-1 text-sm shadow-lg"
        >
          {shown.length === 0 && <li className="px-3 py-1.5 text-ink-3">Aucun résultat.</li>}
          {shown.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === value}
              className={`cursor-pointer px-3 py-1.5 ${index === active ? 'bg-sunken' : ''} ${option.id === value ? 'font-medium' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option.label}
              {option.hint && <span className="ml-1 text-xs text-ink-3">{option.hint}</span>}
            </li>
          ))}
          {matches.length > MAX_SHOWN && <li className="px-3 py-1.5 text-xs text-ink-3">… et {matches.length - MAX_SHOWN} autres : préciser la recherche.</li>}
        </ul>
      )}
    </div>
  )
}
