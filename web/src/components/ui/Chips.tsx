// A short list of values shown as small chips (e.g. the columns of a listing profile), with a
// heading that counts them.
export function Chips({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">
        {label} <span className="font-normal text-ink-3">({items.length})</span>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {items.map((item) => (
          <li key={item} className="rounded-[5px] border border-line bg-sunken px-2 py-0.5 text-[12px] text-ink-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
