// Projects list (ADR-0013): Projet · Client · Statut · Échéance · Budget HT · Prescrit HT · Articles.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useClients } from '../../api/queries/client'
import { PROJECT_STATUS_LABELS, useProjects, type ProjectListRead, type ProjectStatus } from '../../api/queries/project'
import { centsToText } from '../../components/forms/MoneyField'
import { DataTable, type Column } from '../../components/tables/DataTable'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pill } from '../../components/ui/Pill'
import { useToast } from '../../components/ui/Toast'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Pill filled={status === 'active'} tone={status === 'cancelled' ? 'red' : 'neutral'}>
      {PROJECT_STATUS_LABELS[status]}
    </Pill>
  )
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
  const columns: Column<ProjectListRead>[] = [
    { key: 'name', header: 'Projet', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'client', header: 'Client', render: (p) => clientName(p.clientId) },
    { key: 'status', header: 'Statut', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'due', header: 'Échéance', render: (p) => p.dueOn ?? '—' },
    { key: 'budget', header: 'Budget HT', className: 'text-right', render: (p) => (p.budgetCents === null ? '—' : `${centsToText(p.budgetCents)} €`) },
    { key: 'specified', header: 'Prescrit HT', className: 'text-right', render: (p) => `${centsToText(p.specifiedCents)} €` },
    { key: 'items', header: 'Articles', className: 'text-right', render: (p) => String(p.itemCount) },
  ]

  return (
    <section>
      <PageHeader
        title="Projets"
        subtitle={projects.data ? `${projects.data.length} projet${projects.data.length > 1 ? 's' : ''}` : undefined}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              Statut
              <select
                value={status ?? ''}
                onChange={(event) => setStatus(event.target.value === '' ? null : (event.target.value as ProjectStatus))}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Tous</option>
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <Link to="/projects/new">
              <Button variant="primary">Nouveau projet</Button>
            </Link>
          </>
        }
      />
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
          empty={<EmptyState title="Aucun projet.">Créer le premier avec « Nouveau projet ».</EmptyState>}
        />
      )}
    </section>
  )
}
