// « Devis » tab: quotes of the project (one supplier each), their lines per project item, retain one line per item,
// attached PDFs. Net and net EUR come from the server (money.py), never computed here.
import { useRef, useState } from 'react'
import { isApiError } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/product'
import { useProjectItems } from '../../api/queries/projectItem'
import {
  useAddQuoteLine,
  useAttachQuoteFile,
  useCreateQuote,
  useDeclineQuote,
  useDeleteQuote,
  useDeleteQuoteLine,
  useDetachQuoteFile,
  useProjectQuotes,
  useRetainQuoteLine,
  type QuoteRead,
} from '../../api/queries/quote'
import { useSuppliers } from '../../api/queries/supplier'
import { bpToText, textToBp } from '../../components/forms/BpField'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { CURRENCIES } from '../suppliers/SupplierForm'

const ALL = { q: '', limit: 200, offset: 0, includeArchived: false }
const control = 'rounded border border-neutral-300 px-2 py-1 text-sm'

function errorText(error: unknown): string {
  return isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error)
}

function NewQuoteForm({ projectId, onDone }: { projectId: number; onDone: () => void }) {
  const suppliers = useSuppliers(ALL)
  const create = useCreateQuote()
  const toast = useToast()
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [quotedOn, setQuotedOn] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [currency, setCurrency] = useState('')
  const [fxRate, setFxRate] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const fx = fxRate.trim() === '' ? null : Math.round(Number(fxRate.replace(',', '.')) * 1_000_000)
    if (fx !== null && (!Number.isFinite(fx) || fx < 1)) return setError('Taux de change invalide.')
    try {
      await create.mutateAsync({
        projectId,
        data: {
          supplierId: Number(supplierId),
          reference,
          quotedOn: quotedOn || null,
          validUntil: validUntil || null,
          currency: currency || null,
          fxRateMicro: fx,
          notes: null,
          lines: [],
        },
      })
      toast.show({ kind: 'success', message: 'Devis créé.' })
      onDone()
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <div className="space-y-2 rounded border border-neutral-300 bg-white p-3" aria-label="Nouveau devis">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col">
          Fournisseur
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={control} aria-label="Fournisseur du devis">
            <option value="">—</option>
            {(suppliers.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Référence
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={control} aria-label="Référence du devis" />
        </label>
        <label className="flex flex-col">
          Date du devis
          <input type="date" value={quotedOn} onChange={(e) => setQuotedOn(e.target.value)} className={control} aria-label="Date du devis" />
        </label>
        <label className="flex flex-col">
          Valide jusqu’au
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={control} aria-label="Validité du devis" />
        </label>
        <label className="flex flex-col">
          Devise
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={control} aria-label="Devise du devis">
            <option value="">celle du fournisseur</option>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Taux (1 unité = … €)
          <input
            value={fxRate}
            onChange={(e) => setFxRate(e.target.value)}
            className={`${control} w-28`}
            placeholder="vide = dernier connu"
            aria-label="Taux de change du devis"
          />
        </label>
        <Button variant="primary" onClick={() => void submit()} disabled={create.isPending || !supplierId || !reference.trim()}>
          Créer le devis
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

function AddLineRow({ quote, projectId }: { quote: QuoteRead; projectId: number }) {
  const items = useProjectItems(projectId)
  const add = useAddQuoteLine()
  const [itemId, setItemId] = useState('')
  const [cost, setCost] = useState('')
  const [discount, setDiscount] = useState('0')
  const [weeks, setWeeks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const candidates = (items.data ?? []).filter((i) => !quote.lines.some((l) => l.projectItemId === i.id) && i.status !== 'cancelled' && i.status !== 'replaced')

  async function submit() {
    setError(null)
    const cents = textToCents(cost)
    const bp = textToBp(discount)
    if (cents === undefined || cents === null) return setError('Prix unitaire invalide.')
    if (bp === undefined) return setError('Remise invalide.')
    try {
      await add.mutateAsync({
        quoteId: quote.id,
        data: {
          projectItemId: Number(itemId),
          unitCostCents: cents,
          discountBp: bp ?? 0,
          leadTimeWeeks: weeks.trim() === '' ? null : Number(weeks),
          description: null,
          notes: null,
        },
      })
      setItemId('')
      setCost('')
      setWeeks('')
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex flex-col">
        Article
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={control} aria-label={`Article à chiffrer (${quote.reference})`}>
          <option value="">—</option>
          {candidates.map((i) => (
            <option key={i.id} value={i.id}>
              {i.itemCode} — {i.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        PU {quote.currency}
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className={`${control} w-24 text-right`}
          inputMode="decimal"
          aria-label={`Prix unitaire (${quote.reference})`}
        />
      </label>
      <label className="flex flex-col">
        Remise %
        <input
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className={`${control} w-16 text-right`}
          inputMode="decimal"
          aria-label={`Remise (${quote.reference})`}
        />
      </label>
      <label className="flex flex-col">
        Délai (sem.)
        <input
          value={weeks}
          onChange={(e) => setWeeks(e.target.value)}
          className={`${control} w-16 text-right`}
          inputMode="numeric"
          aria-label={`Délai (${quote.reference})`}
        />
      </label>
      <Button onClick={() => void submit()} disabled={add.isPending || !itemId}>
        Ajouter la ligne
      </Button>
      {error && (
        <span role="alert" className="text-red-700">
          {error}
        </span>
      )}
    </div>
  )
}

function QuoteCard({ quote, projectId, readOnly }: { quote: QuoteRead; projectId: number; readOnly: boolean }) {
  const retain = useRetainQuoteLine()
  const removeLine = useDeleteQuoteLine()
  const decline = useDeclineQuote()
  const remove = useDeleteQuote()
  const upload = useUploadFile()
  const attach = useAttachQuoteFile()
  const detach = useDetachQuoteFile()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const locked = readOnly || quote.declinedAt !== null

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      toast.show({ kind: 'success', message: success })
    } catch (e) {
      toast.show({ kind: 'error', message: errorText(e), persistent: true })
    }
  }

  async function addFiles(files: FileList) {
    for (const file of Array.from(files)) {
      try {
        const stored = await upload.mutateAsync(file)
        await attach.mutateAsync({ quoteId: quote.id, fileId: stored.id })
      } catch (e) {
        toast.show({ kind: 'error', message: errorText(e), persistent: true })
      }
    }
  }

  return (
    <article
      className={`space-y-2 rounded border p-3 ${quote.declinedAt ? 'border-neutral-200 bg-neutral-50 text-neutral-500' : 'border-neutral-300 bg-white'}`}
      aria-label={`Devis ${quote.reference}`}
    >
      <header className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">{quote.supplierName}</span>
        <span className="font-mono text-xs">{quote.reference}</span>
        <span className="text-xs text-neutral-500">
          {quote.quotedOn ?? '—'} → {quote.validUntil ?? '—'} · {quote.currency}
          {quote.currency !== 'EUR' && ` (1 = ${(quote.fxRateMicro / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 6 })} €)`}
        </span>
        {quote.retainedCount > 0 && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">{quote.retainedCount} retenue(s)</span>}
        {quote.declinedAt && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">écarté</span>}
        {!readOnly && (
          <span className="ml-auto flex gap-1">
            {!quote.declinedAt && (
              <Button variant="ghost" onClick={() => void run(() => decline.mutateAsync(quote.id), 'Devis écarté.')}>
                Écarter
              </Button>
            )}
            {quote.retainedCount === 0 && (
              <Button variant="ghost" onClick={() => void run(() => remove.mutateAsync(quote.id), 'Devis supprimé.')}>
                Supprimer
              </Button>
            )}
          </span>
        )}
      </header>
      <table className="w-full text-xs" aria-label={`Lignes du devis ${quote.reference}`}>
        <thead>
          <tr className="border-b border-neutral-200 text-left uppercase text-neutral-500">
            <th className="px-1 py-1">Article</th>
            <th className="px-1 py-1 text-right">PU {quote.currency}</th>
            <th className="px-1 py-1 text-right">Remise</th>
            <th className="px-1 py-1 text-right">Net {quote.currency}</th>
            <th className="px-1 py-1 text-right">Net €</th>
            <th className="px-1 py-1 text-right">Délai</th>
            <th className="px-1 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.length === 0 && (
            <tr>
              <td colSpan={7} className="px-1 py-2 text-neutral-400">
                Aucune ligne.
              </td>
            </tr>
          )}
          {quote.lines.map((line) => (
            <tr
              key={line.id}
              className={`border-b border-neutral-100 ${line.retainedAt ? 'bg-green-50 font-medium' : ''}`}
              aria-label={`${line.itemCode} chez ${quote.supplierName}`}
            >
              <td className="px-1 py-1">
                <span className="font-mono">{line.itemCode}</span> {line.itemName}
              </td>
              <td className="px-1 py-1 text-right">{centsToText(line.unitCostCents)}</td>
              <td className="px-1 py-1 text-right">{line.discountBp ? `${bpToText(line.discountBp)} %` : ''}</td>
              <td className="px-1 py-1 text-right">{centsToText(line.netUnitCents)}</td>
              <td className="px-1 py-1 text-right">{centsToText(line.netUnitEurCents)}</td>
              <td className="px-1 py-1 text-right">{line.leadTimeWeeks !== null ? `${line.leadTimeWeeks} sem.` : ''}</td>
              <td className="px-1 py-1 text-right whitespace-nowrap">
                {line.retainedAt ? (
                  <span className="text-green-800">retenue</span>
                ) : (
                  !locked && (
                    <>
                      <Button
                        onClick={() => void run(() => retain.mutateAsync(line.id), `Devis ${quote.reference} retenu pour ${line.itemCode}.`)}
                        aria-label={`Retenir ${line.itemCode} chez ${quote.supplierName}`}
                      >
                        Retenir
                      </Button>{' '}
                      <Button
                        variant="ghost"
                        onClick={() => void run(() => removeLine.mutateAsync(line.id), 'Ligne retirée.')}
                        aria-label={`Retirer ${line.itemCode} du devis ${quote.reference}`}
                      >
                        ✕
                      </Button>
                    </>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!locked && <AddLineRow quote={quote} projectId={projectId} />}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {quote.files.map((file) => (
          <a
            key={file.fileId}
            href={fileContentUrl(file.fileId)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-neutral-200 px-2 py-0.5 underline"
          >
            {file.originalName}
            {!locked && (
              <button
                type="button"
                className="ml-1 text-neutral-500"
                aria-label={`Retirer le fichier ${file.originalName}`}
                onClick={(e) => (e.preventDefault(), void detach.mutateAsync({ quoteId: quote.id, fileId: file.fileId }))}
              >
                ✕
              </button>
            )}
          </a>
        ))}
        {!locked && (
          <>
            <button type="button" className="underline" onClick={() => input.current?.click()} disabled={upload.isPending}>
              joindre le PDF
            </button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              aria-label={`Fichiers du devis ${quote.reference}`}
              onChange={(e) => e.target.files && void addFiles(e.target.files)}
            />
          </>
        )}
      </div>
    </article>
  )
}

export function QuotesTab({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const quotes = useProjectQuotes(projectId)
  const [adding, setAdding] = useState(false)
  if (quotes.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (quotes.isError) return <EmptyState title="Impossible de charger les devis">{quotes.error.message}</EmptyState>
  return (
    <section className="space-y-3">
      {!readOnly && !adding && (
        <div className="no-print">
          <Button variant="primary" onClick={() => setAdding(true)}>
            Nouveau devis
          </Button>
        </div>
      )}
      {adding && <NewQuoteForm projectId={projectId} onDone={() => setAdding(false)} />}
      {quotes.data.length === 0 && !adding && <EmptyState title="Aucun devis." />}
      {quotes.data.map((quote) => (
        <QuoteCard key={quote.id} quote={quote} projectId={projectId} readOnly={readOnly} />
      ))}
    </section>
  )
}
