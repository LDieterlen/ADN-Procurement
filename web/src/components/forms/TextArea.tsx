import { useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError } from './Field'

export function TextArea({ name, label, hint, rows = 3 }: { name: string; label: string; hint?: string; rows?: number }) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  return (
    <Field name={name} label={label} hint={hint}>
      <textarea
        id={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={controlClass}
        {...register(name)}
      />
    </Field>
  )
}
