// Pure supplier form: name first, collapsible « Identité légale » block, currency and discount defaults.
import { useEffect, useState } from 'react'
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
  legalName: string
  countryCode: string
  siren: string
  siret: string
  vatNumber: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
  contactName: string
  email: string
  phone: string
  website: string
  currency: string
  defaultDiscountBp: number | null
  paymentTerms: string
  notes: string
}

const EMPTY: SupplierFormValues = {
  name: '',
  legalName: '',
  countryCode: 'FR',
  siren: '',
  siret: '',
  vatNumber: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  currency: 'EUR',
  defaultDiscountBp: 0,
  paymentTerms: '',
  notes: '',
}

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF', 'DKK', 'SEK', 'NOK'].map((c) => ({ value: c, label: c }))

export function fromSupplier(s: SupplierRead): SupplierFormValues {
  return {
    name: s.name,
    legalName: s.legalName ?? '',
    countryCode: s.countryCode,
    siren: s.siren ?? '',
    siret: s.siret ?? '',
    vatNumber: s.vatNumber ?? '',
    addressLine1: s.addressLine1 ?? '',
    addressLine2: s.addressLine2 ?? '',
    postalCode: s.postalCode ?? '',
    city: s.city ?? '',
    contactName: s.contactName ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    website: s.website ?? '',
    currency: s.currency,
    defaultDiscountBp: s.defaultDiscountBp,
    paymentTerms: s.paymentTerms ?? '',
    notes: s.notes ?? '',
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function toPayload(v: SupplierFormValues): SupplierCreate {
  return {
    name: v.name,
    legalName: orNull(v.legalName),
    countryCode: v.countryCode.trim().toUpperCase(),
    siren: orNull(v.siren),
    siret: orNull(v.siret),
    vatNumber: orNull(v.vatNumber),
    addressLine1: orNull(v.addressLine1),
    addressLine2: orNull(v.addressLine2),
    postalCode: orNull(v.postalCode),
    city: orNull(v.city),
    contactName: orNull(v.contactName),
    email: orNull(v.email),
    phone: orNull(v.phone),
    website: orNull(v.website),
    currency: v.currency,
    defaultDiscountBp: v.defaultDiscountBp ?? 0,
    paymentTerms: orNull(v.paymentTerms),
    notes: orNull(v.notes),
  }
}

const LEGAL_FIELDS = ['legalName', 'countryCode', 'siren', 'siret', 'vatNumber', 'addressLine1', 'addressLine2', 'postalCode', 'city']

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
  const [legalOpen, setLegalOpen] = useState(() =>
    initial ? LEGAL_FIELDS.some((f) => (fromSupplier(initial) as Record<string, unknown>)[f] && f !== 'countryCode') : false,
  )

  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<SupplierFormValues>, { type: 'server', message: detail.message })
      if (LEGAL_FIELDS.includes(detail.field)) setLegalOpen(true)
    }
  }, [serverErrors, form])

  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <TextInput name="contactName" label="Contact" />
        <TextInput name="email" label="E-mail" type="email" />
        <TextInput name="phone" label="Téléphone" type="tel" />
        <TextInput name="website" label="Site web" />
        <Select name="currency" label="Devise de facturation" options={CURRENCIES} />
        <BpField name="defaultDiscountBp" label="Remise habituelle" hint="Copiée sur chaque ligne à l'affectation" />
        <TextInput name="paymentTerms" label="Conditions de paiement" placeholder="30 % à la commande, solde avant livraison" />
      </div>
      <div className="max-w-3xl rounded border border-neutral-200">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-neutral-700"
          onClick={() => setLegalOpen((o) => !o)}
          aria-expanded={legalOpen}
        >
          Identité légale
          <span aria-hidden="true">{legalOpen ? '▾' : '▸'}</span>
        </button>
        {legalOpen && (
          <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 p-4">
            <TextInput name="legalName" label="Raison sociale" />
            <TextInput name="countryCode" label="Pays (code ISO)" hint="2 lettres, ex. FR" />
            <TextInput name="siren" label="SIREN" hint="9 chiffres" inputMode="numeric" />
            <TextInput name="siret" label="SIRET" hint="14 chiffres, commence par le SIREN" inputMode="numeric" />
            <TextInput name="vatNumber" label="N° de TVA" placeholder="FR12345678901" />
            <TextInput name="addressLine1" label="Adresse" />
            <TextInput name="addressLine2" label="Complément" />
            <TextInput name="postalCode" label="Code postal" />
            <TextInput name="city" label="Ville" />
          </div>
        )}
      </div>
      <div className="max-w-3xl">
        <TextArea name="notes" label="Notes internes" />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
