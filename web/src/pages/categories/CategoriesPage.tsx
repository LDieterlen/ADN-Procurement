// Two-level tree as an indented list: code, name, order, archive/restore, add child (D6a.11).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { isApiError } from '../../api/errors'
import { useArchiveCategory, useCategories, useUnarchiveCategory, type CategoryRead } from '../../api/queries/category'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catégories</h1>
        <Link to="/categories/new">
          <Button variant="primary">Nouvelle catégorie</Button>
        </Link>
      </div>
      <label className="flex items-center gap-1.5 text-sm text-neutral-700">
        <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
        Afficher les archivées
      </label>
      {categories.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {categories.isError && (
        <EmptyState title="Impossible de charger les catégories">
          {categories.error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </EmptyState>
      )}
      {categories.data && categories.data.length === 0 && (
        <EmptyState title="Aucune catégorie.">
          Lancer <code>uv run ffe db seed</code> dans <code>api/</code> pour les 13 catégories de départ, ou en créer une.
        </EmptyState>
      )}
      {categories.data && categories.data.length > 0 && (
        <ul className="max-w-3xl divide-y divide-neutral-200 rounded border border-neutral-200 bg-white" aria-label="Arbre des catégories">
          {categories.data.map((category) => {
            const child = category.parentId !== null
            return (
              <li key={category.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${child ? 'pl-10' : ''}`}>
                <span className={`w-12 font-mono text-xs ${child ? 'text-neutral-400' : 'font-semibold text-neutral-700'}`}>{category.code ?? '·'}</span>
                <button type="button" className="flex-1 text-left hover:underline" onClick={() => navigate(`/categories/${category.id}`)}>
                  {category.name}
                </button>
                <span className="w-10 text-right text-xs text-neutral-400">{category.sortOrder}</span>
                {category.archivedAt && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">Archivée</span>}
                {!child && !category.archivedAt && (
                  <Link to={`/categories/new?parent=${category.id}`} className="text-xs text-neutral-600 hover:underline">
                    + sous-catégorie
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => toggle(category)}
                  aria-label={`${category.archivedAt ? 'Restaurer' : 'Archiver'} ${category.name}`}
                >
                  {category.archivedAt ? 'Restaurer' : 'Archiver'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
