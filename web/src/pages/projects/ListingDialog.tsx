// « Listing PDF » (ADR-0023): the profile (which columns, by recipient), the paper, the options or not; the PDF is
// downloaded and kept in the project's history. The last choices are remembered on this browser.
import { useQueryClient } from '@tanstack/react-query'
import { Checkbox } from '../../components/forms/Checkbox'
import { useState } from 'react'
import { Link } from 'react-router'
import { useListingColumns, useListingProfiles } from '../../api/queries/listingProfile'
import { exportKeys, listExportUrl } from '../../api/queries/projectFile'
import { Button } from '../../components/ui/Button'
import { Chips } from '../../components/ui/Chips'
import { Modal } from '../../components/ui/Modal'
import { Segmented } from '../../components/ui/Segmented'

const PAPERS: { value: 'color' | 'white'; label: string }[] = [
  { value: 'color', label: 'Couleur' },
  { value: 'white', label: 'Blanc' },
]

function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage unavailable (private window): defaults
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
}

export function ListingDialog({ projectId, open, onClose }: { projectId: number; open: boolean; onClose: () => void }) {
  const profiles = useListingProfiles()
  const columns = useListingColumns()
  const queryClient = useQueryClient()
  const [profileId, setProfileId] = useState<number | null>(() => Number(remembered('ffe.listingProfile')) || null)
  const [paper, setPaper] = useState<'color' | 'white'>(() => (remembered('ffe.printable') === '1' ? 'white' : 'color'))
  const [includeOptions, setIncludeOptions] = useState(false)
  const list = profiles.data ?? []
  const chosen = list.find((p) => p.id === profileId) ?? list[0] ?? null
  const labels = new Map((columns.data ?? []).map((c) => [c.key, c.label]))

  function generate() {
    const link = document.createElement('a')
    link.href = listExportUrl(projectId, paper === 'white', chosen?.id ?? null, includeOptions)
    link.download = ''
    link.click()
    if (chosen) remember('ffe.listingProfile', String(chosen.id))
    remember('ffe.printable', paper === 'white' ? '1' : '0')
    // The listing is generated while it downloads: the history is read again a few times, a long one included.
    for (const delay of [1500, 5000, 12000]) {
      window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: exportKeys.list(projectId) }), delay)
    }
    onClose()
  }

  return (
    <Modal open={open} title="Listing PDF" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
          Profil
          <select
            className="control font-normal"
            value={chosen?.id ?? ''}
            onChange={(event) => setProfileId(Number(event.target.value))}
            aria-label="Profil du listing"
          >
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {chosen && <Chips label="Colonnes imprimées" items={chosen.columns.map((c) => labels.get(c) ?? c)} />}
        <div>
          <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Papier</div>
          <Segmented label="Papier du listing" value={paper} onChange={setPaper} options={PAPERS} />
        </div>
        <Checkbox label="Inclure les options" checked={includeOptions} onChange={(event) => setIncludeOptions(event.target.checked)} />
        <Link to="/settings#profils" className="block text-[12.5px] text-ink-2 underline" onClick={onClose}>
          Créer ou modifier les profils
        </Link>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" onClick={generate} disabled={profiles.isPending}>
          Générer
        </Button>
      </div>
    </Modal>
  )
}
