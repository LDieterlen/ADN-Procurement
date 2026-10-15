// Inline status change of an article (ADR-0013): free, journaled; « Annulé » asks for an optional note.
// With `onChange` (article page, 2026-10-15) the choice is a draft, saved with « Enregistrer ».
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { ITEM_STATUS_LABELS, ITEM_STATUSES, useChangeItemStatus, type ItemStatus, type ProjectItemRead } from '../../api/queries/projectItem'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { pillStyle } from '../../components/ui/Pill'
import { useToast } from '../../components/ui/Toast'

export function StatusSelect({
  item,
  readOnly,
  className = '',
  value,
  onChange,
}: {
  item: ProjectItemRead
  readOnly: boolean
  className?: string
  value?: ItemStatus
  onChange?: (status: ItemStatus, note: string | null) => void
}) {
  const status = value ?? item.status
  const change = useChangeItemStatus()
  const toast = useToast()
  const [cancelling, setCancelling] = useState(false)
  const [note, setNote] = useState('')

  async function apply(status: ItemStatus, withNote: string | null) {
    if (onChange) return onChange(status, withNote)
    try {
      await change.mutateAsync({ id: item.id, data: { status, note: withNote } })
    } catch (error) {
      toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
    }
  }

  return (
    <>
      <span className={`relative inline-flex ${className}`} onClick={(event) => event.stopPropagation()}>
        <span
          className="inline-flex h-6 items-center gap-1.5 rounded-[5px] px-[9px] text-[12.5px] font-medium whitespace-nowrap"
          style={pillStyle(status)}
          aria-hidden="true"
        >
          {ITEM_STATUS_LABELS[status]}
          {!readOnly && (
            <svg width="8" height="5" viewBox="0 0 8 5" className="opacity-60" aria-hidden="true">
              <path d="M1 1l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </span>
        <select
          value={status}
          disabled={readOnly || change.isPending}
          aria-label={`Statut de ${item.itemCode}`}
          onChange={(event) => {
            event.stopPropagation()
            const next = event.target.value as ItemStatus
            if (next === 'cancelled') setCancelling(true)
            else void apply(next, null)
          }}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
        >
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ITEM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </span>
      <Modal open={cancelling} title={`Annuler ${item.itemCode}`} onClose={() => setCancelling(false)}>
        <p className="mb-3 text-sm text-ink-2">L'article sort des totaux ; il reste visible et peut être repris plus tard.</p>
        <label className="mb-4 block text-sm">
          Note (facultative)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="control mt-1.5 w-full" />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCancelling(false)}>
            Retour
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setCancelling(false)
              void apply('cancelled', note.trim() || null)
            }}
          >
            Annuler l'article
          </Button>
        </div>
      </Modal>
    </>
  )
}
