// « Budget » tab: Budget / Prescrit / Validé / Reste by zone (D8.3 default) or by category,
// gap bar with 90 % / 100 % alerts (D8.4), inline editing of the envelopes (PUT in bulk), alerts, print.
import { useEffect, useState } from 'react'
import { isApiError } from '../../api/errors'
import { useBudgetLines, usePutBudgetLines, useProjectAlerts, type BudgetLineIn, type BudgetRowRead } from '../../api/queries/budget'
import { useProjectSummary } from '../../api/queries/projectItem'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

type View = 'zone' | 'category'
const ALERT_CLASSES = { none: 'bg-green-500', warning: 'bg-amber-500', over: 'bg-red-600' } as const
const ALERT_LABELS = { none: '', warning: '≥ 90 %', over: '≥ 100 %' } as const

function GapBar({ row }: { row: Pick<BudgetRowRead, 'budgetCents' | 'specifiedCents' | 'alert'> }) {
  if (row.budgetCents === null || row.budgetCents === 0) return <span className="text-xs text-neutral-400">—</span>
  const pct = Math.min(100, Math.round((row.specifiedCents / row.budgetCents) * 100))
  return (
    <div className="flex items-center gap-2" title={`${pct} % du budget`}>
      <div className="h-2 w-24 overflow-hidden rounded bg-neutral-200">
        <div className={`h-2 ${ALERT_CLASSES[row.alert]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs ${row.alert === 'over' ? 'font-semibold text-red-700' : row.alert === 'warning' ? 'text-amber-700' : 'text-neutral-500'}`}>
        {pct} % {ALERT_LABELS[row.alert]}
      </span>
    </div>
  )
}

export function BudgetTab({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const summary = useProjectSummary(projectId)
  const lines = useBudgetLines(projectId)
  const alerts = useProjectAlerts(projectId)
  const put = usePutBudgetLines()
  const toast = useToast()
  const [view, setView] = useState<View>('zone')
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const budget = summary.data?.budget ?? null
  const rows = view === 'zone' ? (budget?.byZone ?? []) : (budget?.byCategory ?? [])
  const key = (zoneId: number | null, categoryId: number | null) => `${zoneId ?? 'none'}:${categoryId ?? 'none'}`

  useEffect(() => {
    if (!editing) return
    const initial: Record<string, string> = {}
    for (const line of lines.data ?? []) initial[key(line.zoneId, line.categoryId)] = centsToText(line.amountCents)
    setDrafts(initial)
  }, [editing, lines.data])

  async function save() {
    setError(null)
    const payload: BudgetLineIn[] = []
    for (const [k, text] of Object.entries(drafts)) {
      const cents = textToCents(text)
      if (cents === undefined) return setError(`Montant invalide : « ${text} ».`)
      if (cents === null) continue
      const [z, c] = k.split(':')
      payload.push({ zoneId: z === 'none' ? null : Number(z), categoryId: c === 'none' ? null : Number(c), amountCents: cents, notes: null })
    }
    try {
      await put.mutateAsync({ projectId, lines: payload })
      toast.show({ kind: 'success', message: 'Budgets enregistrés.' })
      setEditing(false)
    } catch (e) {
      setError(isApiError(e) ? (e.details[0]?.message ?? e.message) : String(e))
    }
  }

  if (summary.isPending || lines.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (summary.isError) return <EmptyState title="Impossible de charger le budget">{summary.error.message}</EmptyState>
  if (!budget) return <EmptyState title="Pas de synthèse budgétaire." />

  const input = (zoneId: number | null, categoryId: number | null) => {
    const k = key(zoneId, categoryId)
    return (
      <input
        aria-label={`Budget ${zoneId !== null ? 'zone ' + zoneId : categoryId !== null ? 'catégorie ' + categoryId : 'du projet'}`}
        value={drafts[k] ?? ''}
        onChange={(event) => setDrafts({ ...drafts, [k]: event.target.value })}
        className="w-28 rounded border border-neutral-300 px-2 py-0.5 text-right text-sm"
        inputMode="decimal"
      />
    )
  }

  return (
    <section className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          Vue
          <select
            value={view}
            onChange={(event) => setView(event.target.value as View)}
            className="rounded border border-neutral-300 bg-white px-2 py-1"
            aria-label="Vue du budget"
          >
            <option value="zone">par zone</option>
            <option value="category">par catégorie</option>
          </select>
        </label>
        {!readOnly && !editing && <Button onClick={() => setEditing(true)}>Modifier les budgets</Button>}
        {editing && (
          <>
            <Button variant="primary" onClick={() => void save()} disabled={put.isPending}>
              Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={() => window.print()}>
          Imprimer
        </Button>
        {error && (
          <span role="alert" className="text-red-700">
            {error}
          </span>
        )}
      </div>

      <table className="w-full max-w-4xl text-sm" aria-label="Budget global">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-500">
            <th className="px-2 py-1">Projet</th>
            <th className="px-2 py-1 text-right">Budget HT EUR</th>
            <th className="px-2 py-1 text-right">Contingence ({budget.contingencyBp / 100} %) HT EUR</th>
            <th className="px-2 py-1 text-right">Prescrit HT EUR</th>
            <th className="px-2 py-1 text-right">Validé HT EUR</th>
            <th className="px-2 py-1 text-right">Engagé HT EUR</th>
            <th className="px-2 py-1 text-right">Reste HT EUR</th>
            <th className="px-2 py-1">Écart</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-medium">
            <td className="px-2 py-1">Global</td>
            <td className="px-2 py-1 text-right">{editing ? input(null, null) : budget.globalCents === null ? '—' : centsToText(budget.globalCents)}</td>
            <td className="px-2 py-1 text-right">{centsToText(budget.contingencyCents)}</td>
            <td className="px-2 py-1 text-right">{centsToText(budget.specifiedCents)}</td>
            <td className="px-2 py-1 text-right">{centsToText(budget.approvedCents)}</td>
            <td className="px-2 py-1 text-right">{centsToText(budget.engagedCents)}</td>
            <td className={`px-2 py-1 text-right ${budget.remainingCents !== null && budget.remainingCents < 0 ? 'text-red-700' : ''}`}>
              {budget.remainingCents === null ? '—' : centsToText(budget.remainingCents)}
            </td>
            <td className="px-2 py-1">
              <GapBar row={{ budgetCents: budget.globalCents, specifiedCents: budget.specifiedCents, alert: budget.alert }} />
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full max-w-5xl text-sm" aria-label={view === 'zone' ? 'Budget par zone' : 'Budget par catégorie'}>
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-500">
            <th className="px-2 py-1">{view === 'zone' ? 'Zone' : 'Catégorie'}</th>
            {view === 'zone' && <th className="px-2 py-1 text-right">×</th>}
            <th className="px-2 py-1 text-right">Budget HT EUR</th>
            {view === 'zone' && <th className="px-2 py-1 text-right">Par clé HT EUR</th>}
            <th className="px-2 py-1 text-right">Prescrit HT EUR</th>
            <th className="px-2 py-1 text-right">Validé HT EUR</th>
            <th className="px-2 py-1 text-right">Engagé HT EUR</th>
            <th className="px-2 py-1 text-right">Reste HT EUR</th>
            <th className="px-2 py-1">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-2 py-2 text-neutral-400">
                Aucune ligne.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={`${row.zoneId ?? 'n'}-${row.categoryId ?? 'n'}`} className="border-b border-neutral-200">
              <td className="px-2 py-1">{row.label}</td>
              {view === 'zone' && <td className="px-2 py-1 text-right">{row.multiplier}</td>}
              <td className="px-2 py-1 text-right">
                {editing ? input(row.zoneId, row.categoryId) : row.budgetCents === null ? '—' : centsToText(row.budgetCents)}
              </td>
              {view === 'zone' && (
                <td className="px-2 py-1 text-right text-neutral-500">
                  {row.budgetCents === null || row.multiplier <= 1 ? '' : centsToText(Math.trunc(row.budgetCents / row.multiplier))}
                </td>
              )}
              <td className="px-2 py-1 text-right">{centsToText(row.specifiedCents)}</td>
              <td className="px-2 py-1 text-right">{centsToText(row.approvedCents)}</td>
              <td className="px-2 py-1 text-right">{centsToText(row.engagedCents)}</td>
              <td className={`px-2 py-1 text-right ${row.remainingCents !== null && row.remainingCents < 0 ? 'text-red-700' : ''}`}>
                {row.remainingCents === null ? '—' : centsToText(row.remainingCents)}
              </td>
              <td className="px-2 py-1">
                <GapBar row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {view === 'zone' && (
        <p className="text-xs text-neutral-500">
          Validé par zone : approximation au prix courant des placements (D2.14) ; le Validé exact est celui du projet.
        </p>
      )}

      {alerts.data && alerts.data.length > 0 && (
        <section className="max-w-4xl rounded border border-amber-300 bg-amber-50 p-3 text-sm" aria-label="Alertes">
          <h3 className="mb-1 font-semibold text-amber-900">Alertes</h3>
          <ul className="list-disc pl-5">
            {alerts.data.map((a, index) => (
              <li key={index} className={a.kind === 'budget_100' ? 'text-red-800' : ''}>
                {a.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
