// One editable value list (Familles, Usages, Prestations): rename in place, add, archive / restore.
import { useState } from 'react'
import { isApiError } from '../../api/errors'
import { CHOICE_LIST_LABELS, useChoices, useCreateChoice, useToggleChoice, useUpdateChoice, type ChoiceList, type ChoiceRead } from '../../api/queries/choice'
import { type Column } from '../../components/tables/DataTable'
import { TableCard, archivedColumn } from '../../components/tables/TableCard'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

const HINTS: Record<ChoiceList, string> = {
  family: 'Famille d’un article (fiche, budget par famille)',
  usage: 'Usage d’un article (intérieur, extérieur…)',
  prestation: 'Prestation d’un professionnel de l’annuaire',
}

export function ChoicesSection({ list, includeArchived }: { list: ChoiceList; includeArchived: boolean }) {
  const choices = useChoices(list, includeArchived)
  const create = useCreateChoice()
  const toast = useToast()
  const [name, setName] = useState('')
  const title = CHOICE_LIST_LABELS[list]
  const fail = (error: unknown) =>
    toast.show({ kind: 'error', message: isApiError(error) ? (error.details[0]?.message ?? error.message) : String(error), persistent: true })

  const columns: Column<ChoiceRead>[] = [
    { key: 'name', header: 'Nom', render: (c) => <ChoiceName key={`${c.id}-${c.name}`} choice={c} onError={fail} /> },
    { key: 'code', header: 'Code', className: 'w-40 font-mono text-xs text-ink-3', render: (c) => c.code },
    archivedColumn<ChoiceRead>(),
    { key: 'action', header: '', className: 'w-28 text-right', render: (c) => <ChoiceToggle choice={c} onError={fail} /> },
  ]

  return (
    <TableCard
      label={title}
      caption={title}
      columns={columns}
      rows={choices.data}
      rowKey={(c) => c.id}
      loading={choices.isPending}
      error={choices.isError ? { title: `Impossible de charger : ${title}`, message: choices.error.message } : null}
      empty="Aucune valeur pour l’instant."
      footer={
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim()) return
            create
              .mutateAsync({ list, name: name.trim() })
              .then(() => setName(''))
              .catch(fail)
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Nouvelle valeur — ${HINTS[list]}`}
            aria-label={`Nouvelle valeur : ${title}`}
            className="control control-sm flex-1 bg-surface"
          />
          <Button type="submit" variant="primary" size="xs" disabled={create.isPending || !name.trim()}>
            Ajouter
          </Button>
        </form>
      }
    />
  )
}

function ChoiceName({ choice, onError }: { choice: ChoiceRead; onError: (error: unknown) => void }) {
  const update = useUpdateChoice()
  const [name, setName] = useState(choice.name)
  return (
    <input
      value={name}
      disabled={choice.archivedAt !== null}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => {
        if (name.trim() && name.trim() !== choice.name)
          update.mutateAsync({ id: choice.id, name: name.trim() }).catch((error: unknown) => {
            setName(choice.name)
            onError(error)
          })
      }}
      aria-label={`Nom de ${choice.name}`}
      className="control control-sm w-full max-w-md font-medium disabled:bg-sunken disabled:text-ink-3"
    />
  )
}

function ChoiceToggle({ choice, onError }: { choice: ChoiceRead; onError: (error: unknown) => void }) {
  const toggle = useToggleChoice()
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => toggle.mutateAsync(choice).catch(onError)}
      aria-label={`${choice.archivedAt ? 'Restaurer' : 'Archiver'} ${choice.name}`}
    >
      {choice.archivedAt ? 'Restaurer' : 'Archiver'}
    </Button>
  )
}
