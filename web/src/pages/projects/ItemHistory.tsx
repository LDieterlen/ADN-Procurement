// The journal of an article (statuses, prices, sheet fields, files, placements, indices), newest last.
import { ITEM_STATUS_LABELS, type EventRead } from '../../api/queries/projectItem'

const EVENT_LABELS: Record<string, string> = {
  created: 'Création',
  status: 'État',
  price: 'Prix',
  sheet: 'Fiche',
  file: 'Fichier',
  placement: 'Implantation',
  indice: 'Diffusion',
  other: 'Autre',
}

export function ItemHistory({ events }: { events: EventRead[] }) {
  if (events.length === 0) return <p className="text-sm text-ink-3">Aucun événement.</p>
  return (
    <ul className="text-[13.5px]" aria-label="Historique de l'article">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="grid grid-cols-[150px_100px_1fr] gap-3 border-t border-line-soft py-2.5 first:border-t-0">
          <span className="text-ink-3 tabular-nums">{e.changedAt.replace('T', ' ').slice(0, 16)}</span>
          <span className="font-medium">{EVENT_LABELS[e.kind] ?? e.kind}</span>
          <span className="text-ink-2">
            {e.kind === 'status' && e.fromStatus && e.toStatus
              ? `${ITEM_STATUS_LABELS[e.fromStatus as keyof typeof ITEM_STATUS_LABELS] ?? e.fromStatus} → ${ITEM_STATUS_LABELS[e.toStatus as keyof typeof ITEM_STATUS_LABELS] ?? e.toStatus}`
              : e.kind === 'price' && e.newValue
                ? 'Prix, remise ou devise modifiés'
                : e.kind === 'created' && e.note
                  ? e.note
                  : ''}
            {e.note && e.kind !== 'created' ? (e.kind === 'sheet' || e.kind === 'file' ? e.note : ` — ${e.note}`) : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
