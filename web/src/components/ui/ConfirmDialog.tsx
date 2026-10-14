// Modal with a title, a message and one to three actions; the last action is the cancel one.
import type { ReactNode } from 'react'
import { Button } from './Button'

export type DialogAction = { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' }

export function ConfirmDialog({ open, title, children, actions }: { open: boolean; title: string; children?: ReactNode; actions: DialogAction[] }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(27,30,35,.35)]" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-[440px] rounded-xl bg-surface p-6 shadow-[0_24px_48px_-12px_rgba(27,30,35,.25)]"
      >
        <h2 id="dialog-title" className="text-base font-semibold text-ink">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant ?? 'secondary'} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
