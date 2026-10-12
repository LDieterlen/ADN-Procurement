// Pure manufacturer form (name, website, notes); shared by the edit page and the inline creation modal.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import type { ErrorDetail } from '../../api/errors'
import type { ManufacturerCreate, ManufacturerRead } from '../../api/queries/manufacturer'
import { Form } from '../../components/forms/Form'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'

export type ManufacturerFormValues = { name: string; website: string; notes: string }
const EMPTY: ManufacturerFormValues = { name: '', website: '', notes: '' }
const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())
export const toPayload = (v: ManufacturerFormValues): ManufacturerCreate => ({ name: v.name, website: orNull(v.website), notes: orNull(v.notes) })

export function ManufacturerForm({
  initial,
  onSubmit,
  submitting,
  banner,
  serverErrors,
}: {
  initial?: ManufacturerRead
  onSubmit: (values: ManufacturerFormValues) => void | Promise<void>
  submitting: boolean
  banner: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<ManufacturerFormValues>({
    defaultValues: initial ? { name: initial.name, website: initial.website ?? '', notes: initial.notes ?? '' } : EMPTY,
  })
  useEffect(() => {
    for (const detail of serverErrors)
      if (detail.field in EMPTY) form.setError(detail.field as Path<ManufacturerFormValues>, { type: 'server', message: detail.message })
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        <TextInput name="website" label="Site web" />
      </div>
      <div className="max-w-3xl">
        <TextArea name="notes" label="Notes internes" />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {initial ? 'Enregistrer' : 'Créer'}
      </Button>
    </Form>
  )
}
