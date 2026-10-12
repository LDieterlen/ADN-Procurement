import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useProfessionals, type ProfessionalRead } from '../../api/queries/professional'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { Pill } from '../../components/ui/Pill'
import { KIND_LABELS } from './ProfessionalForm'
import { useToast } from '../../components/ui/Toast'

const LIMIT = 50

const COLUMNS: Column<ProfessionalRead>[] = [
  { key: 'name', header: 'Nom', render: (m) => <span className="font-medium">{m.name}</span> },
  { key: 'kind', header: 'Prestation', render: (m) => <Pill>{KIND_LABELS[m.kind]}</Pill> },
  { key: 'specialty', header: 'Savoir-faire', render: (m) => m.specialty ?? '' },
  { key: 'contact', header: 'Contact', render: (m) => m.contactName ?? '' },
  { key: 'phone', header: 'Téléphone', render: (m) => m.mobile ?? m.phone ?? '' },
  { key: 'email', header: 'E-mail', render: (m) => m.email ?? '' },
  { key: 'website', header: 'Site web', render: (m) => m.website ?? '' },
  { key: 'status', header: '', render: (m) => (m.archivedAt ? <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Archivé</span> : null) },
]

export function ProfessionalsPage() {
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [offset, setOffset] = useState(0)
  const professionals = useProfessionals({ q, includeArchived, limit: LIMIT, offset })
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (professionals.isError)
      toast.show({ kind: 'error', message: professionals.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [professionals.isError, professionals.error, toast])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Professionnels</h1>
        <Link to="/professionals/new">
          <Button variant="primary">Nouveau professionnel</Button>
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
          placeholder="Rechercher un nom, un savoir-faire, un contact…"
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
      {professionals.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {professionals.isError && (
        <EmptyState title="Impossible de charger les professionnels">
          {professionals.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {professionals.data && (
        <>
          <DataTable
            caption="Liste des professionnels"
            columns={COLUMNS}
            rows={professionals.data.items}
            rowKey={(m) => m.id}
            onRowClick={(m) => navigate(`/professionals/${m.id}`)}
            empty={<EmptyState title={q ? 'Aucun professionnel ne correspond.' : 'Aucun professionnel pour l’instant.'} />}
          />
          <Pagination offset={offset} limit={LIMIT} total={professionals.data.total} onChange={setOffset} />
        </>
      )}
    </section>
  )
}
