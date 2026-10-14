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
  to_quote: { bg: '#FFFFFF', ink: '#5B6068', border: '#CFCCC4' },
  quoted: { bg: '#E7EDF3', ink: '#2C4560', border: '#D3DDE8' },
  to_review: { bg: '#F6EBD6', ink: '#7A5216', border: '#EBD9B6' },
  approved: { bg: '#3D5A7A', ink: '#FFFFFF', border: '#3D5A7A' },
  deposit: { bg: '#DCE9E0', ink: '#2F5B3E', border: '#C6DACC' },
  purchased: { bg: '#1B1E23', ink: '#FFFFFF', border: '#1B1E23' },
  cancelled: { bg: '#EFEEEA', ink: '#8A8F96', border: '#EFEEEA', strike: true },
  prospect: { bg: '#FFFFFF', ink: '#5B6068', border: '#CFCCC4' },
  active: { bg: '#E7EDF3', ink: '#2C4560' },
  delivered: { bg: '#DCE9E0', ink: '#2F5B3E' },
  closed: { bg: '#EFEEEA', ink: '#5B6068' },
  indice: { bg: '#1B1E23', ink: '#FFFFFF', border: '#1B1E23' },
  none: { bg: '#FFFFFF', ink: '#5B6068', border: '#CFCCC4' },
  warn: { bg: '#F6EBD6', ink: '#7A5216', border: '#EBD9B6' },
  danger: { bg: '#FFFFFF', ink: '#A4442F', border: '#CFCCC4' },
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
