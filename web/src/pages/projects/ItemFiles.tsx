// Files of an article, sorted by hand as photo · finish · plan: the main photo prints on the spec sheet, the plan under it.
// A draft (2026-10-15): uploads are stored at once, but attaching, sorting, the main photo and
// removals wait for « Enregistrer » on the article page.
import { useRef } from 'react'
import { isApiError } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/file'
import type { ItemFileRead } from '../../api/queries/projectItem'
import { useToast } from '../../components/ui/Toast'

type FileKind = ItemFileRead['kind']
const KIND_LABELS: Record<FileKind, string> = { image: 'Photo', finish: 'Finition', drawing: 'Plan', other: 'Autre' }
const KIND_CHOICES: FileKind[] = ['image', 'finish', 'drawing']

export function ItemFiles({ files, onChange, readOnly }: { files: ItemFileRead[]; onChange: (files: ItemFileRead[]) => void; readOnly: boolean }) {
  const upload = useUploadFile()
  const toast = useToast()
  const photoInput = useRef<HTMLInputElement>(null)
  const drawingInput = useRef<HTMLInputElement>(null)

  async function add(chosen: FileList | null, kind: FileKind) {
    if (!chosen) return
    let next = files
    for (const file of Array.from(chosen)) {
      try {
        const stored = await upload.mutateAsync(file)
        if (next.some((f) => f.fileId === stored.id)) continue
        next = [
          ...next,
          {
            fileId: stored.id,
            kind,
            isPrimary: kind === 'image' && !next.some((f) => f.isPrimary),
            caption: null,
            sortOrder: next.length,
            sha256: stored.sha256,
            ext: stored.ext,
            mimeType: stored.mimeType,
            originalName: stored.originalName,
            sizeBytes: stored.sizeBytes,
          },
        ]
      } catch (error) {
        toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true })
      }
    }
    onChange(next)
  }
  const patch = (fileId: number, change: Partial<ItemFileRead>) =>
    onChange(
      files.map((f) => {
        if (f.fileId === fileId) return { ...f, ...change, isPrimary: (change.isPrimary ?? f.isPrimary) && (change.kind ?? f.kind) === 'image' }
        return change.isPrimary ? { ...f, isPrimary: false } : f
      }),
    )

  return (
    <div className="space-y-3">
      {(() => {
        const primary = files.find((f) => f.isPrimary && f.mimeType.startsWith('image/'))
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
              Ajouter un plan
            </button>
            <input
              ref={drawingInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              aria-label="Plan à joindre"
              onChange={(e) => void add(e.target.files, 'drawing')}
            />
          </>
        )}
      </div>
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Fichiers de l'article">
          {files.map((file) => (
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
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {readOnly ? (
                  <span>{KIND_LABELS[file.kind]}</span>
                ) : (
                  <select
                    aria-label={`Catégorie de ${file.originalName}`}
                    value={file.kind}
                    className="min-w-0 rounded-[3px] border border-line bg-surface px-0.5 py-px text-[11.5px]"
                    onChange={(e) => patch(file.fileId, { kind: e.target.value as FileKind })}
                  >
                    {[...KIND_CHOICES, ...(KIND_CHOICES.includes(file.kind) ? [] : [file.kind])].map((kind) => (
                      <option key={kind} value={kind}>
                        {KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                )}
                {file.isPrimary && <span className="truncate rounded-[3px] bg-accent-soft px-1 text-accent-ink">Principale</span>}
              </div>
              {!readOnly && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {file.kind === 'image' && !file.isPrimary && (
                    <button type="button" className="text-accent hover:underline" onClick={() => patch(file.fileId, { isPrimary: true })}>
                      Mettre en principale
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-danger hover:underline"
                    aria-label={`Retirer ${file.originalName}`}
                    onClick={() => onChange(files.filter((f) => f.fileId !== file.fileId))}
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
