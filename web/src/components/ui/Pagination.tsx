// Previous / next over a `{items, total}` catalogue page (API.md « Listes »).
import { Button } from './Button'

export function Pagination({ offset, limit, total, onChange }: { offset: number; limit: number; total: number; onChange: (offset: number) => void }) {
  if (total <= limit) return null
  const from = offset + 1
  const to = Math.min(offset + limit, total)
  return (
    <div className="flex items-center justify-between text-sm text-ink-2">
      <span>
        {from}–{to} sur {total}
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          Précédent
        </Button>
        <Button variant="ghost" disabled={to >= total} onClick={() => onChange(offset + limit)}>
          Suivant
        </Button>
      </div>
    </div>
  )
}
