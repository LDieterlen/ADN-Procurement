// Pages edited as a draft saved at once (article, installation sheet): the browser's warning on closing or reloading,
// the « Modifications non enregistrées » bar at the bottom (« Annuler les modifications », « Enregistrer »), and the
// question asked when leaving for another page with changes pending.
import { useEffect, type ReactNode, type RefObject } from 'react'
import { useBlocker, type Blocker } from 'react-router'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'

/** `guarded`: changes pending and editable; `leaving` set before a navigation never to stop (after a delete). */
export function useUnsavedGuard(guarded: boolean, leaving: RefObject<boolean>): Blocker {
  useEffect(() => {
    if (!guarded) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [guarded])
  return useBlocker(({ currentLocation, nextLocation }) => guarded && !leaving.current && currentLocation.pathname !== nextLocation.pathname)
}

export function UnsavedChanges({
  guarded,
  blocker,
  saveButton,
  onDiscard,
  onSave,
  children,
}: {
  guarded: boolean
  blocker: Blocker
  saveButton: ReactNode
  onDiscard: () => void
  onSave: () => Promise<boolean>
  children: ReactNode // what is not saved, in the leaving question
}) {
  return (
    <>
      {guarded && (
        <div
          role="region"
          aria-label="Modifications non enregistrées"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-6 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-[1240px] items-center gap-3">
            <span className="text-sm text-ink-2">Modifications non enregistrées.</span>
            <Button variant="ghost" className="ml-auto" onClick={onDiscard}>
              Annuler les modifications
            </Button>
            {saveButton}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Modifications non enregistrées"
        actions={[
          {
            label: 'Enregistrer et quitter',
            variant: 'primary',
            onClick: () =>
              void onSave()
                .then((ok) => (ok ? blocker.proceed?.() : blocker.reset?.()))
                .catch(() => blocker.reset?.()),
          },
          { label: 'Quitter sans enregistrer', variant: 'danger', onClick: () => blocker.proceed?.() },
          { label: 'Rester sur la page', onClick: () => blocker.reset?.() },
        ]}
      >
        {children}
      </ConfirmDialog>
    </>
  )
}
