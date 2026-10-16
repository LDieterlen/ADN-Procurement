// A logo picked from an image uploaded at once (JPEG, PNG, WebP), kept in the form as a file id and
// attached on save: the procurement company of a project, the agency of the settings.
import { useRef } from 'react'
import { useController, useFormContext, type FieldValues, type Path } from 'react-hook-form'
import { isApiError } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/file'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

export function LogoField<T extends FieldValues>({ name, label, alt, hint }: { name: Path<T>; label: string; alt: string; hint?: string }) {
  const { control } = useFormContext<T>()
  const { field } = useController({ name, control })
  const value = field.value as number | null
  const upload = useUploadFile()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{label}</div>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={fileContentUrl(value)} alt={alt} className="h-12 max-w-[140px] rounded border border-line bg-surface object-contain p-1" />
        ) : (
          <span className="flex h-12 w-24 items-center justify-center rounded border border-dashed border-line-strong bg-sunken text-xs text-ink-3">Aucun</span>
        )}
        <Button size="xs" onClick={() => input.current?.click()} disabled={upload.isPending}>
          {value ? 'Changer' : 'Déposer un logo'}
        </Button>
        {value !== null && (
          <Button size="xs" variant="ghost" onClick={() => field.onChange(null)}>
            Retirer
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label={`${label} à déposer`}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            upload
              .mutateAsync(file)
              .then((stored) => field.onChange(stored.id))
              .catch((error: unknown) =>
                toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true }),
              )
          }}
        />
      </div>
      {hint && <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>}
    </div>
  )
}
