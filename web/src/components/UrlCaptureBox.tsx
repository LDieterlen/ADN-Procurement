// « Coller une adresse » (ADR-0014): paste a product page URL, the server reads it, the user sees
// what was found and decides to use it. The image is downloaded by the server on « Utiliser ».
import { useState } from 'react'
import { isApiError } from '../api/errors'
import { useCaptureImage, usePreviewCapture, type CapturePreviewRead } from '../api/queries/capture'
import { fileContentUrl, type FileRead } from '../api/queries/product'
import { centsToText } from './forms/MoneyField'
import { Button } from './ui/Button'

export type Captured = { preview: CapturePreviewRead; image: FileRead | null }

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
      setCaptured({ preview: found, image: null })
    } catch (e) {
      setError(isApiError(e) ? (e.details[0]?.message ?? e.message) : String(e))
    }
  }

  async function use() {
    if (!captured) return
    let file: FileRead | null = null
    if (captured.preview.imageUrl) {
      try {
        file = await image.mutateAsync(captured.preview.imageUrl)
      } catch {
        file = null // the sheet is still worth using without its photo
      }
    }
    const result = { preview: captured.preview, image: file }
    setCaptured(result)
    onUse(result)
  }

  const p = captured?.preview
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-neutral-700">
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
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <Button onClick={() => void read()} disabled={busy || !url.trim()}>
          Lire la page
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {p && (
        <div className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
          {captured?.image && <img src={fileContentUrl(captured.image.id)} alt="" className="h-20 w-20 rounded-md border border-neutral-200 object-cover" />}
          <div className="flex-1 space-y-0.5">
            <div className="font-medium">{p.name}</div>
            <div className="text-neutral-600">
              {[p.brand, p.reference ? `réf. ${p.reference}` : null, p.priceCents !== null ? `${centsToText(p.priceCents)} ${p.currency ?? ''} affiché` : null]
                .filter(Boolean)
                .join(' · ') || 'Pas de marque, de référence ni de prix lisibles.'}
            </div>
            <div className="text-xs text-neutral-500">
              Source : {SOURCE_LABELS[p.source]}
              {p.imageUrl ? ' · photo trouvée' : ' · pas de photo'}
              {p.priceCents !== null ? ' · prix public, souvent TTC : à corriger en HT' : ''}
            </div>
          </div>
          {!captured?.image && (
            <Button variant="primary" onClick={() => void use()} disabled={busy}>
              Utiliser
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
