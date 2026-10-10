// Create a level-1 category (code) or a child (?parent=ID); edit name and order only (D6a.9).
import { useEffect } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import type { ErrorDetail } from '../../api/errors'
import { useCategories, useCategory, useCreateCategory, useUpdateCategory, type CategoryRead } from '../../api/queries/category'
import { Form } from '../../components/forms/Form'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSubmitErrors } from '../common/useSubmitErrors'

type Values = { name: string; code: string; sortOrder: string }

function CategoryForm({
  initial,
  parent,
  onSubmit,
  submitting,
  banner,
  serverErrors,
}: {
  initial?: CategoryRead
  parent?: CategoryRead
  onSubmit: (values: Values) => void | Promise<void>
  submitting: boolean
  banner: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<Values>({
    defaultValues: initial ? { name: initial.name, code: initial.code ?? '', sortOrder: String(initial.sortOrder) } : { name: '', code: '', sortOrder: '0' },
  })
  useEffect(() => {
    for (const detail of serverErrors) {
      const field = detail.field === 'parentId' ? 'name' : detail.field
      if (['name', 'code', 'sortOrder'].includes(field)) form.setError(field as Path<Values>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])
  const level1 = !parent && !initial?.parentId
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      {parent && (
        <p className="text-sm text-neutral-600">
          Sous-catégorie de <strong>{parent.name}</strong> ({parent.code})
        </p>
      )}
      <div className="grid max-w-xl grid-cols-2 gap-4">
        <TextInput name="name" label="Nom" autoFocus />
        {level1 &&
          (initial ? (
            <TextInput name="code" label="Code" hint="Immuable : les codes articles en dépendent" />
          ) : (
            <TextInput name="code" label="Code" hint="2 à 4 lettres majuscules, ex. LUM" />
          ))}
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
  const [search] = useSearchParams()
  const id = params.id ? Number(params.id) : undefined
  const parentId = search.get('parent') ? Number(search.get('parent')) : undefined
  const navigate = useNavigate()
  const existing = useCategory(id)
  const all = useCategories(true)
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const errors = useSubmitErrors('catégorie')
  const parent = all.data?.find((c) => c.id === parentId)

  async function submit(values: Values) {
    errors.reset()
    const sortOrder = Number.parseInt(values.sortOrder, 10)
    if (Number.isNaN(sortOrder)) {
      errors.setBanner('Ordre : un entier est attendu.')
      return
    }
    try {
      if (id === undefined) {
        await create.mutateAsync({ name: values.name, sortOrder, parentId: parentId ?? null, code: parentId ? null : values.code || null })
        errors.toast.show({ kind: 'success', message: 'Catégorie créée.' })
      } else {
        await update.mutateAsync({ id, data: { name: values.name, sortOrder } })
        errors.toast.show({ kind: 'success', message: 'Catégorie enregistrée.' })
      }
      navigate('/categories')
    } catch (error) {
      errors.handle(error, { resubmitForced: () => undefined, openExisting: () => undefined, restore: () => undefined })
    }
  }

  if (id !== undefined && existing.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category ? category.name : parent ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'}</h1>
        <Link to="/categories">
          <Button variant="ghost">Retour</Button>
        </Link>
      </div>
      {category?.archivedAt ? (
        <p className="text-sm text-neutral-600">Catégorie archivée : la restaurer depuis la liste pour la modifier.</p>
      ) : (
        <CategoryForm
          key={category?.updatedAt ?? `new-${parentId ?? 'root'}`}
          initial={category}
          parent={parent}
          onSubmit={submit}
          submitting={create.isPending || update.isPending}
          banner={errors.banner}
          serverErrors={errors.serverErrors}
        />
      )}
    </section>
  )
}
