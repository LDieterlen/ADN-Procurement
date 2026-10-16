// The indice of a code and what the next diffusion brings to it (ADR-0022, 2026-10-16), with the
// colours of the sheets: blue « Nouveau » (a code never diffused), sage green « Modifié » (its
// product changed: new indice). Muted like the sheets, never red nor orange.
import type { PlacementRead } from '../../api/queries/projectItem'

const MARKS = {
  new: { label: 'Nouveau', title: 'Nouveau code : marqué « Nouveau » à la prochaine diffusion', className: 'bg-mark-new' },
  revised: { label: 'Modifié', title: 'Produit remplacé : nouvel indice, marqué « Modifié » à la prochaine diffusion', className: 'bg-mark-revised' },
} as const

export function IndiceCell({ placement, className }: { placement: PlacementRead | null | undefined; className: string }) {
  const mark = placement?.change ? MARKS[placement.change] : null
  return (
    <td className={`${className} text-center text-ink-2`} title={mark?.title ?? (placement?.diffused ? 'Code diffusé : il ne change plus' : undefined)}>
      <span className="whitespace-nowrap">
        {placement?.indice ?? '-'}
        {mark && <span className={`ml-1.5 rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-medium text-white ${mark.className}`}>{mark.label}</span>}
      </span>
    </td>
  )
}
