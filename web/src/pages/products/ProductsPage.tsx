import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCategories } from '../../api/queries/category'
import { fileContentUrl, useProducts, type ProductRead } from '../../api/queries/product'
import { useSuppliers } from '../../api/queries/supplier'
import { centsToText } from '../../components/forms/MoneyField'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'

const LIMIT = 50
const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }

export function primaryImage(product: ProductRead) {
  return product.files.find((f) => f.isPrimary) ?? product.files.find((f) => f.kind === 'image')
}

export function ProductsPage() {
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [offset, setOffset] = useState(0)
  const products = useProducts({ q, includeArchived, categoryId, supplierId, limit: LIMIT, offset })
  const categories = useCategories(false)
  const suppliers = useSuppliers(ALL)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (products.isError) toast.show({ kind: 'error', message: products.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [products.isError, products.error, toast])

  const categoryName = (id: number) => categories.data?.find((c) => c.id === id)?.name ?? ''
  const columns: Column<ProductRead>[] = [
    {
      key: 'photo',
      header: '',
      className: 'w-14',
      render: (p) => {
        const image = primaryImage(p)
        return image ? (
          <img src={fileContentUrl(image.fileId)} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <span className="block h-10 w-10 rounded bg-neutral-100" />
        )
      },
    },
    { key: 'name', header: 'Nom', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'category', header: 'Type', render: (p) => categoryName(p.categoryId) },
    { key: 'ref', header: 'Référence', render: (p) => p.reference ?? '' },
    {
      key: 'price',
      header: 'Prix HT',
      className: 'text-right',
      render: (p) => (p.listPriceCents === null ? '' : `${centsToText(p.listPriceCents)} ${p.currency}`),
    },
    {
      key: 'status',
      header: '',
      render: (p) => (p.archivedAt ? <Pill>Archivé</Pill> : null),
    },
  ]

  const filterSelect = (label: string, value: number | null, onChange: (v: number | null) => void, options: { id: number; name: string }[]) => (
    <label className="flex items-center gap-1 text-sm text-neutral-700">
      {label}
      <select
        value={value ?? ''}
        onChange={(event) => {
          onChange(event.target.value === '' ? null : Number(event.target.value))
          setOffset(0)
        }}
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
      >
        <option value="">Toutes</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="space-y-4">
      <PageHeader
        title="Produits"
        subtitle="Le catalogue : chaque article libre y entre par défaut"
        actions={
          <Link to="/products/new">
            <Button variant="primary">Nouveau produit</Button>
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value)
            setOffset(0)
          }}
          placeholder="Nom ou référence…"
          aria-label="Rechercher"
          className="w-64 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        {filterSelect('Type', categoryId, setCategoryId, categories.data ?? [])}
        {filterSelect('Fournisseur', supplierId, setSupplierId, suppliers.data?.items ?? [])}
        <label className="flex items-center gap-1.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => {
              setIncludeArchived(event.target.checked)
              setOffset(0)
            }}
          />
          Afficher les archivés
        </label>
      </div>
      {products.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {products.isError && (
        <EmptyState title="Impossible de charger les produits">
          {products.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {products.data && (
        <>
          <DataTable
            caption="Liste des produits"
            columns={columns}
            rows={products.data.items}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/products/${p.id}`)}
            empty={<EmptyState title={q || categoryId || supplierId ? 'Aucun produit ne correspond.' : 'Aucun produit pour l’instant.'} />}
          />
          <Pagination offset={offset} limit={LIMIT} total={products.data.total} onChange={setOffset} />
        </>
      )}
    </section>
  )
}
