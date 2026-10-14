// « Listes » : every editable list of the program — product types (code + name, ADR-0013) and the
// value lists (familles, usages, prestations, 2026-10-14). Same frame as every list (TableCard).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { isApiError } from '../../api/errors'
import { useArchiveCategory, useCategories, useUnarchiveCategory, type CategoryRead } from '../../api/queries/category'
import { type Column } from '../../components/tables/DataTable'
import { ListToolbar } from '../../components/tables/ListToolbar'
import { TableCard, archivedColumn } from '../../components/tables/TableCard'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/Card'
import { Segmented } from '../../components/ui/Segmented'
import { useToast } from '../../components/ui/Toast'
import { ChoicesSection } from './ChoicesSection'

type Tab = 'types' | 'family' | 'usage' | 'prestation'
const TABS: { value: Tab; label: string }[] = [
  { value: 'types', label: 'Types de produit' },
  { value: 'family', label: 'Familles' },
  { value: 'usage', label: 'Usages' },
  { value: 'prestation', label: 'Prestations' },
]

export function CategoriesPage() {
  // One list at a time; the tab lives in the address (?liste=family) so a reload or a link keeps it.
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.some((t) => t.value === params.get('liste')) ? (params.get('liste') as Tab) : 'types'
  const [includeArchived, setIncludeArchived] = useState(false)

  return (
    <section>
      <PageHeader
        title="Listes"
        subtitle="Les valeurs proposées dans les menus : types de produit, familles, usages, prestations"
        actions={
          tab === 'types' && (
            <Link to="/categories/new">
              <Button variant="primary">Nouveau type</Button>
            </Link>
          )
        }
      />
      <ListToolbar
        filters={<Segmented label="Liste affichée" value={tab} onChange={(value) => setParams(value === 'types' ? {} : { liste: value })} options={TABS} />}
        archived={{ value: includeArchived, onChange: setIncludeArchived }}
      />
      {tab === 'types' ? <TypesTable includeArchived={includeArchived} /> : <ChoicesSection key={tab} list={tab} includeArchived={includeArchived} />}
    </section>
  )
}

function TypesTable({ includeArchived }: { includeArchived: boolean }) {
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

  const columns: Column<CategoryRead>[] = [
    { key: 'code', header: 'Code', className: 'w-24 font-mono text-xs font-semibold text-ink-2', render: (c) => c.code },
    { key: 'name', header: 'Nom', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'order', header: 'Ordre', className: 'w-20 text-right tabular-nums text-ink-2', render: (c) => String(c.sortOrder) },
    archivedColumn<CategoryRead>(),
    {
      key: 'action',
      header: '',
      className: 'w-28 text-right',
      render: (c) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={(event) => {
            event.stopPropagation()
            toggle(c)
          }}
          aria-label={`${c.archivedAt ? 'Restaurer' : 'Archiver'} ${c.name}`}
        >
          {c.archivedAt ? 'Restaurer' : 'Archiver'}
        </Button>
      ),
    },
  ]

  return (
    <TableCard
      label="Types de produit"
      caption="Types de produit"
      columns={columns}
      rows={categories.data}
      rowKey={(c) => c.id}
      onRowClick={(c) => navigate(`/categories/${c.id}`)}
      loading={categories.isPending}
      error={categories.isError ? { title: 'Impossible de charger les types', message: categories.error.message } : null}
      empty="Aucun type de produit. Lancer « uv run ffe db seed » dans api/ pour les 21 types de départ, ou en créer un."
      footer={<span className="text-xs text-ink-3">Le code du type préfixe le code FF&E des articles.</span>}
    />
  )
}
