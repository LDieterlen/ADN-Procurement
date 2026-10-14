// Every list of the program in the same frame (design of the projects table): a card glued to the
// table, the loading / error / empty states inside it, pagination and an optional footer below.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '../ui/Card'
import { Pagination } from '../ui/Pagination'
import { DataTable, type Column } from './DataTable'

export function TableCard<T>({
  label,
  caption,
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  error,
  empty,
  page,
  footer,
}: {
  label: string
  caption: string
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: { title: string; message: string } | null
  empty: string
  page?: { offset: number; limit: number; total: number; onChange: (offset: number) => void }
  footer?: ReactNode
}) {
  return (
    <Card padding="table" label={label}>
      {loading && <p className="px-5 py-6 text-sm text-ink-3">Chargement…</p>}
      {error && (
        <p className="px-5 py-6 text-sm text-ink-2">
          <span className="font-medium text-danger">{error.title}</span> · {error.message}{' '}
          <Link to="/health" className="underline">
            Voir la page Santé
          </Link>
        </p>
      )}
      {rows && rows.length === 0 && <p className="px-5 py-6 text-sm text-ink-2">{empty}</p>}
      {rows && rows.length > 0 && <DataTable caption={caption} columns={columns} rows={rows} rowKey={rowKey} onRowClick={onRowClick} empty={null} />}
      {page && page.total > page.limit && (
        <div className="border-t border-line px-5 py-2.5">
          <Pagination {...page} />
        </div>
      )}
      {footer && <div className="border-t border-line bg-sunken px-5 py-3">{footer}</div>}
    </Card>
  )
}

/** The archived marker column, identical in every list. */
export function archivedColumn<T extends { archivedAt: string | null }>(): Column<T> {
  return {
    key: 'archived',
    header: '',
    className: 'w-24 text-right',
    render: (row) => (row.archivedAt ? <span className="rounded-[4px] bg-track px-1.5 py-0.5 text-xs text-ink-2">Archivé</span> : null),
  }
}
