// « Installation » tab of a project (ADR-0024): the floor plans (an image, or a PDF drawn from its first page) and the
// sheets, room by room. A sheet is one part of a room (« Coin TV » of the « Salon ») printed on A3 pages, its plan and
// its articles laid out by the arrangement chosen; it is composed on its own page.
import { useEffect, useRef, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { fileContentUrl, useUploadFile } from '../../api/queries/file'
import {
  useCreateInstallationPlan,
  useDeleteInstallationPlan,
  useInstallationPlans,
  useRenameInstallationPlan,
  type InstallationPlanRead,
} from '../../api/queries/installationPlan'
import {
  ARRANGEMENT_OPTIONS,
  PER_PAGE_OPTIONS,
  installationPdfUrl,
  sheetPdfUrl,
  useCreateInstallationSheet,
  useInstallationSheets,
  type Arrangement,
  type PerPage,
} from '../../api/queries/installationSheet'
import { locationLabel, type LocationRead } from '../../api/queries/project'
import { Form } from '../../components/forms/Form'
import { Select } from '../../components/forms/Select'
import { TextInput } from '../../components/forms/TextInput'
import { Button, linkButtonClass } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'

type SheetValues = { locationId: string; name: string; planId: string; arrangement: Arrangement; perPage: '8' | '12' | '16' }

function PlanRow({ plan, used, projectId, readOnly }: { plan: InstallationPlanRead; used: number | null; projectId: number; readOnly: boolean }) {
  const rename = useRenameInstallationPlan(projectId)
  const remove = useDeleteInstallationPlan(projectId)
  const toast = useToast()
  const [name, setName] = useState(plan.name)

  function fail(error: unknown) {
    toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <a href={fileContentUrl(plan.fileId)} target="_blank" rel="noreferrer" className="shrink-0">
        <img src={fileContentUrl(plan.fileId)} alt={`Plan ${plan.name}`} className="h-14 w-20 rounded-[4px] border border-line bg-surface object-contain" />
      </a>
      <div className="min-w-0 flex-1">
        <input
          value={name}
          aria-label="Nom du plan"
          disabled={readOnly}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const trimmed = name.trim()
            if (!trimmed) setName(plan.name)
            else if (trimmed !== plan.name)
              rename.mutate(
                { id: plan.id, name: trimmed },
                {
                  onError: (error) => {
                    setName(plan.name) // refused: the saved name comes back
                    fail(error)
                  },
                },
              )
          }}
          className="control control-sm w-full max-w-xs"
        />
        <div className="mt-0.5 text-[12.5px] text-ink-3">
          {plan.sourceFileId !== null ? 'Converti ou recadré (envoi gardé)' : 'Tel qu’envoyé'} ·{' '}
          {used === null ? '…' : used === 0 ? 'aucune planche' : `${used} planche(s)`}
        </div>
      </div>
      {!readOnly && (
        <Button
          size="sm"
          variant="ghost"
          disabled={used !== 0 || remove.isPending}
          title={used ? 'Utilisé par une planche' : undefined}
          onClick={() => remove.mutate(plan.id, { onError: fail })}
        >
          Supprimer
        </Button>
      )}
    </li>
  )
}

export function InstallationSection({ projectId, locations, readOnly }: { projectId: number; locations: LocationRead[]; readOnly: boolean }) {
  const plans = useInstallationPlans(projectId)
  const sheets = useInstallationSheets(projectId)
  const upload = useUploadFile()
  const createPlan = useCreateInstallationPlan(projectId)
  const createSheet = useCreateInstallationSheet(projectId)
  const navigate = useNavigate()
  const toast = useToast()
  const planInput = useRef<HTMLInputElement>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const active = locations.filter((l) => l.archivedAt === null)
  const allPlans = plans.data ?? []
  const allSheets = sheets.data ?? []
  const form = useForm<SheetValues>({ defaultValues: { locationId: String(active[0]?.id ?? ''), name: '', planId: '', arrangement: 'ring', perPage: '12' } })
  // The locations arrive after the first render (page reloaded on this tab): the first one is proposed once known.
  const firstRoom = active[0]?.id
  useEffect(() => {
    if (firstRoom !== undefined && !form.getValues('locationId')) form.setValue('locationId', String(firstRoom))
  }, [firstRoom, form])
  for (const detail of serverErrors) {
    if (['locationId', 'name', 'planId', 'arrangement', 'perPage'].includes(detail.field) && !form.formState.errors[detail.field as Path<SheetValues>])
      form.setError(detail.field as Path<SheetValues>, { type: 'server', message: detail.message })
  }

  async function addPlans(files: File[]) {
    for (const file of files) {
      try {
        const stored = await upload.mutateAsync(file)
        await createPlan.mutateAsync({ fileId: stored.id })
      } catch (error) {
        toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
      }
    }
  }

  async function addSheet(values: SheetValues) {
    setBanner(null)
    setServerErrors([])
    try {
      const created = await createSheet.mutateAsync({
        locationId: Number(values.locationId),
        name: values.name,
        planId: values.planId ? Number(values.planId) : null,
        perPage: Number(values.perPage) as PerPage,
        arrangement: values.arrangement,
        planRotation: 0,
        colorByType: false,
      })
      void navigate(`/projects/${projectId}/installation/${created.id}`)
    } catch (error) {
      if (isApiError(error) && error.details.length > 0) setServerErrors(error.details)
      else setBanner(isApiError(error) ? error.message : String(error))
    }
  }

  const rooms = active
    .concat(locations.filter((l) => l.archivedAt !== null && allSheets.some((s) => s.locationId === l.id)))
    .map((location) => ({ location, sheets: allSheets.filter((s) => s.locationId === location.id) }))
    .filter((room) => room.sheets.length > 0)
  const planName = new Map(allPlans.map((p) => [p.id, p.name]))

  return (
    <div className="space-y-6">
      <Card
        title="Planches d’installation"
        label="Planches d’installation"
        padding="table"
        actions={
          allSheets.length > 0 && (
            <a href={installationPdfUrl(projectId)} download className={linkButtonClass}>
              PDF de toutes les planches
            </a>
          )
        }
      >
        {sheets.isPending ? (
          <p className="px-5 py-5 text-sm text-ink-3">Chargement…</p>
        ) : sheets.isError ? (
          <p className="px-5 py-5 text-sm text-danger">{sheets.error.message}</p>
        ) : rooms.length === 0 ? (
          <p className="px-5 py-5 text-sm text-ink-3">
            Aucune planche. Une planche montre une partie d’une pièce (coin TV, cheminée…) sur une feuille A3 : le plan au centre, les articles autour avec leur
            photo et leur code.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {rooms.map(({ location, sheets: roomSheets }) => (
              <section key={location.id} aria-label={location.name}>
                <div className="flex items-center justify-between gap-3 bg-sunken px-5 py-2">
                  <span className="text-[13px] font-medium text-ink">{locationLabel(location)}</span>
                  <a href={installationPdfUrl(projectId, location.id)} download className="text-[12.5px] font-medium text-accent hover:text-accent-hover">
                    PDF de la pièce
                  </a>
                </div>
                <ul>
                  {roomSheets.map((sheet) => (
                    <li
                      key={sheet.id}
                      onClick={() => void navigate(`/projects/${projectId}/installation/${sheet.id}`)}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-line-soft px-5 py-2.5 text-sm last:border-b-0 hover:bg-sunken"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/projects/${projectId}/installation/${sheet.id}`}
                          onClick={(event) => event.stopPropagation()} // the row navigates too: once only
                          className="font-medium text-ink hover:underline"
                        >
                          {sheet.name}
                        </Link>
                        <div className="text-[12.5px] text-ink-3">
                          {sheet.planId !== null ? (planName.get(sheet.planId) ?? 'Plan') : 'Sans plan'} · {sheet.itemCount} article(s) · {sheet.pageCount}{' '}
                          page(s) A3
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <a
                          href={sheetPdfUrl(sheet.id)}
                          download
                          onClick={(event) => event.stopPropagation()}
                          className="text-[12.5px] font-medium text-accent hover:text-accent-hover"
                        >
                          PDF
                        </a>
                        <span className="text-[12.5px] font-medium text-ink-2">Modifier ›</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {!readOnly && active.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <Form form={form} onSubmit={addSheet} banner={banner}>
              <div className="grid grid-cols-5 gap-3">
                <Select name="locationId" label="Pièce" options={active.map((l) => ({ value: String(l.id), label: locationLabel(l) }))} />
                <TextInput name="name" label="Nom" placeholder="Coin TV" />
                <Select
                  name="planId"
                  label="Plan"
                  options={[{ value: '', label: 'Sans plan' }, ...allPlans.map((p) => ({ value: String(p.id), label: p.name }))]}
                />
                <Select name="arrangement" label="Position des articles" options={ARRANGEMENT_OPTIONS} />
                <Select name="perPage" label="Articles par page" options={PER_PAGE_OPTIONS} />
              </div>
              <Button type="submit" variant="primary" disabled={createSheet.isPending}>
                Nouvelle planche
              </Button>
            </Form>
          </div>
        )}
        {!readOnly && active.length === 0 && <p className="border-t border-line px-5 py-4 text-sm text-ink-3">Créer d’abord une localisation (la pièce).</p>}
      </Card>

      <Card
        title="Plans"
        label="Plans"
        padding="table"
        actions={
          !readOnly && (
            <>
              <Button size="sm" onClick={() => planInput.current?.click()} disabled={upload.isPending || createPlan.isPending}>
                Ajouter un plan
              </Button>
              <input
                ref={planInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                aria-label="Plan à ajouter"
                onChange={(e) => {
                  const chosen = Array.from(e.target.files ?? []) // copied before the input is emptied
                  void addPlans(chosen)
                  e.target.value = ''
                }}
              />
            </>
          )
        }
      >
        {plans.isPending ? (
          <p className="px-5 py-5 text-sm text-ink-3">Chargement…</p>
        ) : plans.isError ? (
          <p className="px-5 py-5 text-sm text-danger">{plans.error.message}</p>
        ) : allPlans.length === 0 ? (
          <p className="px-5 py-5 text-sm text-ink-3">
            Aucun plan. Une image ou un PDF (sa première page est utilisée) ; un même plan peut servir à plusieurs planches.
          </p>
        ) : (
          <ul className="divide-y divide-line" aria-label="Plans du projet">
            {allPlans.map((plan) => (
              <PlanRow
                key={`${plan.id}-${plan.name}`} // a name read again (refetch) restarts the field
                plan={plan}
                used={sheets.isSuccess ? allSheets.filter((s) => s.planId === plan.id).length : null}
                projectId={projectId}
                readOnly={readOnly}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
