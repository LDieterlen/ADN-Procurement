// The toolbar above every list (Projets, Clients, Fournisseurs, Professionnels, Listes): search on the
// left, then filters, then « Afficher les archivés » on the right. Same height and spacing everywhere.
import type { ReactNode } from 'react'

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
          className="control h-9 w-72"
        />
      )}
      {filters}
      {archived && (
        <label className="ml-auto flex items-center gap-1.5 text-sm text-ink-2">
          <input type="checkbox" checked={archived.value} onChange={(event) => archived.onChange(event.target.checked)} />
          Afficher les archivés
        </label>
      )}
    </div>
  )
}
