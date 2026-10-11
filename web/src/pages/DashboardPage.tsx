// Home: open projects with Budget / Prescrit / Validé / Reste, alert level and counters (GET /dashboard).
import { Link, useNavigate } from 'react-router'
import { useDashboard, type DashboardProjectRead } from '../api/queries/budget'
import { PROJECT_STATUS_LABELS } from '../api/queries/project'
import { centsToText } from '../components/forms/MoneyField'
import { DataTable, type Column } from '../components/tables/DataTable'
import { EmptyState } from '../components/ui/EmptyState'

const ALERT_BADGE = {
  none: null,
  warning: <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">≥ 90 %</span>,
  over: <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">dépassé</span>,
} as const

const COLUMNS: Column<DashboardProjectRead>[] = [
  { key: 'code', header: 'Code', render: (p) => <span className="font-mono text-xs">{p.code}</span> },
  { key: 'name', header: 'Projet', render: (p) => <span className="font-medium">{p.name}</span> },
  { key: 'client', header: 'Client', render: (p) => p.clientName },
  { key: 'status', header: 'Statut', render: (p) => PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] ?? p.status },
  { key: 'due', header: 'Échéance', render: (p) => p.dueOn ?? '' },
  { key: 'budget', header: 'Budget HT €', className: 'text-right', render: (p) => (p.budgetCents === null ? '—' : centsToText(p.budgetCents)) },
  { key: 'specified', header: 'Prescrit HT €', className: 'text-right', render: (p) => centsToText(p.specifiedCents) },
  { key: 'approved', header: 'Validé HT €', className: 'text-right', render: (p) => centsToText(p.approvedCents) },
  {
    key: 'remaining',
    header: 'Reste HT €',
    className: 'text-right',
    render: (p) => (p.remainingCents === null ? '—' : <span className={p.remainingCents < 0 ? 'text-red-700' : ''}>{centsToText(p.remainingCents)}</span>),
  },
  { key: 'alert', header: '', render: (p) => ALERT_BADGE[p.alert] },
  {
    key: 'counters',
    header: 'À traiter',
    render: (p) => (
      <span className="flex gap-2 text-xs text-neutral-600">
        {p.draftLines > 0 && <span>{p.draftLines} brouillon(s)</span>}
        {p.onHoldLines > 0 && <span>{p.onHoldLines} en attente</span>}
        {p.overdueLines > 0 && <span className="text-amber-800">{p.overdueLines} à commander</span>}
      </span>
    ),
  },
]

export function DashboardPage() {
  const dashboard = useDashboard()
  const navigate = useNavigate()
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      {dashboard.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {dashboard.isError && (
        <EmptyState title="Impossible de charger le tableau de bord">
          {dashboard.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {dashboard.data && (
        <DataTable
          caption="Projets en cours"
          columns={COLUMNS}
          rows={dashboard.data}
          rowKey={(p) => p.projectId}
          onRowClick={(p) => navigate(`/projects/${p.projectId}`)}
          empty={
            <EmptyState title="Aucun projet en cours.">
              <Link to="/projects/new" className="underline">
                Créer un projet
              </Link>
            </EmptyState>
          }
        />
      )}
    </section>
  )
}
