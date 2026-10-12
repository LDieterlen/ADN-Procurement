// Picks one entity id (or null) from a loaded list, with a client-side filter when the list is long.
import { useState } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export type PickerOption = { id: number; label: string; hint?: string }

const FILTER_FROM = 30

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
  /** « + Nouveau » next to the select: the parent opens a creation modal and selects the created id (ADR-0012). */
  onCreate?: () => void
}) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })
  const [filter, setFilter] = useState('')
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  const value = field.value as number | null | undefined
  const needle = filter.trim().toLowerCase()
  const visible = needle ? options.filter((o) => o.label.toLowerCase().includes(needle) || o.id === value) : options
  return (
    <Field name={name} label={label} hint={hint}>
      <div className="flex flex-col gap-1">
        {options.length >= FILTER_FROM && (
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtrer…"
            aria-label={`Filtrer ${label.toLowerCase()}`}
            className={`${controlClass} text-xs`}
          />
        )}
        <div className="flex items-center gap-1">
          <select
            id={fieldId}
            value={value ?? ''}
            aria-invalid={error ? true : undefined}
            className={`${controlClass} bg-white`}
            onChange={(event) => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
            onBlur={field.onBlur}
          >
            {!required && <option value="">{emptyLabel}</option>}
            {required && value == null && <option value="">Choisir…</option>}
            {visible.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
                {option.hint ? ` — ${option.hint}` : ''}
              </option>
            ))}
          </select>
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="whitespace-nowrap rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
              aria-label={`Nouveau : ${label.toLowerCase()}`}
            >
              + Nouveau
            </button>
          )}
        </div>
      </div>
    </Field>
  )
}
