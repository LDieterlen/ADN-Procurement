// Photo and drawing of an article (ADR-0012): the main photo prints on the spec sheet, the drawing under it.
import { useRef } from 'react'
import { isApiError } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/file'
import { useAttachItemFile, useDetachItemFile, useUpdateItemFile, type ProjectItemRead } from '../../api/queries/projectItem'
import { useToast } from '../../components/ui/Toast'

const KIND_LABELS = { image: 'Photo', drawing: 'Dessin', other: 'Autre' } as const

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
    <div className="space-y-3">
      {(() => {
        const primary = item.files.find((f) => f.isPrimary && f.mimeType.startsWith('image/'))
        return primary ? (
          <img
            src={fileContentUrl(primary.fileId, primary.sha256)}
            alt={primary.caption ?? primary.originalName}
            className="aspect-square w-full rounded-[6px] border border-line object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-[6px] border border-dashed border-line-strong text-[12.5px] text-ink-3">
            Pas de photo principale
          </div>
        )
      })()}
      <div className="flex items-center gap-3 text-[12.5px]">
        {!readOnly && (
          <>
            <button
              type="button"
              className="font-medium text-accent hover:text-accent-hover"
              onClick={() => photoInput.current?.click()}
              disabled={upload.isPending}
            >
              Ajouter une photo
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Photo à joindre"
              onChange={(e) => void add(e.target.files, 'image')}
            />
            <button
              type="button"
              className="font-medium text-accent hover:text-accent-hover"
              onClick={() => drawingInput.current?.click()}
              disabled={upload.isPending}
            >
              Ajouter un dessin
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
        <ul className="grid grid-cols-3 gap-2" aria-label="Fichiers de l'article">
          {item.files.map((file) => (
            <li key={file.fileId} className="space-y-1 rounded-[6px] border border-line p-1.5 text-[11.5px]">
              {file.mimeType.startsWith('image/') ? (
                <img
                  src={fileContentUrl(file.fileId, file.sha256)}
                  alt={file.caption ?? file.originalName}
                  className="aspect-square w-full rounded-[4px] object-cover"
                />
              ) : (
                <a
                  href={fileContentUrl(file.fileId, file.sha256)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-square items-center justify-center rounded-[4px] bg-sunken px-1 text-center text-[11px] break-all"
                >
                  {file.originalName}
                </a>
              )}
              {(file.isPrimary || file.kind !== 'image') && (
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  {file.kind !== 'image' && <span>{KIND_LABELS[file.kind]}</span>}
                  {file.isPrimary && <span className="truncate rounded-[3px] bg-accent-soft px-1 text-accent-ink">Principale</span>}
                </div>
              )}
              {!readOnly && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {file.kind === 'image' && !file.isPrimary && (
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => void update.mutateAsync({ itemId: item.id, fileId: file.fileId, data: { isPrimary: true } })}
                    >
                      Mettre en principale
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-danger hover:underline"
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
    </div>
  )
}
