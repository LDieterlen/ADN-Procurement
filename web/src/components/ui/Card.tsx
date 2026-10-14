// A white card with a hairline border, radius 10. `padding="table"` keeps the table glued to the
// edges under a 16 × 20 header; the default is the form card (20 × 24).
import type { ReactNode } from 'react'

export function Card({
  title,
  meta,
  actions,
  children,
  label,
  padding = 'form',
  className = '',
}: {
  title?: string
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
  label?: string
  padding?: 'form' | 'table' | 'none'
  className?: string
}) {
  const header = title || actions
  return (
    <section aria-label={label ?? title} className={`overflow-hidden rounded-[10px] border border-line bg-surface ${className}`}>
      {header && (
        <div className={`flex items-center justify-between gap-4 ${padding === 'form' ? 'px-6 pt-5 pb-4' : 'border-b border-line px-5 py-4'}`}>
          <div className="flex items-baseline gap-3">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {meta && <span className="text-[13px] text-ink-3">{meta}</span>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding === 'form' ? (header ? 'px-6 pb-6' : 'px-6 py-5') : ''}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {crumbs && <div className="mb-1 text-[13px] text-ink-3 [&_a]:text-ink-3 [&_a:hover]:text-ink">{crumbs}</div>}
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle && <div className="mt-2 flex flex-wrap items-center gap-2.5 text-sm text-ink-2 [&>.dot]:text-line-strong">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
    </div>
  )
}

/** The « · » separator of a meta line, in `line-strong`. */
export function Dot() {
  return (
    <span className="dot" aria-hidden="true">
      ·
    </span>
  )
}
