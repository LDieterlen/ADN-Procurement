// Pure project form: identity, client, addresses, VAT default, dates. Status lives outside the form.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { ProjectCreate, ProjectRead } from '../../api/queries/project'
import { BpField } from '../../components/forms/BpField'
import { DateField } from '../../components/forms/DateField'
import { EntityPicker, type PickerOption } from '../../components/forms/EntityPicker'
import { Form } from '../../components/forms/Form'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'

export type ProjectFormValues = {
  name: string
  code: string
  clientId: number | null
  siteAddress: string
  deliveryAddress: string
  deliveryContact: string
  defaultVatBp: number | null
  startOn: string | null
  dueOn: string | null
  notes: string
}

const EMPTY: ProjectFormValues = {
  name: '',
  code: '',
  clientId: null,
  siteAddress: '',
  deliveryAddress: '',
  deliveryContact: '',
  defaultVatBp: null,
  startOn: null,
  dueOn: null,
  notes: '',
}

export function fromProject(p: ProjectRead): ProjectFormValues {
  return {
    name: p.name,
    code: p.code,
    clientId: p.clientId,
    siteAddress: p.siteAddress ?? '',
    deliveryAddress: p.deliveryAddress ?? '',
    deliveryContact: p.deliveryContact ?? '',
    defaultVatBp: p.defaultVatBp,
    startOn: p.startOn,
    dueOn: p.dueOn,
    notes: p.notes ?? '',
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function toPayload(v: ProjectFormValues): ProjectCreate {
  return {
    name: v.name,
    code: orNull(v.code),
    clientId: v.clientId ?? 0,
    siteAddress: orNull(v.siteAddress),
    deliveryAddress: orNull(v.deliveryAddress),
    deliveryContact: orNull(v.deliveryContact),
    defaultVatBp: v.defaultVatBp,
    startOn: v.startOn,
    dueOn: v.dueOn,
    notes: orNull(v.notes),
  }
}

export function ProjectForm({
  initial,
  clients,
  onSubmit,
  submitting,
  submitLabel,
  banner,
  serverErrors,
}: {
  initial?: ProjectRead
  clients: PickerOption[]
  onSubmit: (values: ProjectFormValues) => void | Promise<void>
  submitting: boolean
  submitLabel: string
  banner?: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<ProjectFormValues>({ defaultValues: initial ? fromProject(initial) : EMPTY })
  useEffect(() => {
    for (const detail of serverErrors) {
      const field = detail.field === 'body' ? 'dueOn' : detail.field
      if (field in EMPTY) form.setError(field as Path<ProjectFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <TextInput name="code" label="Code" hint={initial ? 'Éditable' : 'Vide = généré (AAAA-NNN)'} />
        <EntityPicker name="clientId" label="Client" options={clients} required />
        <BpField name="defaultVatBp" label="TVA par défaut" hint="Vide = réglage général (20 %)" />
        <DateField name="startOn" label="Début" />
        <DateField name="dueOn" label="Échéance" />
      </div>
      <fieldset className="max-w-3xl rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-600">Adresses</legend>
        <div className="grid grid-cols-2 gap-4">
          <TextInput name="siteAddress" label="Chantier" />
          <TextInput name="deliveryAddress" label="Livraison" hint="Vide = chantier" />
          <TextInput name="deliveryContact" label="Contact livraison" />
        </div>
      </fieldset>
      <div className="max-w-3xl">
        <TextArea name="notes" label="Notes internes" />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
