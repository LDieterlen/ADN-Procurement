// Pure supplier form (ADR-0013): name, contact, e-mail, phone, website, currency, usual discount, notes.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { SupplierCreate, SupplierRead } from '../../api/queries/supplier'
import { BpField } from '../../components/forms/BpField'
import { Form } from '../../components/forms/Form'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'

export type SupplierFormValues = {
  name: string
  contactName: string
  email: string
  phone: string
  website: string
  currency: string
  defaultDiscountBp: number | null
  notes: string
}

const EMPTY: SupplierFormValues = { name: '', contactName: '', email: '', phone: '', website: '', currency: 'EUR', defaultDiscountBp: 0, notes: '' }

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF', 'DKK', 'SEK', 'NOK'].map((c) => ({ value: c, label: c }))

export function fromSupplier(s: SupplierRead): SupplierFormValues {
  return {
    name: s.name,
    contactName: s.contactName ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    website: s.website ?? '',
    currency: s.currency,
    defaultDiscountBp: s.defaultDiscountBp,
    notes: s.notes ?? '',
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function toPayload(v: SupplierFormValues): SupplierCreate {
  return {
    name: v.name,
    contactName: orNull(v.contactName),
    email: orNull(v.email),
    phone: orNull(v.phone),
    website: orNull(v.website),
    currency: v.currency,
    defaultDiscountBp: v.defaultDiscountBp ?? 0,
    notes: orNull(v.notes),
  }
}

export function SupplierForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
  banner,
  serverErrors,
}: {
  initial?: SupplierRead
  onSubmit: (values: SupplierFormValues) => void | Promise<void>
  submitting: boolean
  submitLabel: string
  banner?: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<SupplierFormValues>({ defaultValues: initial ? fromSupplier(initial) : EMPTY })

  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<SupplierFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])

  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <TextInput name="contactName" label="Représentant" />
        <TextInput name="email" label="E-mail" type="email" />
        <TextInput name="phone" label="Téléphone" type="tel" />
        <TextInput name="website" label="Site web" />
        <Select name="currency" label="Devise" options={CURRENCIES} />
        <BpField name="defaultDiscountBp" label="Remise habituelle" hint="Copiée sur chaque article à l'affectation" />
        <div className="col-span-2">
          <TextArea name="notes" label="Notes" rows={2} />
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
