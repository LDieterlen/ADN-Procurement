// « Coller une adresse » (ADR-0014): paste a product page URL, the server reads it, the user sees
// what was found and decides to use it. Every photo of the page is downloaded by the server on
// « Utiliser » (same as the Chrome extension); a photo that cannot be downloaded is skipped.
import { useState } from 'react'
import { isApiError } from '../api/errors'
import { useCaptureImage, usePreviewCapture, type CapturePreviewRead } from '../api/queries/capture'
import { fileContentUrl, type FileRead } from '../api/queries/file'
import { centsToText } from './forms/MoneyField'
import { Button } from './ui/Button'

export type Captured = { preview: CapturePreviewRead; images: FileRead[] }

const SOURCE_LABELS = { 'json-ld': 'données structurées de la page', opengraph: 'balises OpenGraph', title: 'titre de la page seulement' } as const

export function UrlCaptureBox({ onUse }: { onUse: (captured: Captured) => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<Captured | null>(null)
  const preview = usePreviewCapture()
  const image = useCaptureImage()
  const busy = preview.isPending || image.isPending

  async function read() {
    setError(null)
    setCaptured(null)
    try {
      const found = await preview.mutateAsync(url.trim())
      setCaptured({ preview: found, images: [] })
    } catch (e) {
      setError(isApiError(e) ? (e.details[0]?.message ?? e.message) : String(e))
    }
  }

  async function use() {
    if (!captured) return
    const urls = captured.preview.imageUrls.length ? captured.preview.imageUrls : captured.preview.imageUrl ? [captured.preview.imageUrl] : []
    const files: FileRead[] = []
    for (const photoUrl of urls) {
      try {
        const file = await image.mutateAsync(photoUrl)
        if (!files.some((f) => f.id === file.id)) files.push(file)
      } catch {
        // a photo the server cannot download is skipped: the sheet is still worth using
      }
    }
    const result = { preview: captured.preview, images: files }
    setCaptured(result)
    onUse(result)
  }

  const p = captured?.preview
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-ink-2">
          Adresse de la fiche produit
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void read()
              }
            }}
            placeholder="Coller l'adresse d'une page produit…"
            className="control h-10 font-mono text-[13px] font-normal"
          />
        </label>
        <Button variant="primary" className="h-10" onClick={() => void read()} disabled={busy || !url.trim()}>
          Lire la page
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {p && (
        <div className="flex items-start gap-4 rounded-lg border border-line bg-sunken p-3 text-sm">
          {captured?.images[0] && (
            <img
              src={fileContentUrl(captured.images[0].id, captured.images[0].sha256)}
              alt=""
              className="h-20 w-20 rounded-[5px] border border-line object-cover"
            />
          )}
          <div className="flex-1 space-y-0.5">
            <div className="font-medium">{p.name}</div>
            <div className="text-ink-2">
              {[p.brand, p.reference ? `réf. ${p.reference}` : null, p.priceCents !== null ? `${centsToText(p.priceCents)} ${p.currency ?? ''} affiché` : null]
                .filter(Boolean)
                .join(' · ') || 'Pas de marque, de référence ni de prix lisibles.'}
            </div>
            <div className="text-[12.5px] text-ink-3">
              Source : {SOURCE_LABELS[p.source]}
              {p.imageUrls.length > 1 ? ` · ${p.imageUrls.length} photos trouvées` : p.imageUrl ? ' · photo trouvée' : ' · pas de photo'}
              {p.priceCents !== null ? ' · prix public, souvent TTC : à corriger en HT' : ''}
            </div>
          </div>
          {!captured?.images[0] && (
            <Button variant="primary" onClick={() => void use()} disabled={busy}>
              Utiliser
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
