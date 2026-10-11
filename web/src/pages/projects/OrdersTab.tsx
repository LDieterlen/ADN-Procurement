// « Commandes » tab: purchase orders of the project (ADR-0007). Create from the approved lines of one supplier,
// adjust the draft, issue (locks the lines), acknowledge, close, cancel with a note, attach files, print the document.
// Every amount comes from the server (money.py); the page only displays them.
import { useRef, useState } from 'react'
import { isApiError } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/product'
import { useProject } from '../../api/queries/project'
import { useProjectItems } from '../../api/queries/projectItem'
import {
  PO_STATUS_LABELS,
  useAttachPurchaseOrderFile,
  useChangePurchaseOrderStatus,
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  useDeletePurchaseOrderLine,
  useDetachPurchaseOrderFile,
  useIssuePurchaseOrder,
  useProjectPurchaseOrders,
  useUpdatePurchaseOrder,
  useUpdatePurchaseOrderLine,
  type PoRead,
} from '../../api/queries/purchaseOrder'
import { useSettings } from '../../api/queries/setting'
import { useSupplier, useSuppliers } from '../../api/queries/supplier'
import { bpToText } from '../../components/forms/BpField'
import { centsToText, textToCents } from '../../components/forms/MoneyField'
import { milliToText, textToMilli } from '../../components/forms/QuantityField'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, type DialogAction } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { InvoicesSection, ReceiptsSection } from './OrderReceipts'

const ALL = { q: '', limit: 200, offset: 0, includeArchived: false }
const control = 'rounded border border-neutral-300 px-2 py-1 text-sm'
const OPEN = ['draft', 'issued', 'acknowledged', 'partially_delivered', 'closed']

function errorText(error: unknown): string {
  return isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error)
}

function NewOrderForm({ projectId, orders, onDone }: { projectId: number; orders: PoRead[]; onDone: () => void }) {
  const items = useProjectItems(projectId, { status: 'approved', kind: null, supplierId: null, q: '' })
  const suppliers = useSuppliers(ALL)
  const create = useCreatePurchaseOrder()
  const toast = useToast()
  const [supplierId, setSupplierId] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [expected, setExpected] = useState('')
  const [error, setError] = useState<string | null>(null)
  const alreadyOrdered = new Set(orders.filter((o) => OPEN.includes(o.status)).flatMap((o) => o.lines.map((l) => l.projectItemId)))
  const orderable = (items.data ?? []).filter((i) => !i.onHold && !alreadyOrdered.has(i.id))
  const supplierIds = new Set(orderable.map((i) => i.supplierId).filter((id): id is number => id !== null))
  const candidates = orderable.filter((i) => i.supplierId === Number(supplierId))

  async function submit() {
    setError(null)
    try {
      const created = await create.mutateAsync({
        projectId,
        data: { supplierId: Number(supplierId), itemIds: selected, expectedDeliveryOn: expected || null, fxRateMicro: null, notes: null },
      })
      toast.show({ kind: 'success', message: `Bon de commande ${created.number} créé (brouillon).` })
      onDone()
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <div className="space-y-2 rounded border border-neutral-300 bg-white p-3" aria-label="Nouveau bon de commande">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col">
          Fournisseur
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value)
              setSelected([])
            }}
            className={control}
            aria-label="Fournisseur du bon de commande"
          >
            <option value="">—</option>
            {(suppliers.data?.items ?? [])
              .filter((s) => supplierIds.has(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col">
          Livraison prévue
          <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={control} aria-label="Livraison prévue" />
        </label>
      </div>
      {supplierId && (
        <ul className="space-y-1 text-sm" aria-label="Lignes validées à commander">
          {candidates.map((i) => (
            <li key={i.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(i.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))}
                  aria-label={`Commander ${i.itemCode}`}
                />
                <span className="font-mono text-xs">{i.itemCode}</span> {i.name}
              </label>
            </li>
          ))}
          {candidates.length === 0 && <li className="text-neutral-500">Aucune ligne validée à commander chez ce fournisseur.</li>}
        </ul>
      )}
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => void submit()} disabled={create.isPending || !supplierId || selected.length === 0}>
          Créer le bon de commande
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        {error && (
          <span role="alert" className="text-sm text-red-700">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}

function PoDocument({ po, projectId, onClose }: { po: PoRead; projectId: number; onClose: () => void }) {
  const settings = useSettings()
  const supplier = useSupplier(po.supplierId)
  const project = useProject(projectId)
  return (
    <div className="print-document fixed inset-0 z-30 overflow-y-auto bg-white p-8 text-sm" role="document" aria-label={`Bon de commande ${po.number}`}>
      <div className="no-print mb-4 flex gap-2">
        <Button variant="primary" onClick={() => window.print()}>
          Imprimer
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
      </div>
      <header className="mb-6 flex justify-between">
        <div>
          <p className="text-lg font-semibold">{settings.data?.agencyName || 'FFE'}</p>
          <p className="whitespace-pre-line text-neutral-600">{settings.data?.agencyAddress ?? ''}</p>
          <p className="text-neutral-600">{[settings.data?.agencyEmail, settings.data?.agencyPhone].filter(Boolean).join(' · ')}</p>
          {settings.data?.agencyVatNumber && <p className="text-neutral-600">TVA {settings.data.agencyVatNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">Bon de commande {po.number}</p>
          <p>{po.issuedOn ? `Émis le ${po.issuedOn}` : 'Brouillon'}</p>
          <p>
            Projet {project.data?.code} — {project.data?.name}
          </p>
        </div>
      </header>
      <section className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium">Fournisseur</h3>
          <p>{supplier.data?.name ?? po.supplierName}</p>
          <p className="text-neutral-600">
            {[supplier.data?.addressLine1, supplier.data?.addressLine2, [supplier.data?.postalCode, supplier.data?.city].filter(Boolean).join(' ')]
              .filter(Boolean)
              .join(', ')}
          </p>
          <p className="text-neutral-600">{[supplier.data?.contactName, supplier.data?.email].filter(Boolean).join(' · ')}</p>
        </div>
        <div>
          <h3 className="font-medium">Livraison</h3>
          <p className="whitespace-pre-line">{po.deliveryAddress ?? '—'}</p>
          <p className="text-neutral-600">{po.deliveryContact ?? ''}</p>
          {po.expectedDeliveryOn && <p>Livraison prévue le {po.expectedDeliveryOn}</p>}
        </div>
      </section>
      <table className="mb-4 w-full">
        <thead>
          <tr className="border-b border-neutral-400 text-left">
            <th className="py-1">Réf.</th>
            <th className="py-1">Désignation</th>
            <th className="py-1 text-right">Qté</th>
            <th className="py-1 text-right">PU {po.currency}</th>
            <th className="py-1 text-right">Remise</th>
            <th className="py-1 text-right">Net HT {po.currency}</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-200">
              <td className="py-1 font-mono text-xs">{line.itemCode}</td>
              <td className="py-1">{line.description}</td>
              <td className="py-1 text-right">{milliToText(line.qtyMilli)}</td>
              <td className="py-1 text-right">{centsToText(line.unitCostCents)}</td>
              <td className="py-1 text-right">{line.discountBp ? `${bpToText(line.discountBp)} %` : ''}</td>
              <td className="py-1 text-right">{centsToText(line.totalCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={5} className="py-2 text-right">
              Total HT {po.currency}
            </td>
            <td className="py-2 text-right">{centsToText(po.totalCents)}</td>
          </tr>
          {po.currency !== 'EUR' && (
            <tr className="text-neutral-600">
              <td colSpan={5} className="text-right">
                Contre-valeur HT EUR (1 {po.currency} = {(po.fxRateMicro / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 6 })} €)
              </td>
              <td className="text-right">{centsToText(po.totalEurCents)}</td>
            </tr>
          )}
          {po.currency === 'EUR' && (
            <>
              <tr className="text-neutral-600">
                <td colSpan={5} className="text-right">
                  TVA
                </td>
                <td className="text-right">{centsToText(po.vatCents)}</td>
              </tr>
              <tr className="font-semibold">
                <td colSpan={5} className="text-right">
                  Total TTC EUR
                </td>
                <td className="text-right">{centsToText(po.ttcEurCents)}</td>
              </tr>
            </>
          )}
        </tfoot>
      </table>
      {po.paymentTerms && <p>Conditions de paiement : {po.paymentTerms}</p>}
      {po.notes && <p className="mt-2 whitespace-pre-line">{po.notes}</p>}
    </div>
  )
}

function OrderCard({ po, projectId, readOnly }: { po: PoRead; projectId: number; readOnly: boolean }) {
  const issue = useIssuePurchaseOrder()
  const change = useChangePurchaseOrderStatus()
  const update = useUpdatePurchaseOrder()
  const remove = useDeletePurchaseOrder()
  const updateLine = useUpdatePurchaseOrderLine()
  const removeLine = useDeletePurchaseOrderLine()
  const upload = useUploadFile()
  const attach = useAttachPurchaseOrderFile()
  const detach = useDetachPurchaseOrderFile()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<{ title: string; message: string; actions: DialogAction[] } | null>(null)
  const [note, setNote] = useState('')
  const noteRef = useRef('')
  const [supplierRef, setSupplierRef] = useState(po.supplierRef ?? '')
  const [printing, setPrinting] = useState(false)
  const draft = po.status === 'draft'
  const terminal = po.status === 'closed' || po.status === 'cancelled'
  const locked = readOnly || terminal

  async function run(action: () => Promise<unknown>, success: string) {
    setDialog(null)
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
        await attach.mutateAsync({ id: po.id, fileId: stored.id })
      } catch (e) {
        toast.show({ kind: 'error', message: errorText(e), persistent: true })
      }
    }
  }

  function editLine(lineId: number, field: 'qtyMilli' | 'unitCostCents', text: string) {
    const value = field === 'qtyMilli' ? textToMilli(text) : textToCents(text)
    if (value === undefined || value === null) return
    void run(() => updateLine.mutateAsync({ id: lineId, data: { [field]: value } }), 'Ligne modifiée.')
  }

  return (
    <article
      className={`space-y-2 rounded border p-3 ${po.status === 'cancelled' ? 'border-neutral-200 bg-neutral-50 text-neutral-500' : 'border-neutral-300 bg-white'}`}
      aria-label={`Bon de commande ${po.number}`}
    >
      <header className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono font-medium">{po.number}</span>
        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">{PO_STATUS_LABELS[po.status]}</span>
        <span className="font-medium">{po.supplierName}</span>
        <span className="text-xs text-neutral-500">
          {po.currency}
          {po.issuedOn ? ` · émis le ${po.issuedOn}` : ''}
          {po.expectedDeliveryOn ? ` · livraison prévue ${po.expectedDeliveryOn}` : ''}
          {po.supplierRef ? ` · AR ${po.supplierRef}` : ''}
        </span>
        <span className="ml-auto flex flex-wrap gap-1">
          <Button variant="ghost" onClick={() => setPrinting(true)}>
            Document
          </Button>
          {!locked && draft && (
            <>
              <Button
                variant="primary"
                onClick={() =>
                  setDialog({
                    title: `Émettre ${po.number} ?`,
                    message: `Les ${po.lines.length} ligne(s) passent en « commandé » avec la référence ${po.number} ; aucun retour en arrière ensuite.`,
                    actions: [
                      {
                        label: 'Émettre',
                        variant: 'primary',
                        onClick: () => void run(() => issue.mutateAsync(po.id), `${po.number} émis : lignes commandées.`),
                      },
                      { label: 'Annuler', onClick: () => setDialog(null) },
                    ],
                  })
                }
              >
                Émettre
              </Button>
              <Button variant="ghost" onClick={() => void run(() => remove.mutateAsync(po.id), 'Brouillon supprimé.')}>
                Supprimer
              </Button>
            </>
          )}
          {!locked && po.status === 'issued' && (
            <Button
              onClick={() => void run(() => change.mutateAsync({ id: po.id, data: { status: 'acknowledged', note: null } }), 'Accusé de réception enregistré.')}
            >
              Accusé de réception
            </Button>
          )}
          {!locked && !draft && (
            <Button
              variant="ghost"
              onClick={() => void run(() => change.mutateAsync({ id: po.id, data: { status: 'closed', note: null } }), `${po.number} clos.`)}
            >
              Clore
            </Button>
          )}
          {!locked && !draft && (
            <Button
              variant="ghost"
              onClick={() =>
                setDialog({
                  title: `Annuler ${po.number} ?`,
                  message: 'Les lignes commandées passent en « annulé » avec la note ci-dessous (recommander = nouvelle ligne).',
                  actions: [
                    {
                      label: 'Annuler le bon de commande',
                      variant: 'danger',
                      onClick: () =>
                        void run(() => change.mutateAsync({ id: po.id, data: { status: 'cancelled', note: noteRef.current } }), `${po.number} annulé.`),
                    },
                    { label: 'Garder', onClick: () => setDialog(null) },
                  ],
                })
              }
            >
              Annuler le BC
            </Button>
          )}
        </span>
      </header>
      <table className="w-full text-xs" aria-label={`Lignes du bon de commande ${po.number}`}>
        <thead>
          <tr className="border-b border-neutral-200 text-left uppercase text-neutral-500">
            <th className="px-1 py-1">Réf.</th>
            <th className="px-1 py-1">Désignation</th>
            <th className="px-1 py-1 text-right">Qté</th>
            <th className="px-1 py-1 text-right">PU {po.currency}</th>
            <th className="px-1 py-1 text-right">Remise</th>
            <th className="px-1 py-1 text-right">Net HT {po.currency}</th>
            <th className="px-1 py-1 text-right">Net HT €</th>
            <th className="px-1 py-1 text-right">Reçu</th>
            <th className="px-1 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-100" aria-label={`${line.itemCode} sur ${po.number}`}>
              <td className="px-1 py-1 font-mono">{line.itemCode}</td>
              <td className="px-1 py-1">{line.description}</td>
              <td className="px-1 py-1 text-right">
                {draft && !locked ? (
                  <input
                    defaultValue={milliToText(line.qtyMilli)}
                    onBlur={(e) => editLine(line.id, 'qtyMilli', e.target.value)}
                    className={`${control} w-16 text-right`}
                    inputMode="decimal"
                    aria-label={`Quantité ${line.itemCode}`}
                  />
                ) : (
                  milliToText(line.qtyMilli)
                )}
              </td>
              <td className="px-1 py-1 text-right">
                {draft && !locked ? (
                  <input
                    defaultValue={centsToText(line.unitCostCents)}
                    onBlur={(e) => editLine(line.id, 'unitCostCents', e.target.value)}
                    className={`${control} w-24 text-right`}
                    inputMode="decimal"
                    aria-label={`Prix unitaire ${line.itemCode}`}
                  />
                ) : (
                  centsToText(line.unitCostCents)
                )}
              </td>
              <td className="px-1 py-1 text-right">{line.discountBp ? `${bpToText(line.discountBp)} %` : ''}</td>
              <td className="px-1 py-1 text-right">{centsToText(line.totalCents)}</td>
              <td className="px-1 py-1 text-right">{centsToText(line.totalEurCents)}</td>
              <td className="px-1 py-1 text-right">{po.status === 'draft' ? '' : `${milliToText(line.receivedQtyMilli)} / ${milliToText(line.qtyMilli)}`}</td>
              <td className="px-1 py-1 text-right">
                {draft && !locked && (
                  <Button
                    variant="ghost"
                    onClick={() => void run(() => removeLine.mutateAsync(line.id), 'Ligne retirée.')}
                    aria-label={`Retirer ${line.itemCode} de ${po.number}`}
                  >
                    ✕
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-400 font-semibold">
            <td colSpan={5} className="px-1 py-1 text-right">
              Total HT
            </td>
            <td className="px-1 py-1 text-right">{centsToText(po.totalCents)}</td>
            <td className="px-1 py-1 text-right">{centsToText(po.totalEurCents)}</td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      {dialog && (
        <ConfirmDialog open title={dialog.title} actions={dialog.actions}>
          <p>{dialog.message}</p>
          {dialog.title.startsWith('Annuler') && (
            <textarea
              value={note}
              onChange={(e) => {
                noteRef.current = e.target.value
                setNote(e.target.value)
              }}
              className={`${control} mt-2 w-full`}
              rows={2}
              aria-label="Note d’annulation"
            />
          )}
        </ConfirmDialog>
      )}
      {!locked && !draft && (
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            AR fournisseur
            <input
              value={supplierRef}
              onChange={(e) => setSupplierRef(e.target.value)}
              className={`${control} w-32`}
              aria-label={`AR fournisseur ${po.number}`}
            />
          </label>
          <Button
            variant="ghost"
            onClick={() => void run(() => update.mutateAsync({ id: po.id, data: { supplierRef: supplierRef || null } }), 'Référence enregistrée.')}
          >
            Enregistrer
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {po.files.map((file) => (
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
                onClick={(e) => (e.preventDefault(), void detach.mutateAsync({ id: po.id, fileId: file.fileId }))}
              >
                ✕
              </button>
            )}
          </a>
        ))}
        {!locked && (
          <>
            <button type="button" className="underline" onClick={() => input.current?.click()} disabled={upload.isPending}>
              joindre un fichier
            </button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              aria-label={`Fichiers du bon de commande ${po.number}`}
              onChange={(e) => e.target.files && void addFiles(e.target.files)}
            />
          </>
        )}
      </div>
      {po.status !== 'draft' && <ReceiptsSection po={po} readOnly={readOnly} />}
      {po.status !== 'draft' && <InvoicesSection po={po} readOnly={readOnly} />}
      {printing && <PoDocument po={po} projectId={projectId} onClose={() => setPrinting(false)} />}
    </article>
  )
}

export function OrdersTab({ projectId, readOnly }: { projectId: number; readOnly: boolean }) {
  const orders = useProjectPurchaseOrders(projectId)
  const [adding, setAdding] = useState(false)
  if (orders.isPending) return <p className="text-sm text-neutral-500">Chargement…</p>
  if (orders.isError) return <EmptyState title="Impossible de charger les bons de commande">{orders.error.message}</EmptyState>
  return (
    <section className="space-y-3">
      {!readOnly && !adding && (
        <div className="no-print">
          <Button variant="primary" onClick={() => setAdding(true)}>
            Nouveau bon de commande
          </Button>
        </div>
      )}
      {adding && <NewOrderForm projectId={projectId} orders={orders.data} onDone={() => setAdding(false)} />}
      {orders.data.length === 0 && !adding && <EmptyState title="Aucun bon de commande." />}
      {orders.data.map((po) => (
        <OrderCard key={po.id} po={po} projectId={projectId} readOnly={readOnly} />
      ))}
    </section>
  )
}
