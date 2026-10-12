// Status pill: filled when the status is « engaged » (approved and beyond), outlined otherwise.
export function Pill({ children, filled, tone = 'neutral' }: { children: string; filled?: boolean; tone?: 'neutral' | 'amber' | 'red' }) {
  const outline = { neutral: 'border-neutral-300 text-neutral-800', amber: 'border-amber-400 text-amber-900', red: 'border-red-300 text-red-700' }[tone]
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${filled ? 'border-neutral-900 bg-neutral-900 text-white' : outline}`}
    >
      {children}
    </span>
  )
}
