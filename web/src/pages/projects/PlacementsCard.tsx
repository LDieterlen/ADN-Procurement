// The placements of an article (rooms and quantities), edited as a draft saved by the article
// page's « Enregistrer » (2026-10-15). A new or moved placement gets its code when saved.
import { useState } from 'react'
import { locationLabel, type LocationRead } from '../../api/queries/project'
import type { ProjectItemRead } from '../../api/queries/projectItem'
import { milliToText, textToMilli } from '../../components/forms/QuantityField'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'

/** A placement as edited: `id` null = added on the page, saved with the rest. */
export type DraftPlacement = { key: string; id: number | null; locationId: number | null; qtyMilli: number; sortOrder: number }

export function PlacementsCard({
  item,
  placements,
  onChange,
  locations,
  readOnly,
  version,
}: {
  item: ProjectItemRead
  placements: DraftPlacement[]
  onChange: (placements: DraftPlacement[]) => void
  locations: LocationRead[]
  readOnly: boolean
  /** Changes when the page reloads the article: the typed quantities start again from it. */
  version: number
}) {
  const toast = useToast()
  const [locationId, setLocationId] = useState<string>('')
  const [qty, setQty] = useState('1')
  const locationOf = (id: number | null) => locations.find((l) => l.id === id)
  const saved = (draft: DraftPlacement) => item.placements.find((p) => p.id === draft.id)
  const set = (key: string, change: Partial<DraftPlacement>) => onChange(placements.map((p) => (p.key === key ? { ...p, ...change } : p)))
  // « Non affecté » is a location like the others: one placement at most.
  const unassignedFree = (except?: string) => !placements.some((p) => p.key !== except && p.locationId === null)
  // The location offered for an addition: the one chosen, else « Non affecté » when free, else the first free one.
  const addable = locations.filter((l) => l.archivedAt === null && !placements.some((p) => p.locationId === l.id))
  const toAdd = locationId || (unassignedFree() ? '' : String(addable[0]?.id ?? ''))

  return (
    <Card title="Implantations" label="Implantations" padding="table">
      <table className="w-full text-sm" aria-label="Implantations de l'article">
        <thead>
          <tr className="border-b border-line text-left text-[12.5px] font-medium text-ink-2">
            <th className="py-2.5 pl-5">Code</th>
            <th className="px-3 py-2.5">Localisation</th>
            <th className="px-3 py-2.5 text-right">Quantité</th>
            <th className="px-3 py-2.5 text-right">Nombre</th>
            <th className="px-3 py-2.5 text-right">Total</th>
            <th className="py-2.5 pr-5"></th>
          </tr>
        </thead>
        <tbody>
          {placements.map((placement) => {
            const location = locationOf(placement.locationId)
            const multiplier = location?.multiplier ?? 1
            const before = saved(placement)
            // A new placement, or one moved to another location, gets its code when saved.
            const code = before && before.locationId === placement.locationId ? before.code : null
            return (
              <tr key={placement.key} className="border-b border-line-soft">
                <td className="py-2 pl-5 font-mono text-xs font-medium whitespace-nowrap">
                  {code ?? <span className="font-sans text-xs font-normal text-warn">à l'enregistrement</span>}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    location ? (
                      <>
                        <span className="mr-2 font-mono text-xs text-ink-2">{location.code}</span>
                        {location.name}
                      </>
                    ) : (
                      'Non affecté'
                    )
                  ) : (
                    <select
                      value={placement.locationId ?? ''}
                      aria-label={`Localisation de l'implantation ${location?.code ?? 'non affecté'}`}
                      className="control control-sm max-w-[260px]"
                      onChange={(event) => set(placement.key, { locationId: event.target.value ? Number(event.target.value) : null })}
                    >
                      {(placement.locationId === null || unassignedFree(placement.key)) && <option value="">Non affecté</option>}
                      {locations
                        .filter(
                          (l) =>
                            l.id === placement.locationId ||
                            (l.archivedAt === null && !placements.some((other) => other.key !== placement.key && other.locationId === l.id)),
                        )
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {locationLabel(l)}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {readOnly ? (
                    milliToText(placement.qtyMilli)
                  ) : (
                    <input
                      key={`${placement.key}-${version}`}
                      defaultValue={milliToText(placement.qtyMilli)}
                      inputMode="decimal"
                      aria-label={`Quantité dans ${location?.code ?? 'non affecté'}`}
                      className="control control-sm w-16 px-2 text-right tabular-nums"
                      onChange={(event) => {
                        // Taken as typed (the page knows at once it has a change to save).
                        const milli = textToMilli(event.target.value)
                        if (milli !== undefined && milli !== null && milli !== placement.qtyMilli) set(placement.key, { qtyMilli: milli })
                      }}
                      onBlur={(event) => {
                        const milli = textToMilli(event.target.value)
                        if (milli === undefined || milli === null) {
                          toast.show({ kind: 'error', message: 'Quantité invalide.' })
                          event.target.value = milliToText(placement.qtyMilli)
                        }
                      }}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right text-ink-2">× {multiplier}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{milliToText(placement.qtyMilli * multiplier)}</td>
                <td className="py-2 pr-5 text-right text-[13px]">
                  {!readOnly && placements.length > 1 && (
                    <button
                      type="button"
                      className="text-danger hover:underline"
                      onClick={() => onChange(placements.filter((p) => p.key !== placement.key))}
                      aria-label={`Retirer de ${location?.code ?? 'non affecté'}`}
                    >
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-3 border-t border-line bg-sunken px-5 py-3">
          <label className="flex flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
            Localisation à ajouter
            <select value={toAdd} onChange={(e) => setLocationId(e.target.value)} className="control control-sm font-normal">
              {unassignedFree() && <option value="">Non affecté</option>}
              {addable.map((l) => (
                <option key={l.id} value={l.id}>
                  {locationLabel(l)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-[110px] flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
            Quantité à ajouter
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              className="control control-sm text-right font-normal tabular-nums"
            />
          </label>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => {
              const milli = textToMilli(qty)
              if (milli === undefined || milli === null) return toast.show({ kind: 'error', message: 'Quantité invalide.' })
              const target = toAdd ? Number(toAdd) : null
              if (placements.some((p) => p.locationId === target))
                return toast.show({ kind: 'error', message: "L'article est déjà implanté dans cette localisation." })
              onChange([...placements, { key: `new${Date.now()}`, id: null, locationId: target, qtyMilli: milli, sortOrder: placements.length }])
              setQty('1')
              setLocationId('')
            }}
          >
            Ajouter
          </Button>
        </div>
      )}
    </Card>
  )
}
