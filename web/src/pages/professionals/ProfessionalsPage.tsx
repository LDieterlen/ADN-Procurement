import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useProfessionalSpecialties, useProfessionals, type ProfessionalRead } from '../../api/queries/professional'
import { FilterSelect } from '../../components/forms/FilterSelect'
import { type Column } from '../../components/tables/DataTable'
import { ListToolbar } from '../../components/tables/ListToolbar'
import { TableCard, archivedColumn } from '../../components/tables/TableCard'
import { PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Pill } from '../../components/ui/Pill'
import { useChoiceLabels } from '../../api/queries/choice'
import { useToast } from '../../components/ui/Toast'

const LIMIT = 50

const COLUMNS: Column<ProfessionalRead>[] = [
  { key: 'name', header: 'Nom', render: (m) => <span className="font-medium">{m.name}</span> },
  { key: 'specialty', className: 'text-ink-2', header: 'Savoir-faire', render: (m) => m.specialty ?? '' },
  { key: 'contact', className: 'text-ink-2', header: 'Contact', render: (m) => m.contactName ?? '' },
  { key: 'phone', className: 'text-ink-2', header: 'Téléphone', render: (m) => m.mobile ?? m.phone ?? '' },
  { key: 'email', className: 'text-ink-2', header: 'E-mail', render: (m) => m.email ?? '' },
  { key: 'website', className: 'text-ink-2', header: 'Site web', render: (m) => m.website ?? '' },
  archivedColumn<ProfessionalRead>(),
]

export function ProfessionalsPage() {
  const prestations = useChoiceLabels('prestation')
  const columns: Column<ProfessionalRead>[] = [
    COLUMNS[0]!,
    { key: 'kind', header: 'Prestation', render: (m) => <Pill>{prestations.label(m.kind)}</Pill> },
    ...COLUMNS.slice(1),
  ]
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [offset, setOffset] = useState(0)
  const [specialty, setSpecialty] = useState('')
  const [kind, setKind] = useState('')
  const professionals = useProfessionals({ q, includeArchived, limit: LIMIT, offset, specialty, kind: kind || null })
  const specialties = useProfessionalSpecialties()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (professionals.isError)
      toast.show({ kind: 'error', message: professionals.error.message, persistent: true, href: '/health', hrefLabel: 'Voir la page Santé' })
  }, [professionals.isError, professionals.error, toast])

  return (
    <section>
      <PageHeader
        title="Professionnels"
        subtitle={professionals.data ? `${professionals.data.total} professionnel${professionals.data.total > 1 ? 's' : ''}` : undefined}
        actions={
          <Link to="/professionals/new">
            <Button variant="primary">Nouveau professionnel</Button>
          </Link>
        }
      />
      <ListToolbar
        search={{
          value: q,
          onChange: (value) => {
            setQ(value)
            setOffset(0)
          },
          placeholder: 'Rechercher un nom, un savoir-faire, un contact…',
        }}
        filters={
          <>
            <FilterSelect
              label="Prestation"
              all="Toutes"
              value={kind}
              onChange={(value) => {
                setKind(value)
                setOffset(0)
              }}
              options={prestations.options}
            />
            <FilterSelect
              label="Savoir-faire"
              value={specialty}
              onChange={(value) => {
                setSpecialty(value)
                setOffset(0)
              }}
              options={(specialties.data ?? []).map((s) => ({ value: s, label: s }))}
            />
          </>
        }
        archived={{
          value: includeArchived,
          onChange: (value) => {
            setIncludeArchived(value)
            setOffset(0)
          },
        }}
      />
      <TableCard
        label="Professionnels"
        caption="Liste des professionnels"
        columns={columns}
        rows={professionals.data?.items}
        rowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/professionals/${m.id}`)}
        loading={professionals.isPending}
        error={professionals.isError ? { title: 'Impossible de charger les professionnels', message: professionals.error.message } : null}
        empty={q ? 'Aucun professionnel ne correspond.' : 'Aucun professionnel pour l’instant.'}
        page={professionals.data ? { offset, limit: LIMIT, total: professionals.data.total, onChange: setOffset } : undefined}
      />
    </section>
  )
}
