// New article (ADR-0013, ADR-0016): the same sheet as the article page, optionally pre-filled by
// « Coller une adresse », with a first placement.
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useCaptures, useDeleteCapture, type CaptureRead } from '../../api/queries/capture'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl } from '../../api/queries/file'
import { centsToText } from '../../components/forms/MoneyField'
import type { FileRead } from '../../api/queries/file'
import { CLOSED_STATUSES, locationLabel, useLocations, useProject } from '../../api/queries/project'
import { useAttachItemFile, useCreateItem } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { Form } from '../../components/forms/Form'
import { textToMilli } from '../../components/forms/QuantityField'
import { Button } from '../../components/ui/Button'
import { PendingPhoto } from '../../components/PendingPhoto'
import { UrlCaptureBox, type Captured } from '../../components/UrlCaptureBox'
import { Card, PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { NewSupplierModal } from './InlineCreate'
import { EMPTY_ITEM, fromCapture, ItemFields, toCreatePayload, type ItemFormValues } from './ItemForm'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

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
  const [captured, setCaptured] = useState<Captured | null>(null)
  const [photo, setPhoto] = useState<{ file: FileRead; origin: string } | null>(null)
  const [modal, setModal] = useState<'supplier' | null>(null)
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const [formKey, setFormKey] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<ItemFormValues>({ defaultValues: EMPTY_ITEM })

  /** The brand read on a page never creates a supplier (brands are not suppliers): the existing
   * suppliers whose name resembles it are suggested; a single match is pre-selected, still editable. */
  const suggestions = brand ? similarSuppliers(brand, suppliers.data?.items ?? []) : []

  function useCapture(result: Captured, fromInbox: number | null = null) {
    setCaptured(result)
    setCaptureId(fromInbox)
    if (result.image) setPhoto({ file: result.image, origin: 'Photo lue sur la page ; jointe à la création.' })
    const found = result.preview.brand ? similarSuppliers(result.preview.brand, suppliers.data?.items ?? []) : []
    setBrand(result.preview.brand)
    form.reset(fromCapture(result.preview, form.getValues(), found.length === 1 && found[0] ? found[0].id : null))
    setFormKey((k) => k + 1)
    toast.show({ kind: 'success', message: 'Fiche pré-remplie depuis la page ; vérifier le prix (souvent TTC) et choisir le type.' })
  }

  async function submit(values: ItemFormValues) {
    setBanner(null)
    const milli = textToMilli(qty)
    if (milli === undefined || milli === null) return setBanner('Quantité invalide.')
    try {
      const created = await create.mutateAsync({
        projectId,
        data: toCreatePayload(values, {
          locationId: locationId ? Number(locationId) : null,
          qtyMilli: milli,
        }),
      })
      if (captured?.image) {
        await attach
          .mutateAsync({ itemId: created.id, data: { fileId: captured.image.id, kind: 'image', isPrimary: true, caption: null, sortOrder: 0 } })
          .catch(() => undefined)
      }
      if (captureId !== null) await deleteCapture.mutateAsync(captureId).catch(() => undefined) // consumed
      toast.show({ kind: 'success', message: `${created.itemCode} ajouté${captured?.image ? ' avec sa photo' : ' ; ajouter sa photo si besoin'}.` })
      navigate(`/projects/${projectId}/items/${created.id}`)
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

  if (project.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
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
    <section>
      <PageHeader
        title="Nouvel article"
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
          <Link to={`/projects/${p.id}`}>
            <Button variant="ghost">Retour au projet</Button>
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
                  onUse={() => useCapture({ preview: c.preview, image: c.image }, c.id)}
                  onDismiss={() => void deleteCapture.mutateAsync(c.id)}
                />
              ))}
            </ul>
          </Card>
        )}
        <Form form={form} onSubmit={submit} banner={banner}>
          <Card title="Article" label="Article">
            <div className="space-y-4">
              <PendingPhoto
                file={photo?.file ?? null}
                origin={photo?.origin}
                onChange={(file) => setPhoto(file ? { file, origin: 'Déposée ici ; jointe à la création.' } : null)}
              />
              {brand && (
                <p className="text-sm text-neutral-600" role="note">
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
                          className="mr-1 rounded-full border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
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
                categories={(categories.data ?? []).map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
                suppliers={options(suppliers.data?.items)}
                onCreateSupplier={() => setModal('supplier')}
              />
            </div>
          </Card>
          <Card title="Implantation" label="Implantation" className="mt-6">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
                Localisation
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="min-w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="">Non affecté</option>
                  {(locations.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {locationLabel(l)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
                Quantité
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="decimal"
                  className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-right text-sm font-normal"
                />
              </label>
              <span className="pb-2 text-xs text-neutral-500">Par localisation ; d'autres implantations s'ajoutent ensuite sur la page de l'article.</span>
            </div>
          </Card>
          <div className="mt-6 flex gap-2">
            <Button type="submit" variant="primary" disabled={create.isPending}>
              Créer l'article
            </Button>
            <Link to={`/projects/${p.id}`}>
              <Button variant="ghost">Annuler</Button>
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
      {capture.image ? (
        <img src={fileContentUrl(capture.image.id, capture.image.sha256)} alt="" className="h-14 w-14 rounded-md border border-neutral-200 object-contain" />
      ) : (
        <div className="h-14 w-14 rounded-md border border-dashed border-neutral-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-neutral-500">{facts || p.url}</p>
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
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const wanted = key(brand)
  if (!wanted) return []
  return suppliers.filter((s) => {
    const name = key(s.name)
    return name === wanted || ` ${name} `.includes(` ${wanted} `) || ` ${wanted} `.includes(` ${name} `)
  })
}
