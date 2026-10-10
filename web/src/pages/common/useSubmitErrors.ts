// The error path of ARCHITECTURE §3, shared by every edit page: 422 → fields + banner,
// 409 duplicate → dialog (open existing / create anyway), 409 archived → dialog (restore),
// other conflicts → banner, network/500 → persistent toast. Nothing typed by the user is lost.
import { useState } from 'react'
import { isApiError, type ErrorDetail } from '../../api/errors'
import type { DialogAction } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'

export type Dialog = { title: string; message: string; actions: DialogAction[] } | null

export function useSubmitErrors(label: string) {
  const toast = useToast()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)

  function reset() {
    setServerErrors([])
    setBanner(null)
    setDialog(null)
  }

  function handle(error: unknown, actions: { resubmitForced: () => void; openExisting: (id: number) => void; restore: (id: number) => void }) {
    if (!isApiError(error)) throw error
    if (error.code === 'validation_error') {
      setServerErrors(error.details)
      setBanner(error.message)
    } else if (error.code === 'duplicate' && error.existingId !== undefined) {
      const existingId = error.existingId
      setDialog({
        title: `Un ${label} porte déjà ce nom`,
        message: error.message,
        actions: [
          { label: "Ouvrir l'existant", variant: 'primary', onClick: () => actions.openExisting(existingId) },
          { label: 'Créer quand même', onClick: actions.resubmitForced },
          { label: 'Annuler', onClick: () => setDialog(null) },
        ],
      })
    } else if (error.code === 'conflict' && error.archivedId !== undefined) {
      const archivedId = error.archivedId
      setDialog({
        title: `Un ${label} archivé porte déjà ce nom`,
        message: error.message,
        actions: [
          { label: 'Restaurer', variant: 'primary', onClick: () => actions.restore(archivedId) },
          { label: 'Annuler', onClick: () => setDialog(null) },
        ],
      })
    } else if (error.code === 'conflict' || error.code === 'not_found') {
      setBanner(error.message)
    } else {
      toast.show({ kind: 'error', message: error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
    }
  }

  return { serverErrors, banner, dialog, setDialog, setBanner, reset, handle, toast }
}
