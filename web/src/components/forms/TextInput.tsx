import { useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export function TextInput({
  name,
  label,
  type = 'text',
  hint,
  placeholder,
  autoFocus,
  inputMode,
}: {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel'
  hint?: string
  placeholder?: string
  autoFocus?: boolean
  inputMode?: 'text' | 'numeric' | 'email' | 'tel'
}) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  return (
    <Field name={name} label={label} hint={hint}>
      <input
        id={fieldId}
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`${controlClass} w-full min-w-0`}
        {...register(name)}
      />
    </Field>
  )
}
