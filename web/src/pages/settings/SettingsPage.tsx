// « Réglages » : identité de l'agence (en-tête des PDF), préfixe des codes projet, extension Chrome, sauvegardes, santé.
import { useEffect, useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Link } from 'react-router'
import { isApiError, type ErrorDetail } from '../../api/errors'
import { useHealth } from '../../api/queries/health'
import { useGenerateExtensionToken, useSettings, useUpdateSettings, type SettingRead, type SettingUpdate } from '../../api/queries/setting'
import { useCreateBackup, type BackupRead } from '../../api/queries/system'
import { Form } from '../../components/forms/Form'
import { TextArea } from '../../components/forms/TextArea'
import { TextInput } from '../../components/forms/TextInput'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

type SettingsFormValues = { agencyName: string; agencyAddress: string; agencyEmail: string; agencyPhone: string; projectCodePrefix: string }

const EMPTY: SettingsFormValues = { agencyName: '', agencyAddress: '', agencyEmail: '', agencyPhone: '', projectCodePrefix: '' }

function fromSettings(s: SettingRead): SettingsFormValues {
  return {
    agencyName: s.agencyName,
    agencyAddress: s.agencyAddress ?? '',
    agencyEmail: s.agencyEmail ?? '',
    agencyPhone: s.agencyPhone ?? '',
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
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <TextInput name="agencyName" label="Nom" />
        <TextInput name="projectCodePrefix" label="Préfixe des codes projet" hint="Ex. P → P2026-001" />
        <TextInput name="agencyEmail" label="E-mail" type="email" />
        <TextInput name="agencyPhone" label="Téléphone" type="tel" />
        <div className="col-span-2">
          <TextArea name="agencyAddress" label="Adresse" rows={2} />
        </div>
      </div>
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
  const generateToken = useGenerateExtensionToken()
  function copyToken(token: string) {
    void copyText(token)
      .then(() => toast.show({ kind: 'success', message: 'Jeton copié ; le coller dans les options de l’extension.' }))
      .catch(() => toast.show({ kind: 'error', message: 'Copie impossible : sélectionner le jeton et le copier à la main.' }))
  }
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
      <PageHeader title="Réglages" subtitle="Agence imprimée en tête des PDF, codes projet, sauvegardes" />
      <Card title="Agence">
        {settings.isPending && <p className="text-sm text-ink-3">Chargement…</p>}
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
      </Card>
      <Card title="Extension Chrome" label="Extension Chrome" className="max-w-3xl">
        <p className="mb-3 text-sm text-ink-2">
          Le bouton « Envoyer à FFE » de l'extension lit la page produit dans ton navigateur (utile sur les sites qui refusent « Coller une adresse ») et la
          dépose ici, en attente sur « Nouvel article ». L'extension s'authentifie avec ce jeton, à coller dans ses options.
        </p>
        <dl className="mb-3 grid grid-cols-[14rem_1fr] gap-y-1 text-sm">
          <dt className="text-ink-3">Jeton</dt>
          <dd>
            {settings.data?.extensionToken ? (
              <span className="inline-flex items-center gap-2">
                <code className="rounded bg-track px-1.5 py-0.5 text-xs">{settings.data.extensionToken}</code>
                <Button size="xs" variant="ghost" onClick={() => copyToken(settings.data?.extensionToken ?? '')}>
                  Copier
                </Button>
              </span>
            ) : (
              'aucun (extension désactivée)'
            )}
          </dd>
        </dl>
        <Button
          onClick={() =>
            void generateToken
              .mutateAsync()
              .then(() => toast.show({ kind: 'success', message: 'Nouveau jeton généré ; le recopier dans les options de l’extension.' }))
              .catch((error: unknown) => toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error) }))
          }
          disabled={generateToken.isPending}
        >
          {settings.data?.extensionToken ? 'Régénérer le jeton' : 'Générer un jeton'}
        </Button>
      </Card>
      <Card title="Sauvegardes" label="Sauvegardes" className="max-w-3xl">
        <dl className="mb-3 grid grid-cols-[14rem_1fr] gap-y-1 text-sm">
          <dt className="text-ink-3">Base</dt>
          <dd>{health.data?.dbPath ?? '—'}</dd>
          <dt className="text-ink-3">Dossier de copie Windows</dt>
          <dd>
            {health.data?.backupDir ?? '—'}{' '}
            {health.data && !health.data.backupDirOk && (
              <span className="rounded-full border border-warn-soft bg-warn-soft px-2 text-xs text-warn">absent ou non accessible (FFE_BACKUP_DIR)</span>
            )}
          </dd>
          <dt className="text-ink-3">Dernière sauvegarde</dt>
          <dd>{health.data?.lastBackupAt ?? 'aucune'}</dd>
          <dt className="text-ink-3">Dernier quick_check</dt>
          <dd>{health.data?.lastQuickCheck ?? '—'}</dd>
          <dt className="text-ink-3">Journal</dt>
          <dd>{health.data?.logPath ?? '—'}</dd>
        </dl>
        <div className="flex items-center gap-3">
          <Button onClick={() => void backupNow()} disabled={backup.isPending}>
            Sauvegarder maintenant
          </Button>
          <Link to="/health" className="text-sm underline">
            Page Santé
          </Link>
        </div>
        {lastBackup && (
          <p className="mt-2 text-xs text-ink-2">
            Écrit : {lastBackup.path}
            {lastBackup.copiedTo ? ` ; copie : ${lastBackup.copiedTo}` : ''} ; quick_check {lastBackup.quickCheck}.
          </p>
        )}
      </Card>
    </section>
  )
}

/** The clipboard API needs a secure page (localhost); from Windows over the network, the old copy command. */
async function copyText(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard) return navigator.clipboard.writeText(text)
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('copy refused')
}
