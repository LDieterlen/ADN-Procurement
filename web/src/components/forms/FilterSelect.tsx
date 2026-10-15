// Small inline filter for list pages: a labelled <select> with an « all » option; '' means no filter.
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  all = 'Tous',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  all?: string
}) {
  return (
    <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="control control-sm">
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
