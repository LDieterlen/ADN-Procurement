// Status pill (24 px, radius 5, hairline drawn as an inset shadow). `status` picks the palette of an
// article or project status; `indice` is the solid ink pill, `none` the plain outline.
export type PillStatus =
  | 'to_quote'
  | 'quoted'
  | 'to_review'
  | 'approved'
  | 'deposit'
  | 'purchased'
  | 'cancelled'
  | 'prospect'
  | 'active'
  | 'delivered'
  | 'closed'
  | 'indice'
  | 'none'
  | 'warn'
  | 'danger'

type Look = { bg: string; ink: string; border?: string; strike?: boolean }

const LOOKS: Record<PillStatus, Look> = {
  to_quote: { bg: 'var(--color-surface)', ink: 'var(--color-ink-2)', border: 'var(--color-line-strong)' },
  quoted: { bg: 'var(--color-accent-soft)', ink: 'var(--color-accent-ink)', border: 'var(--color-accent-line)' },
  to_review: { bg: 'var(--color-warn-soft)', ink: 'var(--color-warn)', border: 'var(--color-warn-line)' },
  approved: { bg: 'var(--color-accent)', ink: 'var(--color-surface)', border: 'var(--color-accent)' },
  deposit: { bg: 'var(--color-ok-soft)', ink: 'var(--color-ok)', border: 'var(--color-ok-line)' },
  purchased: { bg: 'var(--color-ink)', ink: 'var(--color-surface)', border: 'var(--color-ink)' },
  cancelled: { bg: 'var(--color-muted)', ink: 'var(--color-ink-3)', border: 'var(--color-muted)', strike: true },
  prospect: { bg: 'var(--color-surface)', ink: 'var(--color-ink-2)', border: 'var(--color-line-strong)' },
  active: { bg: 'var(--color-accent-soft)', ink: 'var(--color-accent-ink)' },
  delivered: { bg: 'var(--color-ok-soft)', ink: 'var(--color-ok)' },
  closed: { bg: 'var(--color-muted)', ink: 'var(--color-ink-2)' },
  indice: { bg: 'var(--color-ink)', ink: 'var(--color-surface)', border: 'var(--color-ink)' },
  none: { bg: 'var(--color-surface)', ink: 'var(--color-ink-2)', border: 'var(--color-line-strong)' },
  warn: { bg: 'var(--color-warn-soft)', ink: 'var(--color-warn)', border: 'var(--color-warn-line)' },
  danger: { bg: 'var(--color-surface)', ink: 'var(--color-danger)', border: 'var(--color-line-strong)' },
}

export function pillStyle(status: PillStatus): React.CSSProperties {
  const look = LOOKS[status]
  return {
    background: look.bg,
    color: look.ink,
    boxShadow: look.border ? `inset 0 0 0 1px ${look.border}` : undefined,
    textDecoration: look.strike ? 'line-through' : undefined,
  }
}

export function Pill({
  children,
  status,
  filled,
  tone,
  className = '',
}: {
  children: string
  status?: PillStatus
  /** Legacy props: `filled` = solid ink pill, `tone` = warn / danger outline. */
  filled?: boolean
  tone?: 'neutral' | 'amber' | 'red'
  className?: string
}) {
  const look: PillStatus = status ?? (filled ? 'indice' : tone === 'amber' ? 'warn' : tone === 'red' ? 'danger' : 'none')
  return (
    <span className={`inline-flex h-6 items-center rounded-[5px] px-[9px] text-[12.5px] font-medium whitespace-nowrap ${className}`} style={pillStyle(look)}>
      {children}
    </span>
  )
}
