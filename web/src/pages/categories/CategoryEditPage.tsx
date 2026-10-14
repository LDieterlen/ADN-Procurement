// Create a product type (code + name) or edit its name and order; the code is immutable.
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import type { ErrorDetail } from '../../api/errors'
import { useCategory, useCreateCategory, useUpdateCategory, type CategoryRead } from '../../api/queries/category'
import { Form } from '../../components/forms/Form'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'

type Values = { name: string; code: string; sortOrder: string }

function CategoryForm({
  initial,
  onSubmit,
  submitting,
  banner,
  serverErrors,
}: {
  initial?: CategoryRead
  onSubmit: (values: Values) => void | Promise<void>
  submitting: boolean
  banner: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<Values>({
    defaultValues: initial ? { name: initial.name, code: initial.code, sortOrder: String(initial.sortOrder) } : { name: '', code: '', sortOrder: '0' },
  })
  useEffect(() => {
    for (const detail of serverErrors) {
      if (['name', 'code', 'sortOrder'].includes(detail.field)) form.setError(detail.field as Path<Values>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid max-w-xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        {initial ? (
          <TextInput name="code" label="Code" hint="Immuable : les codes FF&E en dépendent" />
        ) : (
          <TextInput name="code" label="Code" hint="2 à 4 lettres majuscules, ex. LUD" />
        )}
        <TextInput name="sortOrder" label="Ordre" inputMode="numeric" hint="Tri dans les listes" />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {initial ? 'Enregistrer' : 'Créer'}
      </Button>
    </Form>
  )
}

export function CategoryEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useCategory(id)
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const errors = useSubmitErrors('type de produit')

  async function submit(values: Values) {
    errors.reset()
    const sortOrder = Number.parseInt(values.sortOrder, 10)
    if (Number.isNaN(sortOrder)) {
      errors.setBanner('Ordre : un entier est attendu.')
      return
    }
    try {
      if (id === undefined) {
        await create.mutateAsync({ name: values.name, sortOrder, code: values.code })
        errors.toast.show({ kind: 'success', message: 'Type créé.' })
      } else {
        await update.mutateAsync({ id, data: { name: values.name, sortOrder } })
        errors.toast.show({ kind: 'success', message: 'Type enregistré.' })
      }
      navigate('/categories')
    } catch (error) {
      errors.handle(error, { resubmitForced: () => undefined, openExisting: () => undefined, restore: () => undefined })
    }
  }

  if (id !== undefined && existing.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
  if (id !== undefined && existing.isError) {
    return (
      <EmptyState title={existing.error.message}>
        <Link to="/categories" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const category = existing.data

  return (
    <section>
      <PageHeader
        title={category ? category.name : 'Nouveau type de produit'}
        crumbs={
          <Link to="/categories" className="hover:underline">
            Types de produit
          </Link>
        }
        actions={
          <Link to="/categories">
            <Button variant="ghost">Retour</Button>
          </Link>
        }
      />
      <Card>
        {category?.archivedAt ? (
          <p className="text-sm text-ink-2">Type archivé : le restaurer depuis la liste pour le modifier.</p>
        ) : (
          <CategoryForm
            key={category?.updatedAt ?? 'new'}
            initial={category}
            onSubmit={submit}
            submitting={create.isPending || update.isPending}
            banner={errors.banner}
            serverErrors={errors.serverErrors}
          />
        )}
      </Card>
    </section>
  )
}
