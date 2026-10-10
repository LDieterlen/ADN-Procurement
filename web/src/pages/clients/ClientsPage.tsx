import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useClients, type ClientRead } from '../../api/queries/client'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

export const KIND_LABELS: Record<ClientRead['kind'], string> = { individual: 'Particulier', company: 'Société' }

const COLUMNS: Column<ClientRead>[] = [
  { key: 'name', header: 'Nom', render: (c) => <span className="font-medium">{c.name}</span> },
  { key: 'kind', header: 'Type', render: (c) => KIND_LABELS[c.kind] },
  { key: 'city', header: 'Ville', render: (c) => c.city ?? '' },
  { key: 'email', header: 'E-mail', render: (c) => c.email ?? '' },
  { key: 'phone', header: 'Téléphone', render: (c) => c.phone ?? '' },
  { key: 'status', header: '', render: (c) => (c.archivedAt ? <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Archivé</span> : null) },
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link to="/clients/new">
          <Button variant="primary">Nouveau client</Button>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Rechercher un nom…"
          aria-label="Rechercher"
          className="w-64 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-neutral-700">
          <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
          Afficher les archivés
        </label>
      </div>
      {clients.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {clients.isError && (
        <EmptyState title="Impossible de charger les clients">
          {clients.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {clients.data && (
        <DataTable
          caption="Liste des clients"
          columns={COLUMNS}
          rows={clients.data}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/clients/${c.id}`)}
          empty={
            <EmptyState title={q ? 'Aucun client ne correspond.' : 'Aucun client pour l’instant.'}>
              {!q && 'Créer le premier avec « Nouveau client ».'}
            </EmptyState>
          }
        />
      )}
    </section>
  )
}
