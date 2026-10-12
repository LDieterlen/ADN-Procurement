// Pure project form (ADR-0013): name, client (creatable in place), budget at creation, code, due date, site, notes.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { ProjectCreate, ProjectRead, ProjectUpdate } from '../../api/queries/project'
import { DateField } from '../../components/forms/DateField'
import { EntityPicker, type PickerOption } from '../../components/forms/EntityPicker'
import { MoneyField } from '../../components/forms/MoneyField'
import { Form } from '../../components/forms/Form'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'

export type ProjectFormValues = {
  name: string
  code: string
  clientId: number | null
  siteAddress: string
  dueOn: string | null
  notes: string
  globalBudgetCents: number | null
}

const EMPTY: ProjectFormValues = { name: '', code: '', clientId: null, siteAddress: '', dueOn: null, notes: '', globalBudgetCents: null }

export function fromProject(p: ProjectRead): ProjectFormValues {
  return { name: p.name, code: p.code, clientId: p.clientId, siteAddress: p.siteAddress ?? '', dueOn: p.dueOn, notes: p.notes ?? '', globalBudgetCents: null }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function toPayload(v: ProjectFormValues): ProjectCreate {
  return {
    name: v.name,
    code: orNull(v.code),
    clientId: v.clientId ?? 0,
    siteAddress: orNull(v.siteAddress),
    dueOn: v.dueOn,
    notes: orNull(v.notes),
    globalBudgetCents: v.globalBudgetCents,
  }
}

/** The update route has no budget field: the envelope lives in the Budget page once created. */
export function toUpdatePayload(v: ProjectFormValues): ProjectUpdate {
  const { globalBudgetCents, ...rest } = toPayload(v)
  void globalBudgetCents
  return rest
}

export function ProjectForm({
  initial,
  clients,
  onCreateClient,
  onSubmit,
  submitting,
  submitLabel,
  banner,
  serverErrors,
  form: givenForm,
}: {
  initial?: ProjectRead
  clients: PickerOption[]
  onCreateClient?: () => void
  onSubmit: (values: ProjectFormValues) => void | Promise<void>
  submitting: boolean
  submitLabel: string
  banner?: string | null
  serverErrors: ErrorDetail[]
  form?: ReturnType<typeof useForm<ProjectFormValues>>
}) {
  const ownForm = useForm<ProjectFormValues>({ defaultValues: initial ? fromProject(initial) : EMPTY })
  const form = givenForm ?? ownForm
  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<ProjectFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <EntityPicker name="clientId" label="Client" options={clients} required onCreate={onCreateClient} />
        {!initial && <MoneyField name="globalBudgetCents" label="Budget global HT (€)" hint="Facultatif ; modifiable ensuite sur la page Budget" />}
        <DateField name="dueOn" label="Échéance" />
        <TextInput name="code" label="Code" hint={initial ? 'Éditable' : 'Vide = généré (AAAA-NNN)'} />
        <TextInput name="siteAddress" label="Adresse du chantier" />
        <div className="col-span-2">
          <TextArea name="notes" label="Notes" />
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitLabel}
      </Button>
    </Form>
  )
}
