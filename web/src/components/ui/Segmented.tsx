// Segmented control (filters): a track with one active white segment; `aria-label` names the group.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 rounded-[7px] bg-track p-[3px]">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-[5px] px-3 py-[5px] text-[13px] whitespace-nowrap transition-colors ${active ? 'bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-ink-2 hover:text-ink'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
