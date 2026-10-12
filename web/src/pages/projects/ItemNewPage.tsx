// New article (ADR-0013): the same sheet as the article page, pre-filled from a catalogue product
// if one is picked, a first placement, and the « ne pas ajouter au catalogue » choice.
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import { useCreateManufacturer, useManufacturers } from '../../api/queries/manufacturer'
import { useProducts, type FileRead } from '../../api/queries/product'
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
import { NewManufacturerModal, NewSupplierModal } from './InlineCreate'
import { EMPTY_ITEM, fromCapture, fromProduct, ItemFields, toCreatePayload, type ItemFormValues } from './ItemForm'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

export function ItemNewPage() {
  const params = useParams<{ id: string }>()
  const projectId = Number(params.id)
  const navigate = useNavigate()
  const project = useProject(projectId)
  const locations = useLocations(projectId, false)
  const categories = useCategories(false)
  const manufacturers = useManufacturers(ALL)
  const suppliers = useSuppliers(ALL)
  const [search, setSearch] = useState('')
  const products = useProducts({ ...ALL, q: search, categoryId: null, manufacturerId: null, supplierId: null, limit: 50 })
  const create = useCreateItem()
  const attach = useAttachItemFile()
  const createManufacturer = useCreateManufacturer()
  const toast = useToast()
  const [captured, setCaptured] = useState<Captured | null>(null)
  const [photo, setPhoto] = useState<{ file: FileRead; origin: string } | null>(null)
  const [modal, setModal] = useState<'manufacturer' | 'supplier' | null>(null)
  const [productId, setProductId] = useState<number | null>(null)
  const [addToCatalogue, setAddToCatalogue] = useState(true)
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const [formKey, setFormKey] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<ItemFormValues>({ defaultValues: EMPTY_ITEM })

  function pickProduct(id: number | null) {
    setProductId(id)
    const product = (products.data?.items ?? []).find((p) => p.id === id)
    const primary = product?.files.find((f) => f.isPrimary)
    if (primary) {
      setPhoto({
        file: {
          id: primary.fileId,
          sha256: primary.sha256,
          ext: primary.ext,
          mimeType: primary.mimeType,
          sizeBytes: primary.sizeBytes,
          originalName: primary.originalName,
          sourceUrl: null,
          createdAt: '',
        },
        origin: 'Photo du produit du catalogue ; jointe à la création.',
      })
    }
    form.reset(product ? fromProduct(product, form.getValues()) : form.getValues())
    setFormKey((k) => k + 1) // MoneyField and BpField keep their own text: remount them
  }

  /** The brand read on the page becomes a manufacturer: the existing one, or a new one. */
  async function manufacturerFor(brand: string | null): Promise<number | null> {
    if (!brand) return null
    const known = (manufacturers.data?.items ?? []).find((m) => m.name.localeCompare(brand, 'fr', { sensitivity: 'base' }) === 0)
    if (known) return known.id
    try {
      return (await createManufacturer.mutateAsync({ data: { name: brand, website: null, notes: null }, force: false })).id
    } catch (error) {
      if (isApiError(error) && error.existingId !== undefined) return error.existingId
      return null
    }
  }

  async function useCapture(result: Captured) {
    setCaptured(result)
    setProductId(null)
    if (result.image) setPhoto({ file: result.image, origin: 'Photo lue sur la page ; jointe à la création.' })
    const manufacturerId = await manufacturerFor(result.preview.brand)
    form.reset(fromCapture(result.preview, form.getValues(), manufacturerId))
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
          productId,
          addToCatalogue: productId === null && addToCatalogue,
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
  const productOptions = (products.data?.items ?? []).map((pr) => ({ id: pr.id, label: pr.name, hint: pr.reference ?? undefined }))

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
        <Card title="Depuis le catalogue" label="Depuis le catalogue">
          <div className="grid grid-cols-3 gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              Rechercher un produit
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                placeholder="Nom ou référence…"
                aria-label="Rechercher un produit"
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-sm font-medium text-neutral-700">
              Produit
              <select
                value={productId ?? ''}
                onChange={(event) => pickProduct(event.target.value ? Number(event.target.value) : null)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal"
                aria-label="Produit du catalogue"
              >
                <option value="">— article libre —</option>
                {productOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                    {o.hint ? ` — ${o.hint}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {productId
              ? 'La fiche ci-dessous est copiée du produit ; elle reste modifiable sans toucher le catalogue.'
              : 'Sans produit, la fiche saisie ci-dessous crée un article libre.'}
          </p>
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
                manufacturers={options(manufacturers.data?.items)}
                suppliers={options(suppliers.data?.items)}
                onCreateManufacturer={() => setModal('manufacturer')}
                onCreateSupplier={() => setModal('supplier')}
              />
              {productId === null && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!addToCatalogue} onChange={(e) => setAddToCatalogue(!e.target.checked)} />
                  Ne pas ajouter au catalogue
                </label>
              )}
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
      <NewManufacturerModal
        open={modal === 'manufacturer'}
        onClose={() => setModal(null)}
        onCreated={(id) => {
          setModal(null)
          form.setValue('manufacturerId', id, { shouldDirty: true })
          toast.show({ kind: 'success', message: 'Fabricant créé.' })
        }}
      />
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
