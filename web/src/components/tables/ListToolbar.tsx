// The toolbar above every list (Projets, Clients, Fournisseurs, Professionnels, Listes): search on the
// left, then filters, then « Afficher les archivés » on the right. Same height and spacing everywhere.
import type { ReactNode } from 'react'
import { Checkbox } from '../forms/Checkbox'

export function ListToolbar({
  search,
  filters,
  archived,
}: {
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  filters?: ReactNode
  archived?: { value: boolean; onChange: (value: boolean) => void }
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {search && (
        <input
          type="search"
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          placeholder={search.placeholder}
          aria-label="Rechercher"
          className="control w-72"
        />
      )}
      {filters}
      {archived && (
        <Checkbox
          className="ml-auto text-sm text-ink-2"
          label="Afficher les archivés"
          checked={archived.value}
          onChange={(event) => archived.onChange(event.target.checked)}
        />
      )}
    </div>
  )
}
