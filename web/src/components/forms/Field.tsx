// Label + control + error line. The error comes from react-hook-form (client rules or API 422 via setError).
import { createContext, useContext, type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

/** Per-form id prefix (set by `Form`) so two forms on the same page (a drawer and a modal) never share an input id. */
export const FieldIdContext = createContext('')

export function useFieldId(name: string): string {
  return useContext(FieldIdContext) + name
}

export function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext()
  const error = name
    .split('.')
    .reduce<unknown>((node, part) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[part] : undefined), formState.errors)
  const message = typeof error === 'object' && error !== null ? (error as { message?: unknown }).message : undefined
  return typeof message === 'string' ? message : undefined
}

export function Field({ name, label, hint, children }: { name: string; label: string; hint?: string; children: ReactNode }) {
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  )
}

export const controlClass =
  'rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-600 focus:outline-none aria-[invalid=true]:border-red-500'
