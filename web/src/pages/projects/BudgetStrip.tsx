// Budget · Prescrit · Devisé · Validé · Reste, always visible under the project header (ADR-0012/0013).
// Every figure comes from the server summary; the strip refreshes by itself because article
// mutations invalidate it. The global budget is editable in place (the other envelopes are kept).
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { toBudgetLineIn, useBudgetLines, useProjectSummary, usePutBudgetLines } from '../../api/queries/budget'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'

export function BudgetStrip({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const summary = useProjectSummary(projectId)
  const lines = useBudgetLines(projectId)
  const put = usePutBudgetLines()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const data = summary.data
  if (!data) return null

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

  const budget = data.budgetCents ?? 0
  const share = (cents: number) => (budget > 0 ? `${Math.min(100, (cents / budget) * 100)}%` : '0%')
  const pct = budget > 0 ? Math.round((data.specifiedCents / budget) * 100) : null
  const restClass = data.remainingCents === null ? 'text-ink-3' : data.remainingCents < 0 ? 'text-danger' : data.alert === 'warning' ? 'text-warn' : 'text-ok'
  const figure = (label: string, value: string, swatch?: string, className = '') => (
    <div>
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
        {swatch && <span className={`inline-block h-2 w-2 rounded-[2px] ${swatch}`} aria-hidden="true" />}
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tracking-[-0.01em] tabular-nums ${className}`}>{value}</div>
    </div>
  )

  return (
    <section className="no-print mb-6 rounded-[10px] border border-line bg-surface px-6 py-5" aria-label="Synthèse budget">
      <div className="grid grid-cols-[repeat(5,1fr)_auto] items-start gap-6">
        <div>
          <div className="text-[12.5px] font-medium text-ink-2">Budget HT</div>
          {editing ? (
            <span className="mt-1 inline-flex items-center gap-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="control control-sm w-32 text-right"
                inputMode="decimal"
                aria-label="Budget global"
                autoFocus
              />
              <Button variant="primary" size="xs" onClick={() => void save()} disabled={put.isPending}>
                OK
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </span>
          ) : (
            <button
              type="button"
              className={`mt-1 text-xl font-semibold tracking-[-0.01em] tabular-nums ${readOnly ? '' : 'underline decoration-line-strong decoration-dotted underline-offset-4'}`}
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
        {figure('Prescrit HT', `${centsToText(data.specifiedCents)} €`, 'bg-bar-spec')}
        {figure('Devisé HT', `${centsToText(data.quotedCents)} €`, 'bg-bar-quoted')}
        {figure('Validé HT', `${centsToText(data.approvedCents)} €`, 'bg-accent')}
        {figure('Reste', data.remainingCents === null ? '—' : `${centsToText(data.remainingCents)} €`, undefined, restClass)}
        <Link to={`/projects/${projectId}/budget`} className="self-center text-sm font-medium text-accent hover:text-accent-hover">
          Budget détaillé →
        </Link>
      </div>
      <div className="relative mt-4 h-2 overflow-hidden rounded-[4px] bg-track" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 bg-bar-spec" style={{ width: share(data.specifiedCents) }} />
        <div className="absolute inset-y-0 left-0 bg-bar-quoted" style={{ width: share(data.quotedCents) }} />
        <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: share(data.approvedCents) }} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[12.5px] text-ink-3">
        {pct !== null ? (
          <span className={data.alert === 'over' ? 'font-medium text-danger' : data.alert === 'warning' ? 'text-warn' : ''}>{pct}% du budget prescrit</span>
        ) : (
          <span>Définir le budget pour suivre la part prescrite.</span>
        )}
        {error && (
          <span role="alert" className="text-danger">
            {error}
          </span>
        )}
      </div>
    </section>
  )
}
