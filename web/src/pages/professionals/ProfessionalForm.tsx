// Pure professional form (ADR-0015): name, prestation, specialty, two contacts, website, notes.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { ProfessionalCreate, ProfessionalRead } from '../../api/queries/professional'
import { Form } from '../../components/forms/Form'
import { Select } from '../../components/forms/Select'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'

export type ProfessionalKind = ProfessionalRead['kind']
export const KIND_LABELS: Record<ProfessionalKind, string> = {
  manufacturer: 'Fabricant',
  distributor: 'Distributeur',
  publisher: 'Éditeur',
  artisan: 'Artisan',
}
const KINDS = (Object.keys(KIND_LABELS) as ProfessionalKind[]).map((value) => ({ value, label: KIND_LABELS[value] }))

export type ProfessionalFormValues = {
  name: string
  kind: ProfessionalKind
  specialty: string
  contactName: string
  phone: string
  mobile: string
  email: string
  contact2Name: string
  contact2Phone: string
  contact2Email: string
  website: string
  notes: string
}
const EMPTY: ProfessionalFormValues = {
  name: '',
  kind: 'manufacturer',
  specialty: '',
  contactName: '',
  phone: '',
  mobile: '',
  email: '',
  contact2Name: '',
  contact2Phone: '',
  contact2Email: '',
  website: '',
  notes: '',
}
const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function fromProfessional(p: ProfessionalRead): ProfessionalFormValues {
  return {
    name: p.name,
    kind: p.kind,
    specialty: p.specialty ?? '',
    contactName: p.contactName ?? '',
    phone: p.phone ?? '',
    mobile: p.mobile ?? '',
    email: p.email ?? '',
    contact2Name: p.contact2Name ?? '',
    contact2Phone: p.contact2Phone ?? '',
    contact2Email: p.contact2Email ?? '',
    website: p.website ?? '',
    notes: p.notes ?? '',
  }
}

export const toPayload = (v: ProfessionalFormValues): ProfessionalCreate => ({
  name: v.name,
  kind: v.kind,
  specialty: orNull(v.specialty),
  contactName: orNull(v.contactName),
  phone: orNull(v.phone),
  mobile: orNull(v.mobile),
  email: orNull(v.email),
  contact2Name: orNull(v.contact2Name),
  contact2Phone: orNull(v.contact2Phone),
  contact2Email: orNull(v.contact2Email),
  website: orNull(v.website),
  notes: orNull(v.notes),
})

export function ProfessionalForm({
  initial,
  onSubmit,
  submitting,
  banner,
  serverErrors,
}: {
  initial?: ProfessionalRead
  onSubmit: (values: ProfessionalFormValues) => void | Promise<void>
  submitting: boolean
  banner: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<ProfessionalFormValues>({ defaultValues: initial ? fromProfessional(initial) : EMPTY })
  useEffect(() => {
    for (const detail of serverErrors)
      if (detail.field in EMPTY) form.setError(detail.field as Path<ProfessionalFormValues>, { type: 'server', message: detail.message })
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <Select name="kind" label="Prestation" options={KINDS} />
        <TextInput name="specialty" label="Savoir-faire" />
        <TextInput name="website" label="Site web" />
      </div>
      <fieldset className="max-w-3xl space-y-3">
        <legend className="text-sm font-semibold">Contact 1</legend>
        <div className="grid grid-cols-2 gap-4">
          <TextInput name="contactName" label="Nom du contact" />
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
        <TextArea name="notes" label="Notes internes" />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {initial ? 'Enregistrer' : 'Créer'}
      </Button>
    </Form>
  )
}
