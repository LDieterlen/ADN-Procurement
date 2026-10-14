// Amount in cents (integer or null) shown as "1 250,00"; the text never becomes a float in the API.
import { useEffect, useState } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError, useFieldId } from './Field'

export function centsToText(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${whole},${String(abs % 100).padStart(2, '0')}`
}

/** "1 250,5" → 125050 ; "" → null ; anything else → undefined (invalid). */
export function textToCents(text: string): number | null | undefined {
  const cleaned = text.replace(/[\s ]/g, '').replace(',', '.')
  if (cleaned === '') return null
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return undefined
  const negative = cleaned.startsWith('-')
  const [whole = '0', fraction = ''] = cleaned.replace('-', '').split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return negative ? -cents : cents
}

export function MoneyField({ name, label, currency, hint }: { name: string; label: string; currency?: string; hint?: string }) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })
  const [text, setText] = useState(() => centsToText(field.value as number | null | undefined))
  const [invalid, setInvalid] = useState(false)
  const error = useFieldError(name)
  const fieldId = useFieldId(name)
  // The value can change from outside (form.reset once the article is loaded, « Utiliser » of a
  // capture): the text follows it, except while the user is typing something not yet valid.
  const value = field.value as number | null | undefined
  useEffect(() => {
    if (!invalid && textToCents(text) !== (value ?? null)) setText(centsToText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <Field name={name} label={label} hint={invalid ? 'Montant attendu, deux décimales au plus (ex. 1 250,00).' : hint}>
      <div className="flex items-center gap-2">
        <input
          id={fieldId}
          inputMode="decimal"
          value={text}
          aria-invalid={error || invalid ? true : undefined}
          className={`${controlClass} w-36 text-right`}
          onChange={(event) => {
            setText(event.target.value)
            const cents = textToCents(event.target.value)
            setInvalid(cents === undefined)
            if (cents !== undefined) field.onChange(cents)
          }}
          onBlur={() => {
            const cents = textToCents(text)
            if (cents !== undefined) setText(centsToText(cents))
            field.onBlur()
          }}
        />
        {currency && <span className="text-sm text-ink-3">{currency}</span>}
      </div>
    </Field>
  )
}
