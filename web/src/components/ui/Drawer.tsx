// Right-hand drawer (ADR-0012): the line sheet and the « add a product » flow live here.
import type { ReactNode } from 'react'
import { Button } from './Button'

export function Drawer({
  label,
  title,
  onClose,
  children,
  width = 'w-[34rem]',
}: {
  label: string
  title: ReactNode
  onClose: () => void
  children: ReactNode
  width?: string
}) {
  return (
    <aside
      role="dialog"
      aria-label={label}
      className={`fixed inset-y-0 right-0 z-30 ${width} overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" onClick={onClose} aria-label="Fermer le panneau">
          ✕
        </Button>
      </div>
      {children}
    </aside>
  )
}
