// New article (ADR-0013, ADR-0016): the same sheet as the article page, optionally pre-filled by
// « Coller une adresse », with a first placement; `?optionOf=<id>` makes it an option of that
// article (ADR-0021): no placement, the base's type pre-selected.
import { useEffect, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useCaptures, useDeleteCapture, type CaptureRead } from '../../api/queries/capture'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl } from '../../api/queries/file'
import { centsToText } from '../../components/forms/MoneyField'
import type { FileRead } from '../../api/queries/file'
import { CLOSED_STATUSES, locationLabel, useLocations, useProject } from '../../api/queries/project'
import { useAttachItemFile, useCreateItem, useProjectItem } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { Form } from '../../components/forms/Form'
import { textToMilli } from '../../components/forms/QuantityField'
import { Button, buttonClass } from '../../components/ui/Button'
import { PendingPhoto } from '../../components/PendingPhoto'
import { UrlCaptureBox, type Captured } from '../../components/UrlCaptureBox'
import { Card, PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { NewSupplierModal } from './InlineCreate'
import { fold } from '../../lib/text'
import { EMPTY_ITEM, fromCapture, ItemFields, toCreatePayload, type ItemFormValues } from './ItemForm'

const ALL = { q: '', includeArchived: false, limit: 1000, offset: 0 }

export function ItemNewPage() {
  const params = useParams<{ id: string }>()
  const projectId = Number(params.id)
  const navigate = useNavigate()
  const project = useProject(projectId)
  const locations = useLocations(projectId, false)
  const categories = useCategories(false)
  const suppliers = useSuppliers(ALL)
  const create = useCreateItem()
  const attach = useAttachItemFile()
  const [brand, setBrand] = useState<string | null>(null)
  const captures = useCaptures()
  const deleteCapture = useDeleteCapture()
  const toast = useToast()
  const [captureId, setCaptureId] = useState<number | null>(null)
  const [prefilled, setPrefilled] = useState(false)
  // Photos joined at creation, first = main photo (« Coller une adresse » and Chrome: every photo of the page).
  const [photos, setPhotos] = useState<FileRead[]>([])
  const [photoOrigin, setPhotoOrigin] = useState<string | undefined>(undefined)
  const [modal, setModal] = useState<'supplier' | null>(null)
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const [formKey, setFormKey] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<ItemFormValues>({ defaultValues: EMPTY_ITEM })
  const [search] = useSearchParams()
  const optionOf = Number(search.get('optionOf')) || undefined
  const base = useProjectItem(optionOf)

  useEffect(() => {
    // An option starts with its base's type (still editable).
    if (base.data && form.getValues('categoryId') === null) form.setValue('categoryId', base.data.categoryId)
  }, [base.data, form])

  /** The brand read on a page never creates a supplier (brands are not suppliers): the existing
   * suppliers whose name resembles it are suggested; a single match is pre-selected, still editable. */
  const suggestions = brand ? similarSuppliers(brand, suppliers.data?.items ?? []) : []

  function useCapture(result: Captured, fromInbox: number | null = null) {
    setCaptureId(fromInbox)
    if (result.images.length) {
      setPhotos(result.images)
      setPhotoOrigin(
        result.images.length > 1
          ? `${result.images.length} photos lues sur la page ; toutes jointes à la création.`
          : 'Photo lue sur la page ; jointe à la création.',
      )
    }
    const found = result.preview.brand ? similarSuppliers(result.preview.brand, suppliers.data?.items ?? []) : []
    setBrand(result.preview.brand)
    const type = result.preview.typeCode ? (categories.data ?? []).find((c) => c.code === result.preview.typeCode) : undefined
    // An option keeps its base's type, whatever the page suggests (ADR-0021).
    const typeId = optionOf && base.data ? base.data.categoryId : (type?.id ?? null)
    form.reset(fromCapture(result.preview, form.getValues(), found.length === 1 && found[0] ? found[0].id : null, typeId))
    setFormKey((k) => k + 1)
    setPrefilled(true)
  }

  async function submit(values: ItemFormValues) {
    setBanner(null)
    const milli = textToMilli(qty)
    if (milli === undefined || milli === null) return setBanner('Quantité invalide.')
    if (!values.productName.trim()) return form.setError('productName', { type: 'required', message: 'Un nom est nécessaire.' })
    try {
      const payload = toCreatePayload(values, { locationId: locationId ? Number(locationId) : null, qtyMilli: milli })
      const created = await create.mutateAsync({
        projectId,
        data: optionOf ? { ...payload, placements: null, optionOfId: optionOf } : payload,
      })
      let attached = 0
      for (const [index, file] of photos.entries()) {
        await attach
          .mutateAsync({ itemId: created.id, data: { fileId: file.id, kind: 'image', isPrimary: index === 0, caption: null, sortOrder: index } })
          .then(() => (attached += 1))
          .catch(() => undefined)
      }
      if (captureId !== null) await deleteCapture.mutateAsync(captureId).catch(() => undefined) // consumed
      toast.show({
        kind: 'success',
        message: `${created.itemCode} ajouté${attached > 1 ? ` avec ${attached} photos` : attached ? ' avec sa photo' : ' ; ajouter sa photo si besoin'}.${
          attached < photos.length ? ` ${photos.length - attached} photo(s) non jointe(s) : les ajouter depuis la page de l'article.` : ''
        }`,
      })
      // Back to the project (the article is in its list), or to the base article for an option.
      navigate(optionOf ? `/projects/${projectId}/items/${optionOf}` : `/projects/${projectId}`)
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') {
        for (const detail of error.details) {
          const field = detail.field === 'fxRateMicro' ? 'fxRate' : detail.field
          if (field in EMPTY_ITEM) form.setError(field as Path<ItemFormValues>, { type: 'server', message: detail.message })
        }
      }
      setBanner(error.message)
    }
  }

  if (optionOf && base.isError) {
    // The article to add an option to is not there (deleted, wrong address).
    return (
      <EmptyState title={base.error.message}>
        <Link to={`/projects/${projectId}`} className="underline">
          Retour au projet
        </Link>
      </EmptyState>
    )
  }
  if (project.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
  if (project.isError) {
    return (
      <EmptyState title={project.error.message}>
        <Link to="/projects" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const p = project.data
  if (CLOSED_STATUSES.includes(p.status)) {
    return (
      <EmptyState title="Projet en lecture seule">
        <Link to={`/projects/${p.id}`} className="underline">
          Retour au projet
        </Link>
      </EmptyState>
    )
  }
  const options = (rows: { id: number; name: string }[] | undefined) => (rows ?? []).map((r) => ({ id: r.id, label: r.name }))

  return (
    <section className="max-w-[960px]">
      <PageHeader
        title={optionOf ? 'Nouvelle option' : 'Nouvel article'}
        subtitle={
          optionOf && base.data ? (
            <span>
              Option de <span className="font-mono">{base.data.itemCode}</span> — {base.data.name} ; elle reprend ses localisations et quantités.
            </span>
          ) : undefined
        }
        crumbs={
          <>
            <Link to="/projects" className="hover:underline">
              Projets
            </Link>
            {' / '}
            <Link to={`/projects/${p.id}`} className="hover:underline">
              {p.name}
            </Link>
          </>
        }
        actions={
          <Link to={`/projects/${p.id}`} className={buttonClass('ghost')}>
            Retour au projet
          </Link>
        }
      />
      <div className="space-y-6">
        <Card title="Coller une adresse" label="Coller une adresse">
          <UrlCaptureBox onUse={(result) => useCapture(result)} />
        </Card>
        {captures.data && captures.data.length > 0 && (
          <Card title="Envoyées depuis Chrome" label="Envoyées depuis Chrome">
            <ul className="divide-y divide-neutral-200">
              {captures.data.map((c) => (
                <InboxRow
                  key={c.id}
                  capture={c}
                  onUse={() => useCapture({ preview: c.preview, images: c.images }, c.id)}
                  onDismiss={() => void deleteCapture.mutateAsync(c.id)}
                />
              ))}
            </ul>
          </Card>
        )}
        {prefilled && (
          <div role="status" className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13.5px] text-warn">
            <strong className="font-semibold">Fiche pré-remplie depuis la page — à vérifier :</strong> prix souvent TTC sur les sites marchands, type,
            dimensions et délai.
          </div>
        )}
        <Form form={form} onSubmit={submit} banner={banner}>
          <Card title="Article" label="Article">
            <div className="space-y-4">
              <PendingPhoto
                file={photos[0] ?? null}
                origin={photoOrigin}
                onChange={(file) => {
                  setPhotos((current) => (file ? [file, ...current.slice(1)] : current.slice(1)))
                  setPhotoOrigin(file ? 'Déposée ici ; jointe à la création.' : undefined)
                }}
              />
              {photos.length > 1 && (
                <ul className="flex flex-wrap gap-2" aria-label="Autres photos">
                  {photos.slice(1).map((file) => (
                    <li key={file.id} className="relative">
                      <img src={fileContentUrl(file.id, file.sha256)} alt="" className="h-14 w-14 rounded-[5px] border border-line object-cover" />
                      <button
                        type="button"
                        aria-label={`Retirer la photo ${file.originalName}`}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full border border-line bg-surface text-xs leading-none text-ink-2 hover:text-danger"
                        onClick={() => setPhotos((current) => current.filter((f) => f.id !== file.id))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {brand && (
                <p className="text-sm text-ink-2" role="note">
                  Marque lue sur la page : <span className="font-medium">{brand}</span>.{' '}
                  {suggestions.length === 0 && 'Aucun fournisseur ne lui ressemble : choisir dans la liste ou « + Nouveau ».'}
                  {suggestions.length === 1 && suggestions[0] && `Fournisseur proposé : ${suggestions[0].name}.`}
                  {suggestions.length > 1 && (
                    <>
                      Fournisseurs proches :{' '}
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="mr-1 rounded-full border border-line-strong px-2 py-0.5 text-xs hover:bg-track"
                          onClick={() => form.setValue('supplierId', s.id, { shouldDirty: true })}
                        >
                          {s.name}
                        </button>
                      ))}
                    </>
                  )}
                </p>
              )}
              <ItemFields
                key={formKey}
                form={form}
                kind="product"
                categories={(categories.data ?? [])
                  .filter((c) => !base.data || c.id === base.data.categoryId) // an option has its base's type
                  .map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
                suppliers={options(suppliers.data?.items)}
                onCreateSupplier={() => setModal('supplier')}
              />
            </div>
          </Card>
          {!optionOf && (
            <Card title="Implantation" label="Implantation" className="mt-6">
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-ink-2">
                  Localisation
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="control min-w-64 bg-surface font-normal">
                    <option value="">Non affecté</option>
                    {(locations.data ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {locationLabel(l)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-ink-2">
                  Quantité
                  <input
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="decimal"
                    className="w-24 rounded-lg border border-line-strong px-3 py-2 text-right text-sm font-normal"
                  />
                </label>
                <span className="pb-2 text-xs text-ink-3">Par localisation ; d'autres implantations s'ajoutent ensuite sur la page de l'article.</span>
              </div>
            </Card>
          )}
          <div className="mt-6 flex gap-2">
            <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
              {optionOf ? "Créer l'option" : "Créer l'article"}
            </Button>
            <Link to={`/projects/${p.id}`} className={buttonClass('ghost')}>
              Annuler
            </Link>
          </div>
        </Form>
      </div>
      <NewSupplierModal
        open={modal === 'supplier'}
        onClose={() => setModal(null)}
        onCreated={(id) => {
          setModal(null)
          form.setValue('supplierId', id, { shouldDirty: true })
          toast.show({ kind: 'success', message: 'Fournisseur créé.' })
        }}
      />
    </section>
  )
}

function InboxRow({ capture, onUse, onDismiss }: { capture: CaptureRead; onUse: () => void; onDismiss: () => void }) {
  const p = capture.preview
  const facts = [p.brand, p.reference ? `réf. ${p.reference}` : null, p.priceCents !== null ? `${centsToText(p.priceCents)} ${p.currency ?? ''} affiché` : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <li className="flex items-center gap-4 py-3">
      {capture.images[0] ? (
        <img src={fileContentUrl(capture.images[0].id, capture.images[0].sha256)} alt="" className="h-14 w-14 rounded-md border border-line object-contain" />
      ) : (
        <div className="h-14 w-14 rounded-md border border-dashed border-line-strong" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-ink-3">
          {facts || p.url}
          {capture.images.length > 1 ? ` · ${capture.images.length} photos` : ''}
        </p>
      </div>
      <Button variant="primary" onClick={onUse}>
        Utiliser
      </Button>
      <Button variant="ghost" onClick={onDismiss} aria-label={`Supprimer ${p.name ?? ''}`}>
        Supprimer
      </Button>
    </li>
  )
}

/** Accent- and punctuation-insensitive resemblance: « AM.PM » finds « La Redoute / AM PM ». */
export function similarSuppliers<T extends { id: number; name: string }>(brand: string, suppliers: T[]): T[] {
  const key = (text: string) =>
    fold(text)
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const wanted = key(brand)
  if (!wanted) return []
  return suppliers.filter((s) => {
    const name = key(s.name)
    return name === wanted || ` ${name} `.includes(` ${wanted} `) || ` ${wanted} `.includes(` ${name} `)
  })
}
