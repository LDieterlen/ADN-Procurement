// Picks one entity id (or null) from a loaded list. Short lists: a native select. Long lists
// (FILTER_FROM and more): one search box that opens a filtered list — type, pick, done.
import { useEffect, useId, useRef, useState } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export type PickerOption = { id: number; label: string; hint?: string }

const FILTER_FROM = 30
const MAX_SHOWN = 40

const fold = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

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
    <button
      type="button"
      onClick={onCreate}
      className="whitespace-nowrap rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
      aria-label={`Nouveau : ${label.toLowerCase()}`}
    >
      + Nouveau
    </button>
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
            className={`${controlClass} w-full min-w-0 flex-1 bg-white`}
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
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const root = useRef<HTMLDivElement>(null)

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
        className={`${controlClass} w-full min-w-0 bg-white pr-7`}
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
          className="absolute top-1/2 right-2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800"
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
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-300 bg-white py-1 text-sm shadow-lg"
        >
          {shown.length === 0 && <li className="px-3 py-1.5 text-neutral-500">Aucun résultat.</li>}
          {shown.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === value}
              className={`cursor-pointer px-3 py-1.5 ${index === active ? 'bg-neutral-100' : ''} ${option.id === value ? 'font-medium' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option.label}
              {option.hint && <span className="ml-1 text-xs text-neutral-500">{option.hint}</span>}
            </li>
          ))}
          {matches.length > MAX_SHOWN && (
            <li className="px-3 py-1.5 text-xs text-neutral-500">… et {matches.length - MAX_SHOWN} autres : préciser la recherche.</li>
          )}
        </ul>
      )}
    </div>
  )
}
