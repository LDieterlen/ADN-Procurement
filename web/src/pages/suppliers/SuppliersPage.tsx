import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSupplierSpecialties, useSuppliers, type SupplierRead } from '../../api/queries/supplier'
import { FilterSelect } from '../../components/forms/FilterSelect'
import { type Column } from '../../components/tables/DataTable'
import { ListToolbar } from '../../components/tables/ListToolbar'
import { TableCard, archivedColumn } from '../../components/tables/TableCard'
import { PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

const LIMIT = 50

const COLUMNS: Column<SupplierRead>[] = [
  { key: 'name', header: 'Nom', render: (s) => <span className="font-medium">{s.name}</span> },
  { key: 'specialty', className: 'text-ink-2', header: 'Savoir-faire', render: (s) => s.specialty ?? '' },
  { key: 'contact', className: 'text-ink-2', header: 'Représentant', render: (s) => s.contactName ?? '' },
  { key: 'email', className: 'text-ink-2', header: 'E-mail', render: (s) => s.email ?? '' },
  { key: 'phone', className: 'text-ink-2', header: 'Téléphone', render: (s) => s.mobile ?? s.phone ?? '' },
  archivedColumn<SupplierRead>(),
]

export function SuppliersPage() {
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [offset, setOffset] = useState(0)
  const [specialty, setSpecialty] = useState('')
  const suppliers = useSuppliers({ q, includeArchived, limit: LIMIT, offset, specialty })
  const specialties = useSupplierSpecialties()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (suppliers.isError) toast.show({ kind: 'error', message: suppliers.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [suppliers.isError, suppliers.error, toast])

  return (
    <section>
      <PageHeader
        title="Fournisseurs"
        subtitle={suppliers.data ? `${suppliers.data.total} fournisseur${suppliers.data.total > 1 ? 's' : ''}` : undefined}
        actions={
          <Link to="/suppliers/new">
            <Button variant="primary">Nouveau fournisseur</Button>
          </Link>
        }
      />
      <ListToolbar
        search={{
          value: q,
          onChange: (value) => {
            setQ(value)
            setOffset(0)
          },
          placeholder: 'Nom, savoir-faire ou représentant…',
        }}
        filters={
          <FilterSelect
            label="Savoir-faire"
            value={specialty}
            onChange={(value) => {
              setSpecialty(value)
              setOffset(0)
            }}
            options={(specialties.data ?? []).map((s) => ({ value: s, label: s }))}
          />
        }
        archived={{
          value: includeArchived,
          onChange: (value) => {
            setIncludeArchived(value)
            setOffset(0)
          },
        }}
      />
      <TableCard
        label="Fournisseurs"
        caption="Liste des fournisseurs"
        columns={COLUMNS}
        rows={suppliers.data?.items}
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
        loading={suppliers.isPending}
        error={suppliers.isError ? { title: 'Impossible de charger les fournisseurs', message: suppliers.error.message } : null}
        empty={q ? 'Aucun fournisseur ne correspond.' : 'Aucun fournisseur pour l’instant.'}
        page={suppliers.data ? { offset, limit: LIMIT, total: suppliers.data.total, onChange: setOffset } : undefined}
      />
    </section>
  )
}
