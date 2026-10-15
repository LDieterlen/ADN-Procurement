// The main photo of an article as a small square: whole product on white (never cropped), or a
// dashed empty square without photo. One size scale for the whole app.
import { fileContentUrl } from '../api/queries/file'
import type { ItemFileRead } from '../api/queries/projectItem'

const SIZES = { xs: 'h-6 w-6 rounded-[4px]', sm: 'h-10 w-10 rounded-[5px]', md: 'h-14 w-14 rounded-[5px]' } as const

/** The article's main photo, if any. */
export function primaryPhoto(files: ItemFileRead[]): ItemFileRead | undefined {
  return files.find((f) => f.isPrimary)
}

export function Thumb({ files, size = 'sm', alt = '' }: { files: ItemFileRead[]; size?: keyof typeof SIZES; alt?: string }) {
  const photo = primaryPhoto(files)
  return photo ? (
    <img src={fileContentUrl(photo.fileId, photo.sha256)} alt={alt} className={`${SIZES[size]} shrink-0 border border-line bg-surface object-contain`} />
  ) : (
    <span className={`${SIZES[size]} block shrink-0 border border-dashed border-line-strong bg-sunken`} />
  )
}
