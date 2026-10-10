// Civil date `YYYY-MM-DD` or null (DATA_MODEL §3 `*_on`), through the native date input.
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError } from './Field'

export function DateField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })
  const error = useFieldError(name)
  return (
    <Field name={name} label={label} hint={hint}>
      <input
        id={name}
        type="date"
        value={(field.value as string | null | undefined) ?? ''}
        aria-invalid={error ? true : undefined}
        className={`${controlClass} w-44`}
        onChange={(event) => field.onChange(event.target.value === '' ? null : event.target.value)}
        onBlur={field.onBlur}
      />
    </Field>
  )
}
