// Budget page (ADR-0013, 12c): shares by status, compilation by axis with the forecast envelopes
// editable in place, forecast / quoted / approved comparison, filters. Every figure comes from the
// server summary; the page never adds anything up.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { isApiError } from '../../api/errors'
import {
  AXIS_LABELS,
  NO_SUMMARY_FILTERS,
  toBudgetLineIn,
  useBudgetLines,
  useProjectSummary,
  usePutBudgetLines,
  type BudgetLineIn,
  type SummaryAxis,
  type SummaryFilters,
  type SummaryRowRead,
} from '../../api/queries/budget'
import { CLOSED_STATUSES, useLocations, useProject } from '../../api/queries/project'
import { ITEM_FAMILY_LABELS, ITEM_STATUS_LABELS, type ItemFamily, type ItemStatus } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { bpToText } from '../../components/forms/BpField'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { BudgetStrip } from './BudgetStrip'

const AXES: SummaryAxis[] = ['location', 'zone', 'family', 'type', 'supplier']
const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }
const ALERT_TEXT = { none: '', warning: 'text-amber-700', over: 'font-semibold text-red-700' } as const

export function BudgetPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const project = useProject(id)
  const [axis, setAxis] = useState<SummaryAxis>('zone')
  const [filters, setFilters] = useState<SummaryFilters>(NO_SUMMARY_FILTERS)
  const summary = useProjectSummary(id, filters)
  const lines = useBudgetLines(id)
  const locations = useLocations(id, true)
  const suppliers = useSuppliers(ALL)
  const put = usePutBudgetLines()
  const toast = useToast()

  if (project.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (project.isError) {
    return (
      <EmptyState title={project.error.message}>
        <Link to="/projects" className="underline">
          Retour à la liste
        </Link>
      </EmptyState>
    )
  }
  const p = project.data
  const readOnly = CLOSED_STATUSES.includes(p.status)
  const rows: SummaryRowRead[] = summary.data
    ? {
        location: summary.data.byLocation,
        zone: summary.data.byZone,
        family: summary.data.byFamily,
        type: summary.data.byType,
        supplier: summary.data.bySupplier,
      }[axis]
    : []
  const zones = [...new Set((locations.data ?? []).map((l) => l.zone).filter((z): z is string => Boolean(z)))]
  const filtered = Object.values(filters).some((v) => v !== null)

  async function setEnvelope(row: SummaryRowRead, text: string) {
    const cents = textToCents(text)
    if (cents === undefined) return toast.show({ kind: 'error', message: 'Montant invalide.' })
    const scope = axis as Exclude<SummaryAxis, 'type'>
    const matches = (l: BudgetLineIn) =>
      l.scope === scope &&
      (scope === 'location'
        ? String(l.locationId) === row.key
        : scope === 'zone'
          ? l.zone === row.key
          : scope === 'family'
            ? l.family === row.key
            : String(l.supplierId) === row.key)
    const others = (lines.data ?? []).map(toBudgetLineIn).filter((l) => !matches(l))
    const mine: BudgetLineIn[] =
      cents === null
        ? []
        : [
            {
              scope,
              locationId: scope === 'location' ? Number(row.key) : null,
              zone: scope === 'zone' ? row.key : null,
              family: scope === 'family' ? row.key : null,
              supplierId: scope === 'supplier' ? Number(row.key) : null,
              amountCents: cents,
            },
          ]
    try {
      await put.mutateAsync({ projectId: id, lines: [...others, ...mine] })
    } catch (error) {
      toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
    }
  }

  const canEdit = !readOnly && axis !== 'type' && !filtered && !(axis === 'zone' && false)
  const editableKey = (row: SummaryRowRead) => row.key !== '' && row.key !== 'fee'

  return (
    <section>
      <PageHeader
        title="Budget"
        crumbs={
          <>
            <Link to="/projects" className="hover:underline">
              Projets
            </Link>
            {' / '}
            <Link to={`/projects/${p.id}`} className="hover:underline">
              {p.name}
            </Link>
          </>
        }
        subtitle="Prévisionnel, prescrit, devisé et validé, en euros HT, calculés par le serveur"
        actions={
          <Link to={`/projects/${p.id}`}>
            <Button variant="ghost">Retour au projet</Button>
          </Link>
        }
      />
      <BudgetStrip projectId={p.id} readOnly={readOnly} />
      <div className="space-y-6">
        <Card title="Répartition par état" label="Répartition par état">
          {summary.data && (
            <table className="w-full text-sm" aria-label="Répartition par état">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-900">
                  <th className="px-2 py-2 font-medium">État</th>
                  <th className="px-2 py-2 text-right font-medium">Articles</th>
                  <th className="px-2 py-2 text-right font-medium">Montant HT</th>
                  <th className="px-2 py-2 font-medium">Part</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.byStatus.map((row) => (
                  <tr key={row.status} className="border-b border-neutral-200">
                    <td className="px-2 py-2">{ITEM_STATUS_LABELS[row.status as ItemStatus] ?? row.status}</td>
                    <td className="px-2 py-2 text-right">{row.count}</td>
                    <td className="px-2 py-2 text-right">{centsToText(row.amountCents)} €</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-48 overflow-hidden rounded-full bg-neutral-200">
                          <div className="h-2 bg-neutral-900" style={{ width: `${Math.min(100, row.shareBp / 100)}%` }} />
                        </div>
                        <span className="w-14 text-right text-xs text-neutral-600">{bpToText(row.shareBp)} %</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card
          title="Compilation"
          label="Compilation"
          actions={
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1 text-neutral-600">
                Par
                <select
                  value={axis}
                  onChange={(e) => setAxis(e.target.value as SummaryAxis)}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5"
                  aria-label="Axe de compilation"
                >
                  {AXES.map((a) => (
                    <option key={a} value={a}>
                      {AXIS_LABELS[a]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-neutral-600">
                Zone
                <select
                  value={filters.zone ?? ''}
                  onChange={(e) => setFilters({ ...filters, zone: e.target.value || null })}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5"
                  aria-label="Filtrer par zone"
                >
                  <option value="">Toutes</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-neutral-600">
                Fournisseur
                <select
                  value={filters.supplierId ?? ''}
                  onChange={(e) => setFilters({ ...filters, supplierId: e.target.value ? Number(e.target.value) : null })}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5"
                  aria-label="Filtrer par fournisseur"
                >
                  <option value="">Tous</option>
                  {(suppliers.data?.items ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-neutral-600">
                Famille
                <select
                  value={filters.family ?? ''}
                  onChange={(e) => setFilters({ ...filters, family: e.target.value || null })}
                  className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5"
                  aria-label="Filtrer par famille"
                >
                  <option value="">Toutes</option>
                  {(Object.keys(ITEM_FAMILY_LABELS) as ItemFamily[]).map((f) => (
                    <option key={f} value={f}>
                      {ITEM_FAMILY_LABELS[f]}
                    </option>
                  ))}
                </select>
              </label>
              {filtered && (
                <Button variant="ghost" onClick={() => setFilters(NO_SUMMARY_FILTERS)}>
                  Effacer les filtres
                </Button>
              )}
            </div>
          }
        >
          {filtered && (
            <p className="mb-2 text-xs text-neutral-500">
              Filtres actifs : les montants sont restreints aux articles et implantations qui correspondent ; le prévisionnel ne s'édite pas sous filtre.
            </p>
          )}
          <table className="w-full text-sm" aria-label={`Compilation par ${AXIS_LABELS[axis].toLowerCase()}`}>
            <thead>
              <tr className="border-b border-neutral-300 text-left text-neutral-900">
                <th className="px-2 py-2 font-medium">{AXIS_LABELS[axis]}</th>
                <th className="px-2 py-2 text-right font-medium">Prévisionnel HT</th>
                <th className="px-2 py-2 text-right font-medium">Prescrit HT</th>
                <th className="px-2 py-2 text-right font-medium">Devisé HT</th>
                <th className="px-2 py-2 text-right font-medium">Validé HT</th>
                <th className="px-2 py-2 text-right font-medium">Reste</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-neutral-500">
                    Rien à compiler.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-neutral-200">
                  <td className="px-2 py-2 font-medium">{row.label}</td>
                  <td className="px-2 py-2 text-right">
                    {canEdit && editableKey(row) ? (
                      <input
                        key={`${axis}-${row.key}-${row.budgetCents ?? 'none'}`}
                        defaultValue={row.budgetCents === null ? '' : centsToText(row.budgetCents)}
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={`Prévisionnel ${row.label}`}
                        className="w-32 rounded-lg border border-neutral-300 px-2 py-1 text-right text-sm"
                        onBlur={(event) => {
                          const cents = textToCents(event.target.value)
                          if (cents !== undefined && cents !== (row.budgetCents ?? null)) void setEnvelope(row, event.target.value)
                        }}
                      />
                    ) : row.budgetCents === null ? (
                      '—'
                    ) : (
                      `${centsToText(row.budgetCents)} €`
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">{centsToText(row.specifiedCents)} €</td>
                  <td className="px-2 py-2 text-right">{centsToText(row.quotedCents)} €</td>
                  <td className="px-2 py-2 text-right">{centsToText(row.approvedCents)} €</td>
                  <td className={`px-2 py-2 text-right ${ALERT_TEXT[row.alert]}`}>
                    {row.remainingCents === null ? '—' : `${centsToText(row.remainingCents)} €`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  )
}
