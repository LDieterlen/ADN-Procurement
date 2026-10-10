// Zones of a project: ordered list (up/down → reorder), inline add/edit form, archive, delete when empty.
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { isApiError, type ErrorDetail } from '../../api/errors'
import {
  useArchiveZone,
  useCreateZone,
  useDeleteZone,
  useReorderZones,
  useUnarchiveZone,
  useUpdateZone,
  useZones,
  type ZoneCreate,
  type ZoneRead,
} from '../../api/queries/project'
import { Form } from '../../components/forms/Form'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

export const ZONE_KIND_SUGGESTIONS = ['chambre', 'sdb', 'lobby', 'restaurant', 'bar', 'salon', 'cuisine', 'bureau', 'couloir', 'extérieur']

type ZoneValues = { code: string; name: string; kind: string; multiplier: string; notes: string }
const EMPTY: ZoneValues = { code: '', name: '', kind: '', multiplier: '1', notes: '' }

function toPayload(v: ZoneValues): ZoneCreate {
  return {
    code: v.code.trim().toUpperCase(),
    name: v.name,
    kind: v.kind.trim() || null,
    multiplier: Number.parseInt(v.multiplier, 10) || 1,
    notes: v.notes.trim() || null,
  }
}

function ZoneForm({
  initial,
  onSubmit,
  onCancel,
  serverErrors,
  banner,
}: {
  initial?: ZoneRead
  onSubmit: (values: ZoneValues) => Promise<void>
  onCancel: () => void
  serverErrors: ErrorDetail[]
  banner: string | null
}) {
  const form = useForm<ZoneValues>({
    defaultValues: initial
      ? { code: initial.code, name: initial.name, kind: initial.kind ?? '', multiplier: String(initial.multiplier), notes: initial.notes ?? '' }
      : EMPTY,
  })
  for (const detail of serverErrors) {
    if (detail.field in EMPTY && !form.formState.errors[detail.field as Path<ZoneValues>])
      form.setError(detail.field as Path<ZoneValues>, { type: 'server', message: detail.message })
  }
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <div className="grid grid-cols-5 gap-3">
        <TextInput name="code" label="Code" placeholder="CHA" autoFocus />
        <TextInput name="name" label="Nom" placeholder="Chambre type A" />
        <TextInput name="kind" label="Type" hint="chambre, sdb, lobby…" />
        <TextInput name="multiplier" label="Multiplicateur" inputMode="numeric" hint="× 12 pour 12 chambres" />
        <TextInput name="notes" label="Notes" />
      </div>
      <datalist id="zone-kinds">
        {ZONE_KIND_SUGGESTIONS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {initial ? 'Enregistrer' : 'Ajouter'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </Form>
  )
}

export function ZonesTab({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const [includeArchived, setIncludeArchived] = useState(false)
  const zones = useZones(projectId, includeArchived)
  const create = useCreateZone()
  const update = useUpdateZone()
  const remove = useDeleteZone()
  const archive = useArchiveZone()
  const unarchive = useUnarchiveZone()
  const reorder = useReorderZones()
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

  async function submit(values: ZoneValues) {
    setServerErrors([])
    setBanner(null)
    try {
      if (editing === 'new') await create.mutateAsync({ projectId, data: toPayload(values) })
      else if (typeof editing === 'number') await update.mutateAsync({ id: editing, data: toPayload(values) })
      setEditing(null)
    } catch (error) {
      fail(error)
    }
  }

  function move(zone: ZoneRead, delta: -1 | 1) {
    const active = (zones.data ?? []).filter((z) => z.archivedAt === null)
    const index = active.findIndex((z) => z.id === zone.id)
    const target = index + delta
    if (index === -1 || target < 0 || target >= active.length) return
    const ids = active.map((z) => z.id)
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    reorder.mutateAsync({ projectId, zoneIds: ids }).catch(fail)
  }

  const rows = zones.data ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm text-neutral-700">
          <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
          Afficher les zones archivées
        </label>
        {!readOnly && editing === null && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            Ajouter une zone
          </Button>
        )}
      </div>
      {editing === 'new' && <ZoneForm onSubmit={submit} onCancel={() => setEditing(null)} serverErrors={serverErrors} banner={banner} />}
      {zones.data && rows.length === 0 && editing !== 'new' && (
        <EmptyState title="Aucune zone.">Lobby ×1, Chambre type A ×12… chaque zone porte son multiplicateur.</EmptyState>
      )}
      {rows.length > 0 && (
        <table className="w-full text-sm" aria-label="Zones du projet">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-500">
              <th className="px-2 py-1">Code</th>
              <th className="px-2 py-1">Nom</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1 text-right">×</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((zone, index) => (
              <tr key={zone.id} className="border-b border-neutral-200">
                {editing === zone.id ? (
                  <td colSpan={5} className="px-2 py-2">
                    <ZoneForm initial={zone} onSubmit={submit} onCancel={() => setEditing(null)} serverErrors={serverErrors} banner={banner} />
                  </td>
                ) : (
                  <>
                    <td className="px-2 py-1 font-mono text-xs">{zone.code}</td>
                    <td className="px-2 py-1">
                      {zone.name}
                      {zone.archivedAt && <span className="ml-2 rounded bg-neutral-200 px-1.5 text-xs">Archivée</span>}
                    </td>
                    <td className="px-2 py-1 text-neutral-600">{zone.kind ?? ''}</td>
                    <td className="px-2 py-1 text-right">×{zone.multiplier}</td>
                    <td className="px-2 py-1 text-right text-xs">
                      {!readOnly && !zone.archivedAt && (
                        <span className="inline-flex gap-2">
                          <button type="button" className="underline" onClick={() => move(zone, -1)} disabled={index === 0} aria-label={`Monter ${zone.name}`}>
                            ↑
                          </button>
                          <button type="button" className="underline" onClick={() => move(zone, 1)} aria-label={`Descendre ${zone.name}`}>
                            ↓
                          </button>
                          <button type="button" className="underline" onClick={() => setEditing(zone.id)}>
                            Modifier
                          </button>
                          <button type="button" className="underline" onClick={() => archive.mutateAsync(zone.id).catch(fail)}>
                            Archiver
                          </button>
                          <button
                            type="button"
                            className="text-red-700 underline"
                            onClick={() => remove.mutateAsync(zone.id).catch(fail)}
                            aria-label={`Supprimer ${zone.name}`}
                          >
                            Supprimer
                          </button>
                        </span>
                      )}
                      {!readOnly && zone.archivedAt && (
                        <button type="button" className="underline" onClick={() => unarchive.mutateAsync(zone.id).catch(fail)}>
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
    </section>
  )
}
