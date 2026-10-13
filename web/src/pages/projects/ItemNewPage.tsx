// New article (ADR-0013, ADR-0016): the same sheet as the article page, optionally pre-filled by
// « Coller une adresse », with a first placement.
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import type { FileRead } from '../../api/queries/file'
import { CLOSED_STATUSES, locationLabel, useLocations, useProject } from '../../api/queries/project'
import { useAttachItemFile, useCreateItem } from '../../api/queries/projectItem'
import { useCreateSupplier, useSuppliers } from '../../api/queries/supplier'
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
  const createSupplier = useCreateSupplier()
  const toast = useToast()
  const [captured, setCaptured] = useState<Captured | null>(null)
  const [photo, setPhoto] = useState<{ file: FileRead; origin: string } | null>(null)
  const [modal, setModal] = useState<'supplier' | null>(null)
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const [formKey, setFormKey] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<ItemFormValues>({ defaultValues: EMPTY_ITEM })

  /** The brand read on the page is a supplier here: the existing one, or a new one. */
  async function supplierFor(brand: string | null): Promise<number | null> {
    if (!brand) return null
    const known = (suppliers.data?.items ?? []).find((m) => m.name.localeCompare(brand, 'fr', { sensitivity: 'base' }) === 0)
    if (known) return known.id
    try {
      return (await createSupplier.mutateAsync({ data: { name: brand, currency: 'EUR' }, force: false })).id
    } catch (error) {
      if (isApiError(error) && error.existingId !== undefined) return error.existingId
      return null
    }
  }

  async function useCapture(result: Captured) {
    setCaptured(result)
    if (result.image) setPhoto({ file: result.image, origin: 'Photo lue sur la page ; jointe à la création.' })
    const supplierId = await supplierFor(result.preview.brand)
    form.reset(fromCapture(result.preview, form.getValues(), supplierId))
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
          <UrlCaptureBox onUse={(result) => void useCapture(result)} />
        </Card>
        <Form form={form} onSubmit={submit} banner={banner}>
          <Card title="Article" label="Article">
            <div className="space-y-4">
              <PendingPhoto
                file={photo?.file ?? null}
                origin={photo?.origin}
                onChange={(file) => setPhoto(file ? { file, origin: 'Déposée ici ; jointe à la création.' } : null)}
              />
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
