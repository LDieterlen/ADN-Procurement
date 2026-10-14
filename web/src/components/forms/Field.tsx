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
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-[12.5px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12.5px] text-ink-3">{hint}</p>
      )}
    </div>
  )
}

export const controlClass = 'control w-full min-w-0'
