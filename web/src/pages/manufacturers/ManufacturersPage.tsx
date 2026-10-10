import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useManufacturers, type ManufacturerRead } from '../../api/queries/manufacturer'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'

const LIMIT = 50

const COLUMNS: Column<ManufacturerRead>[] = [
  { key: 'name', header: 'Nom', render: (m) => <span className="font-medium">{m.name}</span> },
  { key: 'website', header: 'Site web', render: (m) => m.website ?? '' },
  { key: 'status', header: '', render: (m) => (m.archivedAt ? <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Archivé</span> : null) },
]

export function ManufacturersPage() {
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [offset, setOffset] = useState(0)
  const manufacturers = useManufacturers({ q, includeArchived, limit: LIMIT, offset })
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (manufacturers.isError)
      toast.show({ kind: 'error', message: manufacturers.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [manufacturers.isError, manufacturers.error, toast])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fabricants</h1>
        <Link to="/manufacturers/new">
          <Button variant="primary">Nouveau fabricant</Button>
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
          placeholder="Rechercher une marque…"
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
      {manufacturers.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {manufacturers.isError && (
        <EmptyState title="Impossible de charger les fabricants">
          {manufacturers.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {manufacturers.data && (
        <>
          <DataTable
            caption="Liste des fabricants"
            columns={COLUMNS}
            rows={manufacturers.data.items}
            rowKey={(m) => m.id}
            onRowClick={(m) => navigate(`/manufacturers/${m.id}`)}
            empty={<EmptyState title={q ? 'Aucun fabricant ne correspond.' : 'Aucun fabricant pour l’instant.'} />}
          />
          <Pagination offset={offset} limit={LIMIT} total={manufacturers.data.total} onChange={setOffset} />
        </>
      )}
    </section>
  )
}
