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
    <label className="flex items-center gap-1 text-sm text-neutral-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
      >
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
