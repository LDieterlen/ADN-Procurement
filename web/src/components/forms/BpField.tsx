// Basis points (10 000 = 100 %) shown and typed as a percentage with up to two decimals.
// Form value stays an integer (or null when empty); the text the user types never becomes a float in the API.
import { useEffect, useState } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export function bpToText(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return ''
  const whole = Math.trunc(bp / 100)
  const cents = Math.abs(bp % 100)
  return cents === 0 ? String(whole) : `${whole},${String(cents).padStart(2, '0').replace(/0$/, '')}`
}

/** "12,5" → 1250 ; "" → null ; anything else → undefined (invalid). */
export function textToBp(text: string): number | null | undefined {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined
  const [whole = '0', fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function BpField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })
  const [text, setText] = useState(() => bpToText(field.value as number | null | undefined))
  const [invalid, setInvalid] = useState(false)
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  // The value can change from outside (form.reset once the article is loaded): the text follows it,
  // except while the user is typing something not yet valid.
  const value = field.value as number | null | undefined
  useEffect(() => {
    if (!invalid && textToBp(text) !== (value ?? null)) setText(bpToText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <Field name={name} label={label} hint={invalid ? 'Pourcentage attendu, deux décimales au plus (ex. 12,5).' : hint}>
      <div className="flex items-center gap-2">
        <input
          id={fieldId}
          inputMode="decimal"
          value={text}
          aria-invalid={error || invalid ? true : undefined}
          className={`${controlClass} w-28 text-right`}
          onChange={(event) => {
            setText(event.target.value)
            const bp = textToBp(event.target.value)
            setInvalid(bp === undefined)
            if (bp !== undefined) field.onChange(bp)
          }}
          onBlur={field.onBlur}
        />
        <span className="text-sm text-ink-3">%</span>
      </div>
    </Field>
  )
}
