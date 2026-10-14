// Generic list: columns with a render function, clickable rows, an empty state. Never computes totals.
import type { ReactNode } from 'react'

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode; className?: string }

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  caption,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  empty: ReactNode
  caption?: string
}) {
  if (rows.length === 0) return <>{empty}</>
  return (
    <table className="w-full border-collapse text-sm [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="border-b border-line text-left text-[12.5px] text-ink-2">
          {columns.map((column) => (
            <th key={column.key} scope="col" className={`px-3 py-2.5 font-medium ${column.className ?? ''}`}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`border-b border-line-soft transition-colors duration-[120ms] ${onRowClick ? 'cursor-pointer hover:bg-sunken' : ''}`}
          >
            {columns.map((column) => (
              <td key={column.key} className={`px-3 py-3.5 ${column.className ?? ''}`}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
