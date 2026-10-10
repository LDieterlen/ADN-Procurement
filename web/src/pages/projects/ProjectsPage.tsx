import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useClients } from '../../api/queries/client'
import { PROJECT_STATUS_LABELS, useProjects, type ProjectRead, type ProjectStatus } from '../../api/queries/project'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  prospect: 'bg-neutral-200 text-neutral-800',
  active: 'bg-green-100 text-green-800',
  delivered: 'bg-blue-100 text-blue-800',
  closed: 'bg-neutral-100 text-neutral-500',
  cancelled: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_CLASSES[status]}`}>{PROJECT_STATUS_LABELS[status]}</span>
}

export function ProjectsPage() {
  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const projects = useProjects(status)
  const clients = useClients('', true)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (projects.isError) toast.show({ kind: 'error', message: projects.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [projects.isError, projects.error, toast])

  const clientName = (id: number) => clients.data?.find((c) => c.id === id)?.name ?? ''
  const columns: Column<ProjectRead>[] = [
    { key: 'code', header: 'Code', render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: 'name', header: 'Nom', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'client', header: 'Client', render: (p) => clientName(p.clientId) },
    { key: 'status', header: 'Statut', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'due', header: 'Échéance', render: (p) => p.dueOn ?? '' },
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projets</h1>
        <Link to="/projects/new">
          <Button variant="primary">Nouveau projet</Button>
        </Link>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        Statut
        <select
          value={status ?? ''}
          onChange={(event) => setStatus(event.target.value === '' ? null : (event.target.value as ProjectStatus))}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">Tous</option>
          {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {projects.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {projects.isError && (
        <EmptyState title="Impossible de charger les projets">
          {projects.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {projects.data && (
        <DataTable
          caption="Liste des projets"
          columns={columns}
          rows={projects.data}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/projects/${p.id}`)}
          empty={<EmptyState title="Aucun projet." />}
        />
      )}
    </section>
  )
}
