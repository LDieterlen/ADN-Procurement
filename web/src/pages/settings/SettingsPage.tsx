// « Réglages » : identité de l'agence, défauts hérités par les projets, chemins et sauvegardes (étape 9).
import { useEffect, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useHealth } from '../../api/queries/health'
import { useSettings, useUpdateSettings, type SettingRead, type SettingUpdate } from '../../api/queries/setting'
import { useCreateBackup, type BackupRead } from '../../api/queries/system'
import { BpField } from '../../components/forms/BpField'
import { Form } from '../../components/forms/Form'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

type SettingsFormValues = {
  agencyName: string
  agencyAddress: string
  agencyEmail: string
  agencyPhone: string
  agencySiret: string
  agencyVatNumber: string
  defaultVatBp: number | null
  defaultContingencyBp: number | null
  projectCodePrefix: string
}

const EMPTY: SettingsFormValues = {
  agencyName: '',
  agencyAddress: '',
  agencyEmail: '',
  agencyPhone: '',
  agencySiret: '',
  agencyVatNumber: '',
  defaultVatBp: null,
  defaultContingencyBp: null,
  projectCodePrefix: '',
}

function fromSettings(s: SettingRead): SettingsFormValues {
  return {
    agencyName: s.agencyName,
    agencyAddress: s.agencyAddress ?? '',
    agencyEmail: s.agencyEmail ?? '',
    agencyPhone: s.agencyPhone ?? '',
    agencySiret: s.agencySiret ?? '',
    agencyVatNumber: s.agencyVatNumber ?? '',
    defaultVatBp: s.defaultVatBp,
    defaultContingencyBp: s.defaultContingencyBp,
    projectCodePrefix: s.projectCodePrefix,
  }
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim())

export function toPayload(v: SettingsFormValues): SettingUpdate {
  return {
    agencyName: v.agencyName.trim(),
    agencyAddress: orNull(v.agencyAddress),
    agencyEmail: orNull(v.agencyEmail),
    agencyPhone: orNull(v.agencyPhone),
    agencySiret: orNull(v.agencySiret),
    agencyVatNumber: orNull(v.agencyVatNumber),
    defaultVatBp: v.defaultVatBp ?? undefined,
    defaultContingencyBp: v.defaultContingencyBp ?? undefined,
    projectCodePrefix: v.projectCodePrefix.trim(),
  }
}

function SettingsForm({
  initial,
  onSubmit,
  submitting,
  banner,
  serverErrors,
}: {
  initial: SettingRead
  onSubmit: (v: SettingsFormValues) => Promise<void>
  submitting: boolean
  banner: string | null
  serverErrors: ErrorDetail[]
}) {
  const form = useForm<SettingsFormValues>({ defaultValues: fromSettings(initial) })
  useEffect(() => {
    for (const detail of serverErrors) {
      if (detail.field in EMPTY) form.setError(detail.field as Path<SettingsFormValues>, { type: 'server', message: detail.message })
    }
  }, [serverErrors, form])
  return (
    <Form form={form} onSubmit={onSubmit} banner={banner}>
      <fieldset className="max-w-3xl rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-600">Agence</legend>
        <div className="grid grid-cols-2 gap-4">
          <TextInput name="agencyName" label="Nom" />
          <TextInput name="agencyEmail" label="E-mail" type="email" />
          <TextInput name="agencyPhone" label="Téléphone" type="tel" />
          <TextInput name="agencySiret" label="SIRET" hint="14 chiffres" inputMode="numeric" />
          <TextInput name="agencyVatNumber" label="N° de TVA" hint="Ex. FR12345678901" />
          <div className="col-span-2">
            <TextArea name="agencyAddress" label="Adresse" rows={3} />
          </div>
        </div>
      </fieldset>
      <fieldset className="max-w-3xl rounded border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-600">Défauts des nouveaux projets</legend>
        <div className="grid grid-cols-3 gap-4">
          <BpField name="defaultVatBp" label="TVA par défaut" />
          <BpField name="defaultContingencyBp" label="Contingence par défaut" />
          <TextInput name="projectCodePrefix" label="Préfixe des codes projet" hint="Ex. P → P2026-001" />
        </div>
      </fieldset>
      <Button type="submit" variant="primary" disabled={submitting}>
        Enregistrer
      </Button>
    </Form>
  )
}

export function SettingsPage() {
  const settings = useSettings()
  const health = useHealth()
  const update = useUpdateSettings()
  const backup = useCreateBackup()
  const toast = useToast()
  const [serverErrors, setServerErrors] = useState<ErrorDetail[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [lastBackup, setLastBackup] = useState<BackupRead | null>(null)

  async function submit(values: SettingsFormValues) {
    setServerErrors([])
    setBanner(null)
    try {
      await update.mutateAsync(toPayload(values))
      toast.show({ kind: 'success', message: 'Réglages enregistrés.' })
    } catch (error) {
      if (!isApiError(error)) throw error
      if (error.code === 'validation_error') {
        setServerErrors(error.details)
        setBanner(error.message)
      } else setBanner(error.message)
    }
  }

  async function backupNow() {
    try {
      const made = await backup.mutateAsync()
      setLastBackup(made)
      toast.show({
        kind: made.copiedTo ? 'success' : 'error',
        message: made.copiedTo ? 'Sauvegarde faite et copiée.' : `Sauvegarde faite, copie Windows absente : ${made.copyError ?? ''}`,
      })
    } catch (error) {
      if (!isApiError(error)) throw error
      toast.show({ kind: 'error', message: error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Réglages</h1>
      {settings.isPending && <p className="text-sm text-neutral-500">Chargement…</p>}
      {settings.isError && <EmptyState title="Impossible de charger les réglages">{settings.error.message}</EmptyState>}
      {settings.data && (
        <SettingsForm
          key={settings.data.updatedAt}
          initial={settings.data}
          onSubmit={submit}
          submitting={update.isPending}
          banner={banner}
          serverErrors={serverErrors}
        />
      )}

      <section className="max-w-3xl space-y-3 rounded border border-neutral-200 p-4" aria-label="Sauvegardes">
        <h2 className="text-sm font-medium text-neutral-600">Sauvegardes</h2>
        <dl className="grid grid-cols-[14rem_1fr] gap-y-1 text-sm">
          <dt className="text-neutral-500">Base</dt>
          <dd>{health.data?.dbPath ?? '—'}</dd>
          <dt className="text-neutral-500">Dossier de copie Windows</dt>
          <dd>
            {health.data?.backupDir ?? '—'}{' '}
            {health.data && !health.data.backupDirOk && (
              <span className="rounded bg-amber-100 px-1 text-xs text-amber-900">absent ou non accessible (FFE_BACKUP_DIR)</span>
            )}
          </dd>
          <dt className="text-neutral-500">Dernière sauvegarde</dt>
          <dd>{health.data?.lastBackupAt ?? 'aucune'}</dd>
          <dt className="text-neutral-500">Dernier quick_check</dt>
          <dd>{health.data?.lastQuickCheck ?? '—'}</dd>
          <dt className="text-neutral-500">Journal</dt>
          <dd>{health.data?.logPath ?? '—'}</dd>
        </dl>
        <Button onClick={() => void backupNow()} disabled={backup.isPending}>
          Sauvegarder maintenant
        </Button>
        {lastBackup && (
          <p className="text-xs text-neutral-600">
            Écrit : {lastBackup.path}
            {lastBackup.copiedTo ? ` ; copie : ${lastBackup.copiedTo}` : ''} ; quick_check {lastBackup.quickCheck}.
          </p>
        )}
      </section>
    </section>
  )
}
