// « Exporter » links of the lines tab (ADR-0009): the browser downloads the xlsx from the API, nothing is
// computed here; the issued exports are listed below with their download links.
import { useQueryClient } from '@tanstack/react-query'
import { fileContentUrl } from '../../api/queries/product'
import { EXPORT_VARIANT_LABELS, exportKeys, scheduleExportUrl, useProjectExports } from '../../api/queries/projectFile'

export function ExportsBar({ projectId }: { projectId: number }) {
  const exports = useProjectExports(projectId)
  const queryClient = useQueryClient()
  const refresh = () => setTimeout(() => void queryClient.invalidateQueries({ queryKey: exportKeys.list(projectId) }), 1500)
  return (
    <div className="no-print space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-neutral-600">Exporter :</span>
        <a href={scheduleExportUrl(projectId, 'internal')} download className="underline" onClick={refresh}>
          Schedule xlsx (interne)
        </a>
        <a href={scheduleExportUrl(projectId, 'client')} download className="underline" onClick={refresh}>
          Schedule xlsx (client)
        </a>
      </div>
      {exports.data && exports.data.length > 0 && (
        <ul className="flex flex-wrap gap-3 text-xs text-neutral-600" aria-label="Exports émis">
          {exports.data.map((e) => (
            <li key={e.id}>
              <a href={fileContentUrl(e.fileId)} download={e.originalName} className="underline">
                {e.originalName}
              </a>{' '}
              ({EXPORT_VARIANT_LABELS[e.variant]}, {e.issuedAt.slice(0, 10)})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
