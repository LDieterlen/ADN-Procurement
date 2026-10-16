import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useClients, type ClientRead } from '../../api/queries/client'
import { type Column } from '../../components/tables/DataTable'
import { ListToolbar } from '../../components/tables/ListToolbar'
import { TableCard, archivedColumn } from '../../components/tables/TableCard'
import { PageHeader } from '../../components/ui/Card'
import { buttonClass } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export const KIND_LABELS: Record<ClientRead['kind'], string> = { individual: 'Particulier', company: 'Société' }

const COLUMNS: Column<ClientRead>[] = [
  { key: 'name', header: 'Nom', render: (c) => <span className="font-medium">{c.name}</span> },
  { key: 'kind', className: 'text-ink-2', header: 'Type', render: (c) => KIND_LABELS[c.kind] },
  { key: 'city', className: 'text-ink-2', header: 'Ville', render: (c) => c.city ?? '' },
  { key: 'email', className: 'text-ink-2', header: 'E-mail', render: (c) => c.email ?? '' },
  { key: 'phone', className: 'text-ink-2', header: 'Téléphone', render: (c) => c.phone ?? '' },
  archivedColumn<ClientRead>(),
]

export function ClientsPage() {
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const clients = useClients(q, includeArchived)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (clients.isError) toast.show({ kind: 'error', message: clients.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [clients.isError, clients.error, toast])

  return (
    <section>
      <PageHeader
        title="Clients"
        subtitle={clients.data ? `${clients.data.length} client${clients.data.length > 1 ? 's' : ''}` : undefined}
        actions={
          <Link to="/clients/new" className={buttonClass('primary')}>
            Nouveau client
          </Link>
        }
      />
      <ListToolbar
        search={{ value: q, onChange: setQ, placeholder: 'Rechercher un nom…' }}
        archived={{ value: includeArchived, onChange: setIncludeArchived }}
      />
      <TableCard
        label="Clients"
        caption="Liste des clients"
        columns={COLUMNS}
        rows={clients.data}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
        loading={clients.isPending}
        error={clients.isError ? { title: 'Impossible de charger les clients', message: clients.error.message } : null}
        empty={q ? 'Aucun client ne correspond.' : 'Aucun client pour l’instant. Créer le premier avec « Nouveau client ».'}
      />
    </section>
  )
}
