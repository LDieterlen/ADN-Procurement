// Locations of a project (ADR-0013): Code · Nom · Zone · Niveau · × ; add form at the bottom of the
// table, edit in place, reorder, archive, delete when empty.
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { isApiError, type ErrorDetail } from '../../api/errors'
import {
  useArchiveLocation,
  useCreateLocation,
  useDeleteLocation,
  useReorderLocations,
  useUnarchiveLocation,
  useUpdateLocation,
  type LocationCreate,
  type LocationRead,
} from '../../api/queries/project'
import { Form } from '../../components/forms/Form'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'

export const ZONE_SUGGESTIONS = ['Zones communes', 'Hébergement', 'Back of house', 'Extérieurs']

type Values = { code: string; name: string; zone: string; level: string; multiplier: string }
const EMPTY: Values = { code: '', name: '', zone: '', level: '', multiplier: '1' }

function toPayload(v: Values): LocationCreate {
  return {
    code: v.code.trim().toUpperCase(),
    name: v.name,
    zone: v.zone.trim() || null,
    level: v.level.trim() || null,
    multiplier: Number.parseInt(v.multiplier, 10) || 1,
  }
}

function LocationForm({
  initial,
  onSubmit,
  onCancel,
  serverErrors,
  banner,
  submitLabel,
}: {
  initial?: LocationRead
  onSubmit: (values: Values) => Promise<void>
  onCancel?: () => void
  serverErrors: ErrorDetail[]
  banner: string | null
  submitLabel: string
}) {
  const form = useForm<Values>({
    defaultValues: initial
      ? { code: initial.code, name: initial.name, zone: initial.zone ?? '', level: initial.level ?? '', multiplier: String(initial.multiplier) }
      : EMPTY,
  })
  for (const detail of serverErrors) {
    if (detail.field in EMPTY && !form.formState.errors[detail.field as Path<Values>])
      form.setError(detail.field as Path<Values>, { type: 'server', message: detail.message })
  }
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid grid-cols-5 gap-3">
        <TextInput name="code" label="Code" placeholder="CHA" autoFocus />
        <TextInput name="name" label="Nom" placeholder="Chambre typo A" />
        <TextInput name="zone" label="Zone" placeholder="Hébergement" hint="Zones communes, Hébergement…" />
        <TextInput name="level" label="Niveau" placeholder="R+1" />
        <TextInput name="multiplier" label="Nombre" inputMode="numeric" hint="× 24 pour 24 chambres" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </Form>
  )
}

export function LocationsSection({ projectId, locations, readOnly }: { projectId: number; locations: LocationRead[]; readOnly: boolean }) {
  const create = useCreateLocation()
  const update = useUpdateLocation()
  const remove = useDeleteLocation()
  const archive = useArchiveLocation()
  const unarchive = useUnarchiveLocation()
  const reorder = useReorderLocations()
  const toast = useToast()
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)

  function fail(error: unknown) {
    if (!isApiError(error)) throw error
    if (error.code === 'validation_error') {
      setServerErrors(error.details)
      setBanner(error.message)
    } else {
      toast.show({ kind: 'error', message: error.message, persistent: error.code === 'network_error' || error.code === 'internal_error' })
    }
  }

  async function submit(values: Values) {
    setServerErrors([])
    setBanner(null)
    try {
      if (editing === 'new') await create.mutateAsync({ projectId, data: toPayload(values) })
      else if (editing !== null) await update.mutateAsync({ id: editing, data: toPayload(values) })
      setEditing(null)
    } catch (error) {
      fail(error)
    }
  }

  function move(location: LocationRead, delta: -1 | 1) {
    const active = locations.filter((l) => l.archivedAt === null)
    const index = active.findIndex((l) => l.id === location.id)
    const target = index + delta
    if (index === -1 || target < 0 || target >= active.length) return
    const ids = active.map((l) => l.id)
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    reorder.mutateAsync({ projectId, locationIds: ids }).catch(fail)
  }

  return (
    <Card
      title="Localisations"
      label="Localisations"
      padding="table"
      actions={
        !readOnly && editing !== 'new' ? (
          <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
            + Ajouter une localisation
          </Button>
        ) : undefined
      }
    >
      {locations.length === 0 && (
        <p className="px-5 py-4 text-sm text-ink-2">
          Aucune localisation : Lobby ×1, Chambre typo A ×24… chaque localisation porte sa zone, son niveau et son nombre.
        </p>
      )}
      {locations.length > 0 && (
        <table className="w-full text-sm" aria-label="Localisations du projet">
          <thead>
            <tr className="border-b border-line text-left text-[12.5px] font-medium text-ink-2">
              <th className="py-2.5 pl-5 font-medium">Code</th>
              <th className="px-3 py-2.5 font-medium">Nom</th>
              <th className="px-3 py-2.5 font-medium">Zone</th>
              <th className="px-3 py-2.5 font-medium">Niveau</th>
              <th className="px-3 py-2.5 text-right font-medium">Nombre</th>
              <th className="py-2.5 pr-5"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location, index) => (
              <tr key={location.id} className="border-b border-line-soft">
                {editing === location.id ? (
                  <td colSpan={6} className="px-2 py-3">
                    <LocationForm
                      initial={location}
                      onSubmit={submit}
                      onCancel={() => setEditing(null)}
                      serverErrors={serverErrors}
                      banner={banner}
                      submitLabel="Enregistrer"
                    />
                  </td>
                ) : (
                  <>
                    <td className="py-2.5 pl-5 font-mono text-xs text-ink-2">{location.code}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {location.name}
                      {location.archivedAt && <span className="ml-2 rounded-full border border-line-strong px-1.5 text-xs">Archivée</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{location.zone ?? ''}</td>
                    <td className="px-3 py-2.5 text-ink-2">{location.level ?? ''}</td>
                    <td className="px-3 py-2.5 text-right text-ink-2">× {location.multiplier}</td>
                    <td className="py-2.5 pr-5 text-right text-[12.5px] text-ink-2">
                      {!readOnly && !location.archivedAt && (
                        <span className="inline-flex gap-2">
                          <button
                            type="button"
                            className="underline"
                            onClick={() => move(location, -1)}
                            disabled={index === 0}
                            aria-label={`Monter ${location.name}`}
                          >
                            ↑
                          </button>
                          <button type="button" className="underline" onClick={() => move(location, 1)} aria-label={`Descendre ${location.name}`}>
                            ↓
                          </button>
                          <button type="button" className="underline" onClick={() => setEditing(location.id)} aria-label={`Modifier ${location.name}`}>
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="underline"
                            onClick={() => archive.mutateAsync(location.id).catch(fail)}
                            aria-label={`Archiver ${location.name}`}
                          >
                            Archiver
                          </button>
                          <button
                            type="button"
                            className="text-danger underline"
                            onClick={() => remove.mutateAsync(location.id).catch(fail)}
                            aria-label={`Supprimer ${location.name}`}
                          >
                            Supprimer
                          </button>
                        </span>
                      )}
                      {!readOnly && location.archivedAt && (
                        <button type="button" className="underline" onClick={() => unarchive.mutateAsync(location.id).catch(fail)}>
                          Restaurer
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!readOnly && editing === 'new' && (
        <div className="border-t border-line px-6 py-5">
          <h3 className="mb-4 text-base font-semibold">Nouvelle localisation</h3>
          <datalist id="zone-suggestions">
            {ZONE_SUGGESTIONS.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <LocationForm onSubmit={submit} onCancel={() => setEditing(null)} serverErrors={serverErrors} banner={banner} submitLabel="Ajouter la localisation" />
        </div>
      )}
    </Card>
  )
}
