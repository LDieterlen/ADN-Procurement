// « Profils de listing » (ADR-0023): which columns the listing PDF prints, by recipient; profiles are
// created, renamed, re-columned and deleted here.
import { useState } from 'react'
import { Checkbox } from '../../components/forms/Checkbox'
import { isApiError } from '../../api/errors'
import {
  useCreateListingProfile,
  useDeleteListingProfile,
  useListingColumns,
  useListingProfiles,
  useUpdateListingProfile,
  type ListingColumn,
  type ListingProfileRead,
} from '../../api/queries/listingProfile'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'

type Editing = { id: number | null; name: string; columns: ListingColumn[] }

export function ListingProfilesCard() {
  const profiles = useListingProfiles()
  const columns = useListingColumns()
  const create = useCreateListingProfile()
  const update = useUpdateListingProfile()
  const remove = useDeleteListingProfile()
  const toast = useToast()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ListingProfileRead | null>(null)
  const labels = new Map((columns.data ?? []).map((c) => [c.key, c.label]))

  function open(profile: ListingProfileRead | null) {
    setError(null)
    setEditing(profile ? { id: profile.id, name: profile.name, columns: profile.columns } : { id: null, name: '', columns: ['code', 'name', 'quantity'] })
  }

  async function save() {
    if (!editing) return
    setError(null)
    try {
      if (editing.id === null) await create.mutateAsync({ name: editing.name, columns: editing.columns })
      else await update.mutateAsync({ id: editing.id, name: editing.name, columns: editing.columns })
      toast.show({ kind: 'success', message: 'Profil enregistré.' })
      setEditing(null)
    } catch (caught) {
      if (!isApiError(caught)) throw caught
      setError(caught.details[0]?.message ?? caught.message)
    }
  }

  return (
    // #profils: the card's top, reached from « Listing PDF » (« Gérer les profils »).
    <div id="profils" className="scroll-mt-4">
      <Card
        title="Profils de listing"
        label="Profils de listing"
        padding="table"
        className="max-w-3xl"
        actions={
          <Button size="sm" onClick={() => open(null)}>
            Nouveau profil
          </Button>
        }
      >
        {profiles.isPending && <p className="px-5 py-4 text-sm text-ink-3">Chargement…</p>}
        {profiles.isError && <p className="px-5 py-4 text-sm text-danger">{profiles.error.message}</p>}
        <ul className="p-2 text-sm" aria-label="Profils de listing">
          {(profiles.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="font-medium text-ink">{p.name}</div>
                <div className="truncate text-[12.5px] text-ink-3">{p.columns.map((c) => labels.get(c) ?? c).join(' · ')}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="xs" variant="ghost" onClick={() => open(p)} aria-label={`Modifier le profil ${p.name}`}>
                  Modifier
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setDeleting(p)} aria-label={`Supprimer le profil ${p.name}`}>
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Modal open={editing !== null} title={editing?.id === null ? 'Nouveau profil' : 'Modifier le profil'} onClose={() => setEditing(null)}>
          {editing && (
            <div className="space-y-4 text-sm">
              <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
                Nom
                <input className="control font-normal" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
              </label>
              <fieldset>
                <legend className="mb-1.5 text-[12.5px] font-medium text-ink-2">Colonnes imprimées</legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {(columns.data ?? []).map((c) => (
                    <Checkbox
                      key={c.key}
                      label={c.label}
                      checked={editing.columns.includes(c.key)}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          // Always in the catalogue's order, the printing order (ADR-0023).
                          columns: (columns.data ?? []).map((col) => col.key).filter((k) => (k === c.key ? event.target.checked : editing.columns.includes(k))),
                        })
                      }
                    />
                  ))}
                </div>
              </fieldset>
              {error && <p className="text-[12.5px] text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={() => void save()} disabled={create.isPending || update.isPending}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </Modal>
        <ConfirmDialog
          open={deleting !== null}
          title={`Supprimer le profil « ${deleting?.name ?? ''} » ?`}
          actions={[
            {
              label: 'Supprimer',
              variant: 'danger',
              onClick: () =>
                void remove
                  .mutateAsync(deleting!.id)
                  .then(() => setDeleting(null))
                  .catch((caught: unknown) => toast.show({ kind: 'error', message: isApiError(caught) ? caught.message : String(caught), persistent: true })),
            },
            { label: 'Garder', onClick: () => setDeleting(null) },
          ]}
        >
          Les listings déjà émis restent dans l’historique des projets.
        </ConfirmDialog>
      </Card>
    </div>
  )
}
