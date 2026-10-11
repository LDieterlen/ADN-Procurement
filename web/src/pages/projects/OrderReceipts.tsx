// « Réceptions » and « Factures » of one purchase order (ADR-0008), shown inside the order card.
// Quantities and amounts are typed by the user; remaining quantities and EUR figures come from the server.
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { useCreateDelivery, useDeleteDelivery, useDeliveries } from '../../api/queries/delivery'
import type { PoRead } from '../../api/queries/purchaseOrder'
import { INVOICE_KIND_LABELS, useCreateInvoice, useDeleteInvoice, useInvoices, usePayInvoice, type InvoiceKind } from '../../api/queries/supplierInvoice'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { milliToText, textToMilli } from '../../components/forms/QuantityField'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

const control = 'rounded border border-neutral-300 px-2 py-1 text-sm'

function errorText(error: unknown): string {
  return isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error)
}

export function ReceiptsSection({ po, readOnly }: { po: PoRead; readOnly: boolean }) {
  const deliveries = useDeliveries(po.id)
  const create = useCreateDelivery()
  const remove = useDeleteDelivery()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [receivedOn, setReceivedOn] = useState('')
  const [reference, setReference] = useState('')
  const [qty, setQty] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const remaining = po.lines.filter((l) => l.receivedQtyMilli < l.qtyMilli)
  const receivable = !readOnly && po.status !== 'draft' && po.status !== 'cancelled' && remaining.length > 0

  function startAdding() {
    setQty(Object.fromEntries(remaining.map((l) => [l.id, milliToText(l.qtyMilli - l.receivedQtyMilli)])))
    setAdding(true)
  }

  async function submit() {
    setError(null)
    const lines: { purchaseOrderLineId: number; qtyMilli: number; remarks: string | null }[] = []
    for (const line of remaining) {
      const milli = textToMilli(qty[line.id] ?? '')
      if (milli === undefined) return setError(`Quantité invalide pour ${line.itemCode}.`)
      if (milli === null || milli === 0) continue
      lines.push({ purchaseOrderLineId: line.id, qtyMilli: milli, remarks: null })
    }
    if (lines.length === 0) return setError('Aucune quantité reçue.')
    try {
      await create.mutateAsync({ poId: po.id, data: { receivedOn, reference: reference || null, notes: null, lines } })
      toast.show({ kind: 'success', message: 'Réception enregistrée.' })
      setAdding(false)
      setReference('')
      setReceivedOn('')
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <section className="space-y-1 border-t border-neutral-200 pt-2 text-xs" aria-label={`Réceptions ${po.number}`}>
      <div className="flex items-center gap-2">
        <h4 className="font-medium">Réceptions</h4>
        {receivable && !adding && (
          <Button variant="ghost" onClick={startAdding}>
            Réceptionner
          </Button>
        )}
      </div>
      {(deliveries.data ?? []).map((d) => (
        <p key={d.id} className="flex flex-wrap items-center gap-2">
          <span>
            {d.receivedOn} {d.reference ? `· ${d.reference}` : ''} : {d.lines.map((l) => `${l.itemCode} × ${milliToText(l.qtyMilli)}`).join(', ')}
          </span>
          {!readOnly && (
            <button
              type="button"
              className="text-neutral-500 underline"
              aria-label={`Supprimer la réception ${d.reference ?? d.receivedOn}`}
              onClick={() =>
                remove
                  .mutateAsync(d.id)
                  .then(() => toast.show({ kind: 'success', message: 'Réception supprimée (correction).' }))
                  .catch((e: unknown) => toast.show({ kind: 'error', message: errorText(e), persistent: true }))
              }
            >
              supprimer
            </button>
          )}
        </p>
      ))}
      {adding && (
        <div className="space-y-1 rounded border border-neutral-200 p-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col">
              Reçu le
              <input
                type="date"
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
                className={control}
                aria-label={`Date de réception ${po.number}`}
              />
            </label>
            <label className="flex flex-col">
              Bon de livraison
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={control} aria-label={`Référence de réception ${po.number}`} />
            </label>
          </div>
          {remaining.map((line) => (
            <label key={line.id} className="flex items-center gap-2">
              <span className="w-56">
                <span className="font-mono">{line.itemCode}</span> {line.description} (reste {milliToText(line.qtyMilli - line.receivedQtyMilli)})
              </span>
              <input
                value={qty[line.id] ?? ''}
                onChange={(e) => setQty({ ...qty, [line.id]: e.target.value })}
                className={`${control} w-20 text-right`}
                inputMode="decimal"
                aria-label={`Quantité reçue ${line.itemCode}`}
              />
            </label>
          ))}
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void submit()} disabled={create.isPending || !receivedOn}>
              Enregistrer la réception
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Annuler
            </Button>
            {error && (
              <span role="alert" className="text-red-700">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export function InvoicesSection({ po, readOnly }: { po: PoRead; readOnly: boolean }) {
  const invoices = useInvoices(po.id)
  const create = useCreateInvoice()
  const pay = usePayInvoice()
  const remove = useDeleteInvoice()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<InvoiceKind>('balance')
  const [reference, setReference] = useState('')
  const [invoicedOn, setInvoicedOn] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [ht, setHt] = useState('')
  const [vat, setVat] = useState('0')
  const [paying, setPaying] = useState<{ id: number; on: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const editable = !readOnly && po.status !== 'cancelled'

  async function submit() {
    setError(null)
    const htCents = textToCents(ht)
    const vatCents = textToCents(vat)
    if (htCents === undefined || htCents === null) return setError('Montant HT invalide.')
    if (vatCents === undefined) return setError('TVA invalide.')
    try {
      await create.mutateAsync({
        poId: po.id,
        data: { kind, reference, invoicedOn, dueOn: dueOn || null, amountHtCents: htCents, vatCents: vatCents ?? 0, notes: null },
      })
      toast.show({ kind: 'success', message: 'Facture enregistrée.' })
      setAdding(false)
      setReference('')
      setHt('')
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <section className="space-y-1 border-t border-neutral-200 pt-2 text-xs" aria-label={`Factures ${po.number}`}>
      <div className="flex items-center gap-2">
        <h4 className="font-medium">Factures</h4>
        <span className="text-neutral-500">
          facturé {centsToText(po.invoicedHtCents)} {po.currency} HT · payé {centsToText(po.paidHtCents)} {po.currency} HT
        </span>
        {editable && !adding && (
          <Button variant="ghost" onClick={() => setAdding(true)}>
            Ajouter une facture
          </Button>
        )}
      </div>
      {(invoices.data ?? []).map((inv) => (
        <p key={inv.id} className="flex flex-wrap items-center gap-2" aria-label={`Facture ${inv.reference}`}>
          <span className="rounded bg-neutral-100 px-1">{INVOICE_KIND_LABELS[inv.kind]}</span>
          <span className="font-mono">{inv.reference}</span>
          <span>
            {inv.invoicedOn}
            {inv.dueOn ? ` → ${inv.dueOn}` : ''}
          </span>
          <span>
            {centsToText(inv.amountHtCents)} HT + {centsToText(inv.vatCents)} TVA = {centsToText(inv.ttcCents)} {po.currency}
          </span>
          {inv.paidOn ? (
            <span className="rounded bg-green-100 px-1 text-green-800">payée le {inv.paidOn}</span>
          ) : (
            editable &&
            (paying?.id === inv.id ? (
              <>
                <input
                  type="date"
                  value={paying.on}
                  onChange={(e) => setPaying({ id: inv.id, on: e.target.value })}
                  className={control}
                  aria-label={`Date de paiement ${inv.reference}`}
                />
                <Button
                  variant="primary"
                  disabled={!paying.on}
                  onClick={() =>
                    pay
                      .mutateAsync({ id: inv.id, paidOn: paying.on, paymentRef: null })
                      .then(() => {
                        setPaying(null)
                        toast.show({ kind: 'success', message: `Facture ${inv.reference} payée.` })
                      })
                      .catch((e: unknown) => toast.show({ kind: 'error', message: errorText(e), persistent: true }))
                  }
                >
                  Confirmer
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setPaying({ id: inv.id, on: '' })} aria-label={`Payer ${inv.reference}`}>
                  Payer
                </Button>
                <button
                  type="button"
                  className="text-neutral-500 underline"
                  aria-label={`Supprimer la facture ${inv.reference}`}
                  onClick={() => void remove.mutateAsync(inv.id)}
                >
                  supprimer
                </button>
              </>
            ))
          )}
        </p>
      ))}
      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded border border-neutral-200 p-2">
          <label className="flex flex-col">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as InvoiceKind)} className={control} aria-label="Type de facture">
              {(Object.keys(INVOICE_KIND_LABELS) as InvoiceKind[]).map((k) => (
                <option key={k} value={k}>
                  {INVOICE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            Référence
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={control} aria-label="Référence de facture" />
          </label>
          <label className="flex flex-col">
            Date
            <input type="date" value={invoicedOn} onChange={(e) => setInvoicedOn(e.target.value)} className={control} aria-label="Date de facture" />
          </label>
          <label className="flex flex-col">
            Échéance
            <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={control} aria-label="Échéance de facture" />
          </label>
          <label className="flex flex-col">
            HT {po.currency}
            <input
              value={ht}
              onChange={(e) => setHt(e.target.value)}
              className={`${control} w-24 text-right`}
              inputMode="decimal"
              aria-label="Montant HT de facture"
            />
          </label>
          <label className="flex flex-col">
            TVA {po.currency}
            <input
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              className={`${control} w-20 text-right`}
              inputMode="decimal"
              aria-label="TVA de facture"
            />
          </label>
          <Button variant="primary" onClick={() => void submit()} disabled={create.isPending || !reference.trim() || !invoicedOn}>
            Enregistrer la facture
          </Button>
          <Button variant="ghost" onClick={() => setAdding(false)}>
            Annuler
          </Button>
          {error && (
            <span role="alert" className="text-red-700">
              {error}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
