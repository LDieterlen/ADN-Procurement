import { useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError } from './Field'

export type SelectOption = { value: string; label: string }

export function Select({ name, label, options, hint }: { name: string; label: string; options: SelectOption[]; hint?: string }) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  return (
    <Field name={name} label={label} hint={hint}>
      <select
        id={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${controlClass} bg-white`}
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
