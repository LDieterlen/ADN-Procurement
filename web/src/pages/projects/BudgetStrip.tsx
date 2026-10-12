// Budget · Prescrit · Devisé · Validé · Reste, always visible under the project header (ADR-0012/0013).
// Every figure comes from the server summary; the strip refreshes by itself because article
// mutations invalidate it. The global budget is editable in place (the other envelopes are kept).
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { toBudgetLineIn, useBudgetLines, useProjectSummary, usePutBudgetLines } from '../../api/queries/budget'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Button } from '../../components/ui/Button'

const ALERT_BAR = { none: 'bg-neutral-900', warning: 'bg-amber-500', over: 'bg-red-600' } as const

export function BudgetStrip({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const summary = useProjectSummary(projectId)
  const lines = useBudgetLines(projectId)
  const put = usePutBudgetLines()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const data = summary.data
  if (!data) return null
  const pct = data.budgetCents ? Math.min(100, Math.round((data.specifiedCents / data.budgetCents) * 100)) : 0

  async function save() {
    const cents = textToCents(text)
    if (cents === undefined || cents === null) return setError('Montant invalide.')
    const others = (lines.data ?? []).filter((l) => l.scope !== 'global').map(toBudgetLineIn)
    try {
      await put.mutateAsync({ projectId, lines: [{ scope: 'global', amountCents: cents }, ...others] })
      setEditing(false)
      setError(null)
    } catch (e) {
      setError(isApiError(e) ? e.message : String(e))
    }
  }

  const figure = (label: string, value: string, className = '') => (
    <div className="min-w-32">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-lg font-semibold ${className}`}>{value}</div>
    </div>
  )

  return (
    <section className="no-print mb-6 flex flex-wrap items-end gap-8 rounded-xl border border-neutral-200 bg-white px-5 py-4" aria-label="Synthèse budget">
      <div className="min-w-32">
        <div className="text-xs text-neutral-500">Budget HT</div>
        {editing ? (
          <span className="mt-1 inline-flex items-center gap-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-32 rounded-lg border border-neutral-300 px-2 py-1 text-right text-sm"
              inputMode="decimal"
              aria-label="Budget global"
              autoFocus
            />
            <Button variant="primary" onClick={() => void save()} disabled={put.isPending}>
              OK
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </span>
        ) : (
          <button
            type="button"
            className={`text-lg font-semibold ${readOnly ? '' : 'underline decoration-neutral-300 decoration-dotted underline-offset-4'}`}
            disabled={readOnly}
            onClick={() => {
              setText(data.budgetCents === null ? '' : centsToText(data.budgetCents))
              setEditing(true)
            }}
            aria-label="Modifier le budget global"
          >
            {data.budgetCents === null ? 'à définir' : `${centsToText(data.budgetCents)} €`}
          </button>
        )}
      </div>
      {figure('Prescrit HT', `${centsToText(data.specifiedCents)} €`)}
      {figure('Devisé HT', `${centsToText(data.quotedCents)} €`)}
      {figure('Validé HT', `${centsToText(data.approvedCents)} €`)}
      {figure(
        'Reste',
        data.remainingCents === null ? '—' : `${centsToText(data.remainingCents)} €`,
        data.remainingCents !== null && data.remainingCents < 0 ? 'text-red-700' : '',
      )}
      {data.budgetCents ? (
        <div className="flex items-center gap-2 self-center" title={`${pct} % du budget`}>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-neutral-200">
            <div className={`h-2 ${ALERT_BAR[data.alert]}`} style={{ width: `${pct}%` }} />
          </div>
          <span
            className={`text-xs ${data.alert === 'over' ? 'font-semibold text-red-700' : data.alert === 'warning' ? 'text-amber-700' : 'text-neutral-500'}`}
          >
            {pct} %
          </span>
        </div>
      ) : null}
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </section>
  )
}
