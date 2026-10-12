// Budget · Prescrit · Reste, always visible under the project header (ADR-0012). Every figure comes
// from the server summary; the strip refreshes by itself because line mutations invalidate it.
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { usePutBudgetLines } from '../../api/queries/budget'
import { useProjectSummary } from '../../api/queries/projectItem'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Button } from '../../components/ui/Button'

const ALERT_BAR = { none: 'bg-green-500', warning: 'bg-amber-500', over: 'bg-red-600' } as const

export function BudgetStrip({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const summary = useProjectSummary(projectId)
  const put = usePutBudgetLines()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const budget = summary.data?.budget
  if (!budget) return null
  const pct = budget.globalCents ? Math.min(100, Math.round((budget.specifiedCents / budget.globalCents) * 100)) : 0

  async function save() {
    const cents = textToCents(text)
    if (cents === undefined || cents === null) return setError('Montant invalide.')
    try {
      await put.mutateAsync({ projectId, lines: [{ zoneId: null, categoryId: null, amountCents: cents, notes: null }] })
      setEditing(false)
      setError(null)
    } catch (e) {
      setError(isApiError(e) ? e.message : String(e))
    }
  }

  return (
    <section className="no-print flex flex-wrap items-center gap-6 rounded border border-neutral-200 bg-white px-4 py-2 text-sm" aria-label="Synthèse budget">
      <div>
        <span className="text-neutral-500">Budget HT</span>{' '}
        {editing ? (
          <span className="inline-flex items-center gap-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-28 rounded border border-neutral-300 px-2 py-0.5 text-right"
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
            className={`font-semibold ${readOnly ? '' : 'underline decoration-dotted'}`}
            disabled={readOnly}
            onClick={() => {
              setText(budget.globalCents === null ? '' : centsToText(budget.globalCents))
              setEditing(true)
            }}
            aria-label="Modifier le budget global"
          >
            {budget.globalCents === null ? 'à définir' : `${centsToText(budget.globalCents)} €`}
          </button>
        )}
      </div>
      <div>
        <span className="text-neutral-500">Prescrit HT</span> <span className="font-semibold">{centsToText(budget.specifiedCents)} €</span>
      </div>
      <div>
        <span className="text-neutral-500">Reste</span>{' '}
        <span className={`font-semibold ${budget.remainingCents !== null && budget.remainingCents < 0 ? 'text-red-700' : ''}`}>
          {budget.remainingCents === null ? '—' : `${centsToText(budget.remainingCents)} €`}
        </span>
      </div>
      {budget.globalCents ? (
        <div className="flex items-center gap-2" title={`${pct} % du budget`}>
          <div className="h-2 w-32 overflow-hidden rounded bg-neutral-200">
            <div className={`h-2 ${ALERT_BAR[budget.alert]}`} style={{ width: `${pct}%` }} />
          </div>
          <span
            className={`text-xs ${budget.alert === 'over' ? 'font-semibold text-red-700' : budget.alert === 'warning' ? 'text-amber-700' : 'text-neutral-500'}`}
          >
            {pct} %
          </span>
        </div>
      ) : null}
      {error && (
        <span role="alert" className="text-red-700">
          {error}
        </span>
      )}
    </section>
  )
}
