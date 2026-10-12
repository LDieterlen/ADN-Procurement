// Photo and drawing of a line (ADR-0012): the main photo prints on the prescription sheet, the drawing under it.
import { useRef } from 'react'
import { isApiError } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/product'
import { useAttachItemFile, useDetachItemFile, useUpdateItemFile, type ProjectItemRead } from '../../api/queries/projectItem'
import { useToast } from '../../components/ui/Toast'

const KIND_LABELS = { image: 'Photo', drawing: 'Dessin', quote: 'Devis', approval: 'Validation', other: 'Autre' } as const

export function ItemFiles({ item, readOnly }: { item: ProjectItemRead; readOnly: boolean }) {
  const upload = useUploadFile()
  const attach = useAttachItemFile()
  const update = useUpdateItemFile()
  const detach = useDetachItemFile()
  const toast = useToast()
  const photoInput = useRef<HTMLInputElement>(null)
  const drawingInput = useRef<HTMLInputElement>(null)

  async function add(files: FileList | null, kind: 'image' | 'drawing') {
    if (!files) return
    for (const file of Array.from(files)) {
      try {
        const stored = await upload.mutateAsync(file)
        const noPrimaryYet = !item.files.some((f) => f.isPrimary)
        await attach.mutateAsync({
          itemId: item.id,
          data: { fileId: stored.id, kind, isPrimary: kind === 'image' && noPrimaryYet, caption: null, sortOrder: 0 },
        })
      } catch (error) {
        toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true })
      }
    }
  }

  return (
    <section className="space-y-2 border-t border-neutral-200 pt-3" aria-label="Photo et dessin">
      <div className="flex items-center gap-3 text-sm">
        <h3 className="font-medium">Photo et dessin</h3>
        {!readOnly && (
          <>
            <button type="button" className="underline" onClick={() => photoInput.current?.click()} disabled={upload.isPending}>
              ajouter une photo
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Photo à joindre"
              onChange={(e) => void add(e.target.files, 'image')}
            />
            <button type="button" className="underline" onClick={() => drawingInput.current?.click()} disabled={upload.isPending}>
              ajouter un dessin
            </button>
            <input
              ref={drawingInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              aria-label="Dessin à joindre"
              onChange={(e) => void add(e.target.files, 'drawing')}
            />
          </>
        )}
      </div>
      {item.files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Fichiers de la ligne">
          {item.files.map((file) => (
            <li key={file.fileId} className="space-y-1 rounded border border-neutral-200 p-2 text-xs">
              {file.mimeType.startsWith('image/') ? (
                <img src={fileContentUrl(file.fileId)} alt={file.caption ?? file.originalName} className="h-24 w-full rounded object-contain" />
              ) : (
                <a
                  href={fileContentUrl(file.fileId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-24 items-center justify-center rounded bg-neutral-100 underline"
                >
                  {file.originalName}
                </a>
              )}
              <div className="flex items-center justify-between">
                <span>{KIND_LABELS[file.kind]}</span>
                {file.isPrimary && <span className="rounded bg-green-100 px-1 text-green-800">Principale</span>}
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  {file.kind === 'image' && !file.isPrimary && (
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void update.mutateAsync({ itemId: item.id, fileId: file.fileId, data: { isPrimary: true } })}
                    >
                      Principale
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-red-700 underline"
                    aria-label={`Retirer ${file.originalName}`}
                    onClick={() => void detach.mutateAsync({ itemId: item.id, fileId: file.fileId })}
                  >
                    Retirer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
