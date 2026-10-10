import type { ReactNode } from 'react'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-neutral-300 px-6 py-10 text-center">
      <p className="font-medium text-neutral-700">{title}</p>
      {children && <div className="mt-2 text-sm text-neutral-500">{children}</div>}
    </div>
  )
}
