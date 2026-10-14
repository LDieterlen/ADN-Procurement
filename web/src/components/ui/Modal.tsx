// Generic modal (ADR-0012): overlay + dialog. Rendered as a sibling of any form, never inside one
// (the content usually carries its own <form>).
import type { ReactNode } from 'react'
import { Button } from './Button'

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[rgba(27,30,35,.35)] py-10" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-[440px]'} rounded-xl bg-surface p-6 shadow-[0_24px_48px_-12px_rgba(27,30,35,.25)]`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label={`Fermer ${title.toLowerCase()}`}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
