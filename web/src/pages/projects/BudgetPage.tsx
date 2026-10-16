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
import { useChoiceLabels } from '../../api/queries/choice'
import { ITEM_STATUS_LABELS, type ItemStatus } from '../../api/queries/projectItem'
import { useSuppliers } from '../../api/queries/supplier'
import { bpToText } from '../../components/forms/BpField'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Button, buttonClass } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { pillStyle } from '../../components/ui/Pill'
import { Segmented } from '../../components/ui/Segmented'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { BudgetStrip } from './BudgetStrip'

const AXES: SummaryAxis[] = ['location', 'zone', 'family', 'type', 'supplier']
const ALL = { q: '', includeArchived: true, limit: 1000, offset: 0 } // every supplier, archived ones too: names of existing articles
const ALERT_TEXT = { none: 'font-medium text-ok', warning: 'font-medium text-warn', over: 'font-medium text-danger' } as const

export function BudgetPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const project = useProject(id)
  const families = useChoiceLabels('family')
  const [axis, setAxis] = useState<SummaryAxis>('zone')
  const [filters, setFilters] = useState<SummaryFilters>(NO_SUMMARY_FILTERS)
  const summary = useProjectSummary(id, filters)
  const lines = useBudgetLines(id)
  const locations = useLocations(id, true)
  const suppliers = useSuppliers(ALL)
  const put = usePutBudgetLines()
  const toast = useToast()

  if (project.isPending) return <p className="text-sm text-ink-3">Chargement…</p>
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
          <Link to={`/projects/${p.id}`} className={buttonClass('ghost')}>
            Retour au projet
          </Link>
        }
      />
      <BudgetStrip projectId={p.id} readOnly={readOnly} />
      <div className="space-y-6">
        <Card title="Répartition par état" label="Répartition par état">
          {summary.data &&
            (() => {
              const data = summary.data
              const rows = data.byStatus.filter((r) => r.status !== 'cancelled')
              return (
                <>
                  <div className="flex h-7 gap-0.5 overflow-hidden rounded-[5px]" aria-hidden="true">
                    {rows.map((r) => (
                      <div
                        key={r.status}
                        style={{
                          ...pillStyle(r.status as ItemStatus),
                          flex: `${Math.max(r.shareBp, 100)} 1 0%` /* the server's share; 1 % minimum to stay visible */,
                          boxShadow: 'none',
                        }}
                        title={ITEM_STATUS_LABELS[r.status as ItemStatus] ?? r.status}
                      />
                    ))}
                  </div>
                  <ul className="mt-4 grid grid-cols-6 gap-4" aria-label="Parts par état">
                    {rows.map((row) => (
                      <li key={row.status}>
                        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                          <span
                            className="inline-block h-2 w-2 rounded-[2px]"
                            style={{ background: pillStyle(row.status as ItemStatus).background as string, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }}
                            aria-hidden="true"
                          />
                          {`${ITEM_STATUS_LABELS[row.status as ItemStatus] ?? row.status} · ${row.count}`}
                        </div>
                        <div className="mt-1 text-base font-semibold tabular-nums">{centsToText(row.amountCents)} €</div>
                        <div className="text-[12.5px] text-ink-3">{bpToText(row.shareBp)} %</div>
                      </li>
                    ))}
                  </ul>
                </>
              )
            })()}
        </Card>
        <Card
          title="Compilation"
          label="Compilation"
          actions={
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Segmented
                label="Axe de compilation"
                value={axis}
                onChange={(value) => setAxis(value)}
                options={AXES.map((a) => ({ value: a, label: AXIS_LABELS[a] }))}
              />
              <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
                Zone
                <select
                  value={filters.zone ?? ''}
                  onChange={(e) => setFilters({ ...filters, zone: e.target.value || null })}
                  className="control control-sm"
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
              <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
                Fournisseur
                <select
                  value={filters.supplierId ?? ''}
                  onChange={(e) => setFilters({ ...filters, supplierId: e.target.value ? Number(e.target.value) : null })}
                  className="control control-sm"
                  aria-label="Filtrer par fournisseur"
                >
                  <option value="">Tous</option>
                  {(suppliers.data?.items ?? [])
                    .filter((s) => s.archivedAt === null)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
                Famille
                <select
                  value={filters.family ?? ''}
                  onChange={(e) => setFilters({ ...filters, family: e.target.value || null })}
                  className="control control-sm"
                  aria-label="Filtrer par famille"
                >
                  <option value="">Toutes</option>
                  {families.options.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
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
            <p className="mb-2 text-[12.5px] text-ink-3">
              Filtres actifs : les montants sont restreints aux articles et implantations qui correspondent ; le prévisionnel ne s'édite pas sous filtre.
            </p>
          )}
          <table className="w-full text-sm" aria-label={`Compilation par ${AXIS_LABELS[axis].toLowerCase()}`}>
            <thead>
              <tr className="border-b border-line text-left text-[12.5px] font-medium text-ink-2">
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
                  <td colSpan={6} className="px-2 py-3 text-ink-3">
                    Rien à compiler.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-line-soft">
                  <td className="px-2 py-2 font-medium">{row.label}</td>
                  <td className="px-2 py-2 text-right">
                    {canEdit && editableKey(row) ? (
                      <input
                        key={`${axis}-${row.key}-${row.budgetCents ?? 'none'}`}
                        defaultValue={row.budgetCents === null ? '' : centsToText(row.budgetCents)}
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={`Prévisionnel ${row.label}`}
                        className="control control-sm w-[130px] text-right tabular-nums"
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
