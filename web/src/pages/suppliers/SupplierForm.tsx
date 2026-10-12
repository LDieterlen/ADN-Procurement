// Pure supplier form (ADR-0013, ADR-0015): name, specialty, two contacts, website, currency, usual discount, notes.
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
  specialty: string
  contactName: string
  email: string
  phone: string
  mobile: string
  contact2Name: string
  contact2Phone: string
  contact2Email: string
  website: string
  currency: string
  defaultDiscountBp: number | null
  notes: string
}

const EMPTY: SupplierFormValues = {
  name: '',
  specialty: '',
  contactName: '',
  email: '',
  phone: '',
  mobile: '',
  contact2Name: '',
  contact2Phone: '',
  contact2Email: '',
  website: '',
  currency: 'EUR',
  defaultDiscountBp: 0,
  notes: '',
}

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF', 'DKK', 'SEK', 'NOK'].map((c) => ({ value: c, label: c }))

export function fromSupplier(s: SupplierRead): SupplierFormValues {
  return {
    name: s.name,
    specialty: s.specialty ?? '',
    contactName: s.contactName ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    mobile: s.mobile ?? '',
    contact2Name: s.contact2Name ?? '',
    contact2Phone: s.contact2Phone ?? '',
    contact2Email: s.contact2Email ?? '',
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
    specialty: orNull(v.specialty),
    contactName: orNull(v.contactName),
    email: orNull(v.email),
    phone: orNull(v.phone),
    mobile: orNull(v.mobile),
    contact2Name: orNull(v.contact2Name),
    contact2Phone: orNull(v.contact2Phone),
    contact2Email: orNull(v.contact2Email),
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
        <TextInput name="specialty" label="Savoir-faire" />
        <TextInput name="website" label="Site web" />
        <Select name="currency" label="Devise" options={CURRENCIES} />
        <BpField name="defaultDiscountBp" label="Remise habituelle" hint="Copiée sur chaque article à l'affectation" />
      </div>
      <fieldset className="max-w-3xl space-y-3">
        <legend className="text-sm font-semibold">Représentant (imprimé sur les fiches)</legend>
        <div className="grid grid-cols-2 gap-4">
          <TextInput name="contactName" label="Représentant" />
          <TextInput name="email" label="E-mail" type="email" />
          <TextInput name="phone" label="Téléphone" type="tel" />
          <TextInput name="mobile" label="Portable" type="tel" />
        </div>
      </fieldset>
      <fieldset className="max-w-3xl space-y-3">
        <legend className="text-sm font-semibold">Contact 2</legend>
        <div className="grid grid-cols-2 gap-4">
          <TextInput name="contact2Name" label="Nom du contact 2" />
          <TextInput name="contact2Email" label="E-mail 2" type="email" />
          <TextInput name="contact2Phone" label="Téléphone 2" type="tel" />
        </div>
      </fieldset>
      <div className="max-w-3xl">
        <TextArea name="notes" label="Notes" rows={2} />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
