// Pure form for a client (create and edit). Field errors from the API (422) arrive through `serverErrors`.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import type { ClientCreate, ClientRead } from '../../api/queries/client'
import type { ErrorDetail } from '../../api/errors'
import { Form } from '../../components/forms/Form'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'

export type ClientFormValues = {
  name: string
  kind: ClientRead['kind']
  contactName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
  countryCode: string
  siren: string
  notes: string
}

const EMPTY: ClientFormValues = {
  name: '',
  kind: 'individual',
  contactName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  countryCode: 'FR',
  siren: '',
  notes: '',
}

export function fromClient(client: ClientRead): ClientFormValues {
  return {
    name: client.name,
    kind: client.kind,
    contactName: client.contactName ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    addressLine1: client.addressLine1 ?? '',
    addressLine2: client.addressLine2 ?? '',
    postalCode: client.postalCode ?? '',
    city: client.city ?? '',
    countryCode: client.countryCode,
    siren: client.siren ?? '',
    notes: client.notes ?? '',
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

/** Empty optional fields become null (explicit clearing on PATCH, API.md « Verbes »). */
export function toPayload(values: ClientFormValues): ClientCreate {
  return {
    name: values.name,
    kind: values.kind,
    contactName: orNull(values.contactName),
    email: orNull(values.email),
    phone: orNull(values.phone),
    addressLine1: orNull(values.addressLine1),
    addressLine2: orNull(values.addressLine2),
    postalCode: orNull(values.postalCode),
    city: orNull(values.city),
    countryCode: values.countryCode.trim().toUpperCase(),
    siren: orNull(values.siren),
    notes: orNull(values.notes),
  }
}

const KIND_OPTIONS = [
  { value: 'individual', label: 'Particulier' },
  { value: 'company', label: 'Société' },
]

export function ClientForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
  banner,
  serverErrors,
}: {
  initial?: ClientRead
  onSubmit: (values: ClientFormValues) => void | Promise<void>
  submitting: boolean
  submitLabel: string
  banner?: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<ClientFormValues>({ defaultValues: initial ? fromClient(initial) : EMPTY })

  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<ClientFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])

  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <Select name="kind" label="Type" options={KIND_OPTIONS} />
        <TextInput name="contactName" label="Contact" />
        <TextInput name="email" label="E-mail" type="email" />
        <TextInput name="phone" label="Téléphone" type="tel" />
        <TextInput name="siren" label="SIREN" hint="9 chiffres" inputMode="numeric" />
      </div>
      <fieldset className="max-w-3xl rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-600">Adresse</legend>
        <div className="grid grid-cols-2 gap-4">
          <TextInput name="addressLine1" label="Adresse" />
          <TextInput name="addressLine2" label="Complément" />
          <TextInput name="postalCode" label="Code postal" />
          <TextInput name="city" label="Ville" />
          <TextInput name="countryCode" label="Pays (code ISO)" hint="2 lettres, ex. FR" />
        </div>
      </fieldset>
      <div className="max-w-3xl">
        <TextArea name="notes" label="Notes internes" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </Form>
  )
}
