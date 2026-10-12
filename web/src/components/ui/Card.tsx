// A white card with a hairline border (ADR-0013 look); `title` renders a small heading.
import type { ReactNode } from 'react'

export function Card({
  title,
  actions,
  children,
  label,
  className = '',
}: {
  title?: string
  actions?: ReactNode
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <section aria-label={label ?? title} className={`rounded-xl border border-neutral-200 bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        {crumbs && <div className="text-sm text-neutral-500">{crumbs}</div>}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
