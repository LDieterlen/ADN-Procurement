// A photo chosen before the record exists (ADR-0014): read from a page, taken from the catalogue
// product, or dropped here. It is attached by the page once the article or product is created.
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
        <img src={fileContentUrl(file.id)} alt="Photo" className="h-28 w-28 rounded-md border border-neutral-200 object-contain" />
      ) : (
        <span className="flex h-28 w-28 items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">
          Pas de photo
        </span>
      )}
      <div className="space-y-1 text-sm">
        <div className="font-medium">Photo</div>
        <div className="text-xs text-neutral-500">
          {file ? (origin ?? 'Jointe à la création.') : 'Une photo peut être déposée maintenant ; elle sera jointe à la création.'}
        </div>
        <div className="flex gap-3 text-xs">
          <button type="button" className="underline" onClick={() => input.current?.click()} disabled={upload.isPending}>
            {file ? 'Remplacer' : 'Déposer une photo'}
          </button>
          {file && (
            <button type="button" className="text-red-700 underline" onClick={() => onChange(null)}>
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
