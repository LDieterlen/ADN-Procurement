// Create (/products/new) and edit (/products/:id); files (photos, datasheets) on an existing product.
import { useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import {
  fileContentUrl,
  useArchiveProduct,
  useAttachProductFile,
  useCreateProduct,
  useDetachProductFile,
  useProduct,
  useUnarchiveProduct,
  useUpdateProduct,
  useUpdateProductFile,
  useUploadFile,
  type FileRead,
  type ProductRead,
} from '../../api/queries/product'
import { useCreateSupplier, useSuppliers } from '../../api/queries/supplier'
import { Button } from '../../components/ui/Button'
import { UrlCaptureBox, type Captured } from '../../components/UrlCaptureBox'
import { PendingPhoto } from '../../components/PendingPhoto'
import { PageHeader } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useSubmitErrors } from '../common/useSubmitErrors'
import { ProductForm, toPayload, type ProductFormValues } from './ProductForm'
import { Card } from '../../components/ui/Card'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }
const KIND_LABELS = { image: 'Image', datasheet: 'Fiche technique', drawing: 'Dessin', other: 'Autre' } as const

export function ProductFiles({ product }: { product: ProductRead }) {
  const upload = useUploadFile()
  const attach = useAttachProductFile()
  const updateFile = useUpdateProductFile()
  const detach = useDetachProductFile()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  async function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      try {
        const stored = await upload.mutateAsync(file)
        const isImage = stored.mimeType.startsWith('image/')
        const noPrimaryYet = !product.files.some((f) => f.isPrimary)
        await attach.mutateAsync({
          productId: product.id,
          data: { fileId: stored.id, kind: isImage ? 'image' : 'datasheet', isPrimary: isImage && noPrimaryYet, sortOrder: 0 },
        })
      } catch (error) {
        toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true })
      }
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void addFiles(event.dataTransfer.files)
  }

  const busy = upload.isPending || attach.isPending

  return (
    <section className="max-w-4xl space-y-3">
      <h2 className="text-base font-semibold">Photos et fichiers</h2>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded border-2 border-dashed px-4 py-6 text-center text-sm ${dragging ? 'border-neutral-700 bg-neutral-100' : 'border-neutral-300 text-neutral-500'}`}
      >
        Glisser des images (JPEG, PNG, WebP) ou des PDF ici, ou{' '}
        <button type="button" className="underline" onClick={() => input.current?.click()} disabled={busy}>
          choisir des fichiers
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          aria-label="Fichiers à joindre"
          onChange={(event) => event.target.files && void addFiles(event.target.files)}
        />
      </div>
      {product.files.length > 0 && (
        <ul className="grid grid-cols-4 gap-3" aria-label="Fichiers joints">
          {product.files.map((file) => (
            <li key={file.fileId} className="space-y-1 rounded border border-neutral-200 p-2 text-xs">
              {file.kind === 'image' ? (
                <img src={fileContentUrl(file.fileId)} alt={file.caption ?? file.originalName} className="h-28 w-full rounded object-cover" />
              ) : (
                <a
                  href={fileContentUrl(file.fileId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-28 items-center justify-center rounded bg-neutral-100 underline"
                >
                  {file.originalName}
                </a>
              )}
              <div className="flex items-center justify-between">
                <span>{KIND_LABELS[file.kind]}</span>
                {file.isPrimary && <span className="rounded bg-green-100 px-1 text-green-800">Principale</span>}
              </div>
              {file.kind === 'image' && (
                <input
                  defaultValue={file.licenseNote ?? ''}
                  placeholder="Licence (ex. photo fournisseur, usage interne)"
                  aria-label={`Licence de ${file.originalName}`}
                  className="w-full rounded border border-neutral-300 px-1 py-0.5 text-xs"
                  onBlur={(event) => {
                    const note = event.target.value.trim() || null
                    if (note !== (file.licenseNote ?? null))
                      void updateFile.mutateAsync({ productId: product.id, fileId: file.fileId, data: { licenseNote: note } })
                  }}
                />
              )}
              <div className="flex gap-2">
                {file.kind === 'image' && !file.isPrimary && (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void updateFile.mutateAsync({ productId: product.id, fileId: file.fileId, data: { isPrimary: true } })}
                  >
                    Principale
                  </button>
                )}
                <button
                  type="button"
                  className="text-red-700 underline"
                  onClick={() => void detach.mutateAsync({ productId: product.id, fileId: file.fileId })}
                  aria-label={`Retirer ${file.originalName}`}
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ProductEditPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const existing = useProduct(id)
  const categories = useCategories(false)
  const suppliers = useSuppliers(ALL)
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const archive = useArchiveProduct()
  const unarchive = useUnarchiveProduct()
  const attach = useAttachProductFile()
  const createSupplier = useCreateSupplier()
  const errors = useSubmitErrors('produit')
  const [captured, setCaptured] = useState<Captured | null>(null)
  const [photo, setPhoto] = useState<{ file: FileRead; origin: string } | null>(null)
  const [prefill, setPrefill] = useState<Partial<ProductFormValues> | undefined>(undefined)
  const [formKey, setFormKey] = useState(0)

  async function useCapture(result: Captured) {
    setCaptured(result)
    if (result.image) setPhoto({ file: result.image, origin: 'Photo lue sur la page ; jointe à la création.' })
    const brand = result.preview.brand
    let supplierId: number | null = null
    if (brand) {
      const known = (suppliers.data?.items ?? []).find((m) => m.name.localeCompare(brand, 'fr', { sensitivity: 'base' }) === 0)
      if (known) supplierId = known.id
      else
        supplierId = await createSupplier
          .mutateAsync({ data: { name: brand, currency: 'EUR' }, force: false })
          .then((m) => m.id)
          .catch((error: unknown) => (isApiError(error) && error.existingId !== undefined ? error.existingId : null))
    }
    setPrefill({
      name: result.preview.name ?? '',
      supplierId,
      reference: result.preview.reference ?? '',
      sourceUrl: result.preview.url,
      listPriceCents: result.preview.priceCents,
      currency: result.preview.priceCents !== null && result.preview.currency ? result.preview.currency : 'EUR',
    })
    setFormKey((k) => k + 1)
    errors.toast.show({ kind: 'success', message: 'Fiche pré-remplie depuis la page ; vérifier le prix (souvent TTC) et choisir le type.' })
  }

  async function submit(values: ProductFormValues, force = false) {
    errors.reset()
    try {
      if (id === undefined) {
        const created = await create.mutateAsync({ data: toPayload(values), force })
        if (captured?.image) {
          await attach
            .mutateAsync({ productId: created.id, data: { fileId: captured.image.id, kind: 'image', isPrimary: true, caption: null, sortOrder: 0 } })
            .catch(() => undefined)
        }
        errors.toast.show({ kind: 'success', message: `Produit « ${created.name} » créé${captured?.image ? ' avec sa photo' : ' ; ajouter ses photos'}.` })
        navigate(`/products/${created.id}`)
      } else {
        await update.mutateAsync({ id, data: toPayload(values) })
        errors.toast.show({ kind: 'success', message: 'Produit enregistré.' })
        navigate('/products')
      }
    } catch (error) {
      errors.handle(error, {
        resubmitForced: () => void submit(values, true),
        openExisting: (existingId) => navigate(`/products/${existingId}`),
        restore: (archivedId) => void unarchive.mutateAsync(archivedId).then(() => navigate(`/products/${archivedId}`)),
      })
    }
  }

  function confirmArchive() {
    if (id === undefined) return
    errors.setDialog({
      title: 'Archiver ce produit ?',
      message: 'Il disparaît du catalogue mais les lignes qui le citent gardent leur copie figée.',
      actions: [
        {
          label: 'Archiver',
          variant: 'danger',
          onClick: () =>
            void archive
              .mutateAsync(id)
              .then(() => errors.setDialog(null))
              .catch((error: unknown) => errors.setBanner(isApiError(error) ? error.message : String(error))),
        },
        { label: 'Annuler', onClick: () => errors.setDialog(null) },
      ],
    })
  }

  if (id !== undefined && existing.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (id !== undefined && existing.isError) {
    return (
      <EmptyState title={existing.error.message}>
        <Link to="/products" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const product = existing.data
  const archived = product?.archivedAt != null
  const toOptions = (rows: { id: number; name: string; code?: string | null }[] | undefined) =>
    (rows ?? []).map((r) => ({ id: r.id, label: r.code ? `${r.code} — ${r.name}` : r.name }))

  return (
    <section className="space-y-6">
      <PageHeader
        title={product ? product.name : 'Nouveau produit'}
        subtitle={archived ? <Pill>Archivé</Pill> : undefined}
        crumbs={
          <Link to="/products" className="hover:underline">
            Produits
          </Link>
        }
        actions={
          <>
            <Link to="/products">
              <Button variant="ghost">Retour</Button>
            </Link>
            {product && !archived && (
              <Button variant="danger" onClick={confirmArchive}>
                Archiver
              </Button>
            )}
            {product && archived && (
              <Button variant="primary" disabled={unarchive.isPending} onClick={() => void unarchive.mutateAsync(product.id)}>
                Restaurer
              </Button>
            )}
          </>
        }
      />
      {!product && (
        <Card title="Coller une adresse" label="Coller une adresse" className="max-w-4xl">
          <UrlCaptureBox onUse={(result) => void useCapture(result)} />
        </Card>
      )}
      {!product && (
        <div className="max-w-4xl">
          <PendingPhoto
            file={photo?.file ?? null}
            origin={photo?.origin}
            onChange={(file) => setPhoto(file ? { file, origin: 'Déposée ici ; jointe à la création.' } : null)}
          />
        </div>
      )}
      {archived ? (
        <p className="text-sm text-neutral-600">Produit archivé : restaurer pour modifier.</p>
      ) : (
        <ProductForm
          key={product?.updatedAt ?? `new-${formKey}`}
          initial={product}
          prefill={prefill}
          categories={toOptions(categories.data)}
          suppliers={toOptions(suppliers.data?.items)}
          onSubmit={(values) => submit(values)}
          submitting={create.isPending || update.isPending}
          submitLabel={product ? 'Enregistrer' : 'Créer'}
          banner={errors.banner}
          serverErrors={errors.serverErrors}
        />
      )}
      {product && !archived && <ProductFiles product={product} />}
      <ConfirmDialog open={errors.dialog !== null} title={errors.dialog?.title ?? ''} actions={errors.dialog?.actions ?? []}>
        {errors.dialog?.message}
      </ConfirmDialog>
    </section>
  )
}
