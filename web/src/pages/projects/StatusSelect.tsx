// Inline status change of an article (ADR-0013): free, journaled; « Annulé » asks for an optional note.
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { ITEM_STATUS_LABELS, ITEM_STATUSES, useChangeItemStatus, type ItemStatus, type ProjectItemRead } from '../../api/queries/projectItem'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'

export function StatusSelect({ item, readOnly, className = '' }: { item: ProjectItemRead; readOnly: boolean; className?: string }) {
  const change = useChangeItemStatus()
  const toast = useToast()
  const [cancelling, setCancelling] = useState(false)
  const [note, setNote] = useState('')

  async function apply(status: ItemStatus, withNote: string | null) {
    try {
      await change.mutateAsync({ id: item.id, data: { status, note: withNote } })
    } catch (error) {
      toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
    }
  }

  return (
    <>
      <select
        value={item.status}
        disabled={readOnly || change.isPending}
        aria-label={`Statut de ${item.itemCode}`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation()
          const status = event.target.value as ItemStatus
          if (status === 'cancelled') setCancelling(true)
          else void apply(status, null)
        }}
        className={`rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium ${className}`}
      >
        {ITEM_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ITEM_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <Modal open={cancelling} title={`Annuler ${item.itemCode}`} onClose={() => setCancelling(false)}>
        <p className="mb-3 text-sm text-neutral-700">L'article sort des totaux ; il reste visible et peut être repris plus tard.</p>
        <label className="mb-4 block text-sm">
          Note (facultative)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
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
