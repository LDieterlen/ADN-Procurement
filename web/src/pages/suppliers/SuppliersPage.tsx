import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSuppliers, type SupplierRead } from '../../api/queries/supplier'
import { bpToText } from '../../components/forms/BpField'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'

const LIMIT = 50

const COLUMNS: Column<SupplierRead>[] = [
  { key: 'name', header: 'Nom', render: (s) => <span className="font-medium">{s.name}</span> },
  { key: 'currency', header: 'Devise', render: (s) => s.currency },
  { key: 'discount', header: 'Remise', render: (s) => (s.defaultDiscountBp ? `${bpToText(s.defaultDiscountBp)} %` : ''), className: 'text-right' },
  { key: 'contact', header: 'Représentant', render: (s) => s.contactName ?? '' },
  { key: 'email', header: 'E-mail', render: (s) => s.email ?? '' },
  { key: 'phone', header: 'Téléphone', render: (s) => s.phone ?? '' },
  { key: 'status', header: '', render: (s) => (s.archivedAt ? <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Archivé</span> : null) },
]

export function SuppliersPage() {
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [offset, setOffset] = useState(0)
  const suppliers = useSuppliers({ q, includeArchived, limit: LIMIT, offset })
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (suppliers.isError) toast.show({ kind: 'error', message: suppliers.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [suppliers.isError, suppliers.error, toast])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fournisseurs</h1>
        <Link to="/suppliers/new">
          <Button variant="primary">Nouveau fournisseur</Button>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value)
            setOffset(0)
          }}
          placeholder="Nom ou représentant…"
          aria-label="Rechercher"
          className="w-64 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
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
      {suppliers.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {suppliers.isError && (
        <EmptyState title="Impossible de charger les fournisseurs">
          {suppliers.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {suppliers.data && (
        <>
          <DataTable
            caption="Liste des fournisseurs"
            columns={COLUMNS}
            rows={suppliers.data.items}
            rowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
            empty={<EmptyState title={q ? 'Aucun fournisseur ne correspond.' : 'Aucun fournisseur pour l’instant.'} />}
          />
          <Pagination offset={offset} limit={LIMIT} total={suppliers.data.total} onChange={setOffset} />
        </>
      )}
    </section>
  )
}
