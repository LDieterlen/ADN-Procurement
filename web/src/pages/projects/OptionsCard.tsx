// The options of a base article (ADR-0021).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ITEM_STATUS_LABELS, type ProjectItemRead } from '../../api/queries/projectItem'
import { centsToText } from '../../components/forms/MoneyField'
import { Thumb } from '../../components/Thumb'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { CandidatePicker } from './CandidatePicker'

/** The options of a base article (ADR-0021): list, « + Nouvelle option » (creation page) or an
 * existing article of the project attached as an option, pending until « Enregistrer ». */
export function OptionsCard({
  item,
  options,
  pending,
  onPendingChange,
  candidates,
  amountOf,
  supplierName,
  readOnly,
}: {
  item: ProjectItemRead
  options: ProjectItemRead[]
  pending: ProjectItemRead[]
  onPendingChange: (ids: number[]) => void
  candidates: ProjectItemRead[]
  amountOf: (id: number) => number | undefined
  supplierName: (id: number | null) => string
  readOnly: boolean
}) {
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState('')
  return (
    <Card
      title="Options"
      label="Options"
      padding="table"
      meta={options.length ? `${options.length} option${options.length > 1 ? 's' : ''} · montants indicatifs, hors totaux` : undefined}
      actions={
        !readOnly && (
          <Link to={`/projects/${item.projectId}/items/new?optionOf=${item.id}`}>
            <Button variant="secondary" size="sm">
              + Nouvelle option
            </Button>
          </Link>
        )
      }
    >
      {options.length === 0 && pending.length === 0 ? (
        <p className="px-5 py-4 text-sm text-ink-3">Aucune option : proposer une alternative à cet article.</p>
      ) : (
        <table className="w-full text-sm" aria-label="Options de l'article">
          <tbody>
            {options.map((option) => {
              const amount = amountOf(option.id)
              return (
                <tr
                  key={option.id}
                  onClick={() => navigate(`/projects/${item.projectId}/items/${option.id}`)}
                  className="cursor-pointer border-b border-line-soft hover:bg-sunken"
                >
                  <td className="w-14 py-2 pl-5">
                    <Thumb files={option.files} alt={`Photo ${option.name}`} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium whitespace-nowrap">{option.itemCode}</td>
                  <td className="px-3 py-2.5 font-medium">{option.name}</td>
                  <td className="px-3 py-2.5 text-right text-ink-2 tabular-nums">{amount !== undefined ? `(${centsToText(amount)} €)` : ''}</td>
                  <td className="py-2.5 pr-5 pl-3 text-right">
                    <Pill status={option.status}>{ITEM_STATUS_LABELS[option.status]}</Pill>
                  </td>
                </tr>
              )
            })}
            {pending.map((row) => (
              <tr key={`pending-${row.id}`} className="border-b border-line-soft bg-warn-soft/40">
                <td className="w-14 py-2 pl-5">
                  <Thumb files={row.files} alt={`Photo ${row.name}`} />
                </td>
                <td className="px-3 py-2.5 text-xs text-warn">à enregistrer</td>
                <td className="px-3 py-2.5 font-medium">{row.name}</td>
                <td className="px-3 py-2.5 text-right text-ink-3 text-[12.5px]">devient une option</td>
                <td className="py-2.5 pr-5 pl-3 text-right">
                  <button
                    type="button"
                    className="text-[13px] text-danger hover:underline"
                    aria-label={`Ne pas rattacher ${row.name}`}
                    onClick={() => onPendingChange(pending.filter((o) => o.id !== row.id).map((o) => o.id))}
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!readOnly && candidates.length > 0 && (
        <div className="flex items-end gap-3 border-t border-line bg-sunken px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[12.5px] font-medium text-ink-2">Article existant du même type à rattacher</div>
            <CandidatePicker candidates={candidates} value={candidate} onChange={setCandidate} supplierName={supplierName} />
          </div>
          <Button
            size="sm"
            disabled={!candidate}
            onClick={() => {
              onPendingChange([...pending.map((o) => o.id), Number(candidate)])
              setCandidate('')
            }}
          >
            Rattacher comme option
          </Button>
        </div>
      )}
    </Card>
  )
}
