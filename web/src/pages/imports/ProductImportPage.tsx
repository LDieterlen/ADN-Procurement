// « Import tarifs » (ADR-0011): supplier, file, column mapping (saved per supplier, guessed otherwise),
// preview plan from the server, then commit. Nothing is parsed or priced here.
import { useEffect, useState } from 'react'
import { isApiError } from '../../api/errors'
import { useCategories } from '../../api/queries/category'
import {
  ACTION_LABELS,
  IMPORT_FIELDS,
  useCommitImport,
  useImportBatches,
  useImportMapping,
  usePreviewImport,
  type ImportCommitRead,
  type ImportField,
  type ImportMapping,
  type ImportPreviewRead,
} from '../../api/queries/productImport'
import { useSuppliers } from '../../api/queries/supplier'
import { centsToText } from '../../components/forms/MoneyField'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { CURRENCIES } from '../suppliers/SupplierForm'

const ALL = { q: '', includeArchived: false, limit: 200, offset: 0 }
const control = 'rounded border border-neutral-300 bg-white px-2 py-1 text-sm'
const EMPTY_MAPPING: ImportMapping = { columns: {}, taxMode: 'ht', vatBp: null, defaultCategoryId: null, currency: null }

function errorText(error: unknown): string {
  return isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error)
}

export function ProductImportPage() {
  const suppliers = useSuppliers(ALL)
  const categories = useCategories(false)
  const preview = usePreviewImport()
  const commit = useCommitImport()
  const toast = useToast()
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mapping, setMapping] = useState<ImportMapping>(EMPTY_MAPPING)
  const [plan, setPlan] = useState<ImportPreviewRead | null>(null)
  const [markMissing, setMarkMissing] = useState(false)
  const [result, setResult] = useState<ImportCommitRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saved = useImportMapping(supplierId ?? undefined)
  const batches = useImportBatches(supplierId)

  useEffect(() => {
    if (saved.data) setMapping(saved.data)
  }, [saved.data])

  async function runPreview(withMapping: boolean) {
    if (!file || supplierId === null) return
    setError(null)
    setResult(null)
    try {
      const got = await preview.mutateAsync({ file, supplierId, mapping: withMapping ? mapping : null })
      setPlan(got)
      setMapping(got.mapping)
    } catch (e) {
      setError(errorText(e))
    }
  }

  async function runCommit() {
    if (!file || supplierId === null) return
    setError(null)
    try {
      const got = await commit.mutateAsync({ file, supplierId, mapping, markMissingDiscontinued: markMissing })
      setResult(got)
      setPlan(null)
      toast.show({ kind: 'success', message: `Import terminé : ${got.counts.create} créé(s), ${got.counts.update} mis à jour.` })
    } catch (e) {
      setError(errorText(e))
    }
  }

  const setColumn = (field: ImportField, column: string) => {
    const columns: Record<string, string> = { ...mapping.columns }
    if (column) columns[field] = column
    else delete columns[field]
    setMapping({ ...mapping, columns })
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Import tarifs</h1>
      <p className="text-sm text-neutral-600">
        Tarif fourni par le fournisseur (xlsx ou CSV). Le mapping des colonnes est enregistré par fournisseur et réutilisé au prochain import.
      </p>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          Fournisseur
          <select
            value={supplierId ?? ''}
            onChange={(e) => {
              setSupplierId(e.target.value ? Number(e.target.value) : null)
              setPlan(null)
              setResult(null)
              setMapping(EMPTY_MAPPING)
            }}
            className={control}
            aria-label="Fournisseur"
          >
            <option value="">—</option>
            {(suppliers.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Fichier
          <input
            type="file"
            accept=".xlsx,.csv,.txt"
            aria-label="Fichier de tarifs"
            className={control}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button variant="primary" onClick={() => void runPreview(false)} disabled={!file || supplierId === null || preview.isPending}>
          Prévisualiser
        </Button>
        {error && (
          <span role="alert" className="text-red-700">
            {error}
          </span>
        )}
      </div>

      {plan && (
        <>
          <fieldset className="rounded border border-neutral-200 p-3 text-sm" aria-label="Mapping des colonnes">
            <legend className="px-1 text-neutral-600">
              Colonnes → champs {plan.mappingSource === 'saved' ? '(mapping enregistré)' : plan.mappingSource === 'guessed' ? '(deviné : à vérifier)' : ''}
            </legend>
            <div className="grid grid-cols-4 gap-3">
              {IMPORT_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col">
                  {f.label}
                  <select
                    value={mapping.columns[f.key] ?? ''}
                    onChange={(e) => setColumn(f.key, e.target.value)}
                    className={control}
                    aria-label={`Colonne pour ${f.label}`}
                  >
                    <option value="">—</option>
                    {plan.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex flex-col">
                Prix exprimés
                <select
                  value={mapping.taxMode}
                  onChange={(e) => setMapping({ ...mapping, taxMode: e.target.value as ImportMapping['taxMode'] })}
                  className={control}
                  aria-label="Mode de prix"
                >
                  <option value="ht">HT</option>
                  <option value="ttc">TTC</option>
                </select>
              </label>
              {mapping.taxMode === 'ttc' && (
                <label className="flex flex-col">
                  TVA (points de base)
                  <input
                    value={mapping.vatBp ?? ''}
                    onChange={(e) => setMapping({ ...mapping, vatBp: e.target.value ? Number(e.target.value) : null })}
                    className={control}
                    inputMode="numeric"
                    aria-label="TVA en points de base"
                  />
                </label>
              )}
              <label className="flex flex-col">
                Catégorie des produits créés
                <select
                  value={mapping.defaultCategoryId ?? ''}
                  onChange={(e) => setMapping({ ...mapping, defaultCategoryId: e.target.value ? Number(e.target.value) : null })}
                  className={control}
                  aria-label="Catégorie par défaut"
                >
                  <option value="">—</option>
                  {(categories.data ?? [])
                    .filter((c) => c.parentId === null)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col">
                Devise
                <select
                  value={mapping.currency ?? ''}
                  onChange={(e) => setMapping({ ...mapping, currency: e.target.value || null })}
                  className={control}
                  aria-label="Devise du tarif"
                >
                  <option value="">celle du fournisseur</option>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => void runPreview(true)} disabled={preview.isPending}>
                Appliquer le mapping
              </Button>
            </div>
          </fieldset>

          <p className="text-sm" aria-label="Bilan de la prévisualisation">
            {plan.counts.total} ligne(s) : {plan.counts.create} à créer, {plan.counts.update} à mettre à jour, {plan.counts.unchanged} inchangée(s),{' '}
            {plan.counts.skip} ignorée(s)
            {plan.missingSupplierRefs.length > 0 && ` · ${plan.missingSupplierRefs.length} référence(s) du fournisseur absente(s) du fichier`}
          </p>
          {plan.missingSupplierRefs.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={markMissing} onChange={(e) => setMarkMissing(e.target.checked)} aria-label="Marquer les absents comme arrêtés" />
              Marquer les produits absents du fichier comme arrêtés ({plan.missingSupplierRefs.slice(0, 5).join(', ')}
              {plan.missingSupplierRefs.length > 5 ? '…' : ''})
            </label>
          )}
          <table className="w-full text-xs" aria-label="Plan d’import">
            <thead>
              <tr className="border-b border-neutral-300 text-left uppercase text-neutral-500">
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Action</th>
                <th className="px-2 py-1">Réf.</th>
                <th className="px-2 py-1">Désignation</th>
                <th className="px-2 py-1">Marque</th>
                <th className="px-2 py-1 text-right">Prix actuel</th>
                <th className="px-2 py-1 text-right">Prix importé</th>
                <th className="px-2 py-1">Motif</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.rowIndex} className={`border-b border-neutral-100 ${r.action === 'skip' ? 'text-neutral-400' : ''}`}>
                  <td className="px-2 py-1">{r.rowIndex}</td>
                  <td className="px-2 py-1">{ACTION_LABELS[r.action]}</td>
                  <td className="px-2 py-1 font-mono">{r.supplierRef ?? r.manufacturerRef ?? r.gtin ?? ''}</td>
                  <td className="px-2 py-1">{r.name ?? ''}</td>
                  <td className="px-2 py-1">{r.manufacturerName ?? ''}</td>
                  <td className="px-2 py-1 text-right">{r.oldPriceCents === null ? '' : centsToText(r.oldPriceCents)}</td>
                  <td className="px-2 py-1 text-right">{r.newPriceCents === null ? '' : centsToText(r.newPriceCents)}</td>
                  <td className="px-2 py-1">{r.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="primary" onClick={() => void runCommit()} disabled={commit.isPending || plan.counts.create + plan.counts.update === 0}>
            Importer ({plan.counts.create + plan.counts.update} écriture(s))
          </Button>
        </>
      )}

      {result && (
        <p className="rounded bg-green-50 p-3 text-sm text-green-900" role="status">
          Import {result.batch.originalName} : {result.counts.create} créé(s), {result.counts.update} mis à jour, {result.counts.unchanged} inchangé(s),{' '}
          {result.counts.skip} ignoré(s), {result.counts.discontinued} arrêté(s).
        </p>
      )}

      {batches.data && batches.data.length > 0 && (
        <section className="text-sm" aria-label="Imports précédents">
          <h2 className="mb-1 font-medium">Imports précédents</h2>
          <ul className="space-y-0.5 text-xs text-neutral-600">
            {batches.data.map((b) => (
              <li key={b.id}>
                {b.importedAt.slice(0, 10)} — {b.originalName} : {b.rowsCreated} créé(s), {b.rowsUpdated} mis à jour, {b.rowsUnchanged} inchangé(s),{' '}
                {b.rowsSkipped} ignoré(s), {b.rowsDiscontinued} arrêté(s)
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
