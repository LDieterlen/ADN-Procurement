// A photo chosen before the article exists (ADR-0014): read from a page or dropped here. It is
// attached by the page once the article is created.
import { useRef } from 'react'
import { isApiError } from '../api/errors'
import { fileContentUrl, useUploadFile, type FileRead } from '../api/queries/file'
import { useToast } from './ui/Toast'

export function PendingPhoto({ file, onChange, origin }: { file: FileRead | null; onChange: (file: FileRead | null) => void; origin?: string }) {
  const upload = useUploadFile()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)

  async function pick(files: FileList | null) {
    const chosen = files?.[0]
    if (!chosen) return
    try {
      onChange(await upload.mutateAsync(chosen))
    } catch (error) {
      toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true })
    }
  }

  return (
    <div className="flex items-center gap-4" aria-label="Photo">
      {file ? (
        <img src={fileContentUrl(file.id, file.sha256)} alt="Photo" className="h-28 w-28 rounded-[6px] border border-line object-cover" />
      ) : (
        <span className="flex h-28 w-28 items-center justify-center rounded-[6px] border border-dashed border-line-strong text-[12.5px] text-ink-3">
          Pas de photo
        </span>
      )}
      <div className="space-y-1 text-sm">
        <div className="font-medium">Photo</div>
        <div className="text-[12.5px] text-ink-3">
          {file ? (origin ?? 'Jointe à la création.') : 'Une photo peut être déposée maintenant ; elle sera jointe à la création.'}
        </div>
        <div className="flex gap-3 text-[12.5px]">
          <button type="button" className="font-medium text-accent hover:text-accent-hover" onClick={() => input.current?.click()} disabled={upload.isPending}>
            {file ? 'Remplacer' : 'Déposer une photo'}
          </button>
          {file && (
            <button type="button" className="text-danger hover:underline" onClick={() => onChange(null)}>
              Retirer
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Photo à joindre"
          onChange={(e) => void pick(e.target.files)}
        />
      </div>
    </div>
  )
}
