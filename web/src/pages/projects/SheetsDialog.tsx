// « Fiches PDF » (ADR-0022): an official diffusion or a working document, the paper (tinted for the
// screen, white for a printer, or both), options included or not; advanced options leave the agency's
// name, its logo or the « Racoon Studio » mark off (2026-10-16). The PDFs issued are downloaded.
import { useState } from 'react'
import { Checkbox } from '../../components/forms/Checkbox'
import { isApiError } from '../../api/errors'
import { fileContentUrl } from '../../api/queries/file'
import type { ProjectRead } from '../../api/queries/project'
import { useIssueSheets, type SheetsIssue } from '../../api/queries/projectFile'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Segmented } from '../../components/ui/Segmented'
import { useToast } from '../../components/ui/Toast'

type PaperChoice = 'color' | 'white' | 'both'
const PAPERS: { value: PaperChoice; label: string }[] = [
  { value: 'color', label: 'Couleur' },
  { value: 'white', label: 'Blanc' },
  { value: 'both', label: 'Les deux' },
]

const ADVANCED: { key: 'hideAgencyName' | 'hideStudio' | 'hideAgencyLogo'; label: string }[] = [
  { key: 'hideAgencyName', label: 'Masquer le nom' },
  { key: 'hideStudio', label: 'Masquer Racoon Studio' },
  { key: 'hideAgencyLogo', label: 'Masquer le logo' },
]

export function SheetsDialog({ project, readOnly, open, onClose }: { project: ProjectRead; readOnly: boolean; open: boolean; onClose: () => void }) {
  const issue = useIssueSheets()
  const toast = useToast()
  const [diffuse, setDiffuse] = useState(false)
  const [paper, setPaper] = useState<PaperChoice>('color')
  const [includeOptions, setIncludeOptions] = useState(false)
  const [hide, setHide] = useState({ hideAgencyName: false, hideStudio: false, hideAgencyLogo: false })
  const next = project.diffusionCount + 1

  async function generate() {
    const data: SheetsIssue = { diffuse, papers: paper === 'both' ? ['color', 'white'] : [paper], includeOptions, ...hide }
    try {
      const files = await issue.mutateAsync({ projectId: project.id, data })
      // One after the other: two downloads at the same instant are often blocked by the browser.
      files.forEach((file, index) => {
        window.setTimeout(() => {
          const link = document.createElement('a')
          link.href = fileContentUrl(file.fileId)
          link.download = file.originalName
          link.click()
        }, index * 600)
      })
      toast.show({ kind: 'success', message: diffuse ? `Diffusion ${next} faite.` : 'Fiches émises (document de travail).' })
      onClose()
    } catch (error) {
      toast.show({ kind: 'error', message: isApiError(error) ? error.message : String(error), persistent: true })
    }
  }

  return (
    <Modal open={open} title="Fiches PDF" onClose={onClose}>
      <div className="space-y-4 text-sm">
        {readOnly ? (
          <p className="text-[12.5px] text-ink-3">Projet en lecture seule : les fiches sortent en document de travail, sans diffusion.</p>
        ) : (
          <Checkbox
            checked={diffuse}
            onChange={(event) => setDiffuse(event.target.checked)}
            label={
              <>
                <span className="font-medium">Diffusion officielle</span> (diffusion {next})
              </>
            }
            hint={
              project.diffusionCount === 0
                ? 'Première diffusion : pas d’indice. Ensuite les codes sont figés et un article diffusé ne se supprime plus (on l’annule).'
                : 'Les codes dont le produit a changé (option retenue) passent à la lettre suivante, marqués « Modifié » ; les codes ajoutés partent sans indice, marqués « Nouveau » ; les autres ne bougent pas.'
            }
          />
        )}
        {!diffuse && <p className="text-[12.5px] text-ink-3">Sans diffusion : document de travail, aucun indice ne change.</p>}
        <div>
          <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Papier</div>
          <Segmented label="Papier" value={paper} onChange={setPaper} options={PAPERS} />
        </div>
        <Checkbox label="Inclure les options" checked={includeOptions} onChange={(event) => setIncludeOptions(event.target.checked)} />
        <details className="rounded-[7px] border border-line px-3 py-2">
          <summary className="cursor-pointer text-[12.5px] font-medium text-ink-2">Options avancées</summary>
          <div className="mt-2 space-y-2">
            {ADVANCED.map(({ key, label }) => (
              <Checkbox key={key} label={label} checked={hide[key]} onChange={(event) => setHide((prev) => ({ ...prev, [key]: event.target.checked }))} />
            ))}
          </div>
        </details>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" onClick={() => void generate()} disabled={issue.isPending}>
          {issue.isPending ? 'Génération…' : diffuse ? `Diffuser (diffusion ${next})` : 'Générer'}
        </Button>
      </div>
    </Modal>
  )
}
