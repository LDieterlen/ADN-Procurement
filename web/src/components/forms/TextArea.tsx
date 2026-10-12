import { useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export function TextArea({ name, label, hint, rows = 3 }: { name: string; label: string; hint?: string; rows?: number }) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  return (
    <Field name={name} label={label} hint={hint}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={controlClass}
        {...register(name)}
      />
    </Field>
  )
}
