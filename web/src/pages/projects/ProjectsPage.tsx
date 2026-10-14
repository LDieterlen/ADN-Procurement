// Projects list (ADR-0013): Projet · Client · Statut · Échéance · Budget HT · Prescrit HT · Articles.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useClients } from '../../api/queries/client'
import { PROJECT_STATUS_LABELS, useProjects, type ProjectListRead, type ProjectStatus } from '../../api/queries/project'
import { type Column } from '../../components/tables/DataTable'
import { ListToolbar } from '../../components/tables/ListToolbar'
import { TableCard } from '../../components/tables/TableCard'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { Segmented } from '../../components/ui/Segmented'
import { useToast } from '../../components/ui/Toast'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Pill status={status}>{PROJECT_STATUS_LABELS[status]}</Pill>
}

/** Amounts of the list are rounded to the euro: « 12 800 € ». */
export function euro0(cents: number): string {
  return `${Math.round(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`
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
    {
      key: 'name',
      header: 'Projet',
      render: (p) => (
        <>
          <div className="font-medium">{p.name}</div>
          <div className="font-mono text-xs text-ink-3">{p.code}</div>
        </>
      ),
    },
    { key: 'client', header: 'Client', className: 'text-ink-2', render: (p) => clientName(p.clientId) },
    { key: 'status', header: 'Statut', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'due', header: 'Échéance', className: 'text-ink-2', render: (p) => p.dueOn ?? '—' },
    { key: 'budget', header: 'Budget HT', className: 'text-right tabular-nums', render: (p) => (p.budgetCents === null ? '—' : euro0(p.budgetCents)) },
    {
      key: 'specified',
      header: 'Prescrit HT',
      className: 'text-right tabular-nums',
      render: (p) => {
        const over = p.budgetCents !== null && p.specifiedCents > p.budgetCents
        const pct = p.budgetCents ? Math.min(100, (p.specifiedCents / p.budgetCents) * 100) : 0
        return (
          <div className="inline-flex flex-col items-end gap-1">
            <span className={over ? 'text-danger' : ''}>{euro0(p.specifiedCents)}</span>
            <span className="block h-[3px] w-24 overflow-hidden rounded-full bg-track" aria-hidden="true">
              <span className={`block h-full ${over ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </span>
          </div>
        )
      },
    },
    { key: 'items', header: 'Articles', className: 'text-right tabular-nums', render: (p) => String(p.itemCount) },
  ]

  return (
    <section>
      <PageHeader
        title="Projets"
        subtitle={projects.data ? `${projects.data.length} projet${projects.data.length > 1 ? 's' : ''}` : undefined}
        actions={
          <Link to="/projects/new">
            <Button variant="primary">Nouveau projet</Button>
          </Link>
        }
      />
      <ListToolbar
        filters={
          <Segmented
            label="Statut"
            value={status ?? 'all'}
            onChange={(value) => setStatus(value === 'all' ? null : (value as ProjectStatus))}
            options={[
              { value: 'all', label: 'Tous' },
              ...(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] })),
            ]}
          />
        }
      />
      <TableCard
        label="Projets"
        caption="Liste des projets"
        columns={columns}
        rows={projects.data}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/projects/${p.id}`)}
        loading={projects.isPending}
        error={projects.isError ? { title: 'Impossible de charger les projets', message: projects.error.message } : null}
        empty={status ? 'Aucun projet dans cet état.' : 'Aucun projet. Créer le premier avec « Nouveau projet ».'}
      />
    </section>
  )
}
