// Product types (ADR-0013): code, name, order, archive/restore. Seeded by `ffe db seed`.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { isApiError } from '../../api/errors'
import { useArchiveCategory, useCategories, useUnarchiveCategory, type CategoryRead } from '../../api/queries/category'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pill } from '../../components/ui/Pill'
import { useToast } from '../../components/ui/Toast'

export function CategoriesPage() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const categories = useCategories(includeArchived)
  const archive = useArchiveCategory()
  const unarchive = useUnarchiveCategory()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (categories.isError) toast.show({ kind: 'error', message: categories.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [categories.isError, categories.error, toast])

  function toggle(category: CategoryRead) {
    const mutation = category.archivedAt ? unarchive : archive
    mutation
      .mutateAsync(category.id)
      .catch((error: unknown) => toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true }))
  }

  return (
    <section>
      <PageHeader
        title="Types de produit"
        subtitle="Assise, table, luminaire… le code du type préfixe le code FF&E"
        actions={
          <Link to="/categories/new">
            <Button variant="primary">Nouveau type</Button>
          </Link>
        }
      />
      <label className="mb-3 flex items-center gap-1.5 text-sm text-neutral-700">
        <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
        Afficher les archivés
      </label>
      {categories.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {categories.isError && (
        <EmptyState title="Impossible de charger les types">
          {categories.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {categories.data && categories.data.length === 0 && (
        <EmptyState title="Aucun type de produit.">
          Lancer <code>uv run ffe db seed</code> dans <code>api/</code> pour les 19 types de départ, ou en créer un.
        </EmptyState>
      )}
      {categories.data && categories.data.length > 0 && (
        <ul className="max-w-3xl divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white" aria-label="Types de produit">
          {categories.data.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-12 font-mono text-xs font-semibold text-neutral-700">{category.code}</span>
              <button type="button" className="flex-1 text-left hover:underline" onClick={() => navigate(`/categories/${category.id}`)}>
                {category.name}
              </button>
              <span className="w-10 text-right text-xs text-neutral-400">{category.sortOrder}</span>
              {category.archivedAt && <Pill>Archivé</Pill>}
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => toggle(category)}
                aria-label={`${category.archivedAt ? 'Restaurer' : 'Archiver'} ${category.name}`}
              >
                {category.archivedAt ? 'Restaurer' : 'Archiver'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
