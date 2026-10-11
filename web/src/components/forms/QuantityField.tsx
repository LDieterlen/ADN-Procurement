// Quantity in thousandths (integer) shown as "12,5"; piece units stay whole (the API enforces it too).
import { useState } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Field, controlClass, useFieldError } from './Field'

export function milliToText(milli: number | null | undefined): string {
  if (milli === null || milli === undefined) return ''
  const whole = Math.trunc(milli / 1000)
  const rest = Math.abs(milli % 1000)
  if (rest === 0) return String(whole)
  return `${whole},${String(rest).padStart(3, '0').replace(/0+$/, '')}`
}

/** "12,5" → 12500 ; "" → null ; anything else → undefined (invalid). */
export function textToMilli(text: string): number | null | undefined {
  const cleaned = text.replace(/[\s ]/g, '').replace(',', '.')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return undefined
  const [whole = '0', fraction = ''] = cleaned.split('.')
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'))
}

export function QuantityField({ name, label, unit, hint, compact }: { name: string; label: string; unit?: string; hint?: string; compact?: boolean }) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })
  const [text, setText] = useState(() => milliToText(field.value as number | null | undefined))
  const [invalid, setInvalid] = useState(false)
  const error = useFieldError(name)
  const input = (
    <input
      id={name}
      inputMode="decimal"
      value={text}
      aria-label={compact ? label : undefined}
      aria-invalid={error || invalid ? true : undefined}
      className={`${controlClass} w-24 text-right`}
      onChange={(event) => {
        setText(event.target.value)
        const milli = textToMilli(event.target.value)
        setInvalid(milli === undefined)
        if (milli !== undefined) field.onChange(milli)
      }}
      onBlur={field.onBlur}
    />
  )
  if (compact) return input
  return (
    <Field name={name} label={label} hint={invalid ? 'Quantité attendue (ex. 12,5), trois décimales au plus.' : hint}>
      <div className="flex items-center gap-2">
        {input}
        {unit && <span className="text-sm text-neutral-500">{unit}</span>}
      </div>
    </Field>
  )
}
