import { useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export type SelectOption = { value: string; label: string }

export function Select({ name, label, options, hint }: { name: string; label: string; options: SelectOption[]; hint?: string }) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  return (
    <Field name={name} label={label} hint={hint}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`${controlClass} w-full min-w-0 bg-surface`}
        {...register(name)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
