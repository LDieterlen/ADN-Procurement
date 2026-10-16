// Parcours 1 (ADR-0013) : type → client → projet avec budget → localisation ×12 → article libre 450 €
// → code CHA-LUD-01, montant et reste venus du serveur, fiches PDF émises (mis à jour le 2026-10-15 :
// page « Listes », champ « Nom », retour au projet après création ; diffusion choisie dans la fenêtre « Fiches PDF », ADR-0022).
import { expect, test } from '@playwright/test'

test('créer un projet, une localisation et un article : les totaux viennent du serveur', async ({ page }) => {
  await page.goto('/categories/new')
  await page.getByLabel('Nom').fill('Luminaire décoratif')
  await page.getByLabel('Code').fill('LUD')
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByRole('heading', { name: 'Listes' })).toBeVisible()

  await page.goto('/clients/new')
  await page.getByLabel('Nom').fill('Hôtel X SA')
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByRole('table', { name: 'Liste des clients' })).toContainText('Hôtel X SA')

  await page.goto('/projects/new')
  await page.getByLabel('Nom', { exact: true }).fill('Rénovation')
  await page.getByLabel('Client', { exact: true }).selectOption({ label: 'Hôtel X SA' })
  await page.getByLabel('Budget global HT (€)').fill('50 000')
  await page.getByRole('button', { name: 'Créer le projet' }).click()
  await expect(page.getByRole('heading', { name: 'Rénovation' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Synthèse budget' })).toContainText('50 000,00 €')

  await page.getByRole('button', { name: '+ Ajouter une localisation' }).click()
  await page.getByLabel('Code', { exact: true }).fill('CHA')
  await page.getByLabel('Nom', { exact: true }).fill('Chambre typo A')
  await page.getByLabel('Zone', { exact: true }).fill('Hébergement')
  await page.getByLabel('Nombre', { exact: true }).fill('12')
  await page.getByRole('button', { name: 'Ajouter la localisation' }).click()
  await expect(page.getByRole('table', { name: 'Localisations du projet' })).toContainText('Chambre typo A')

  await page.getByRole('link', { name: '+ Ajouter un article' }).click()
  await expect(page.getByRole('heading', { name: 'Nouvel article' })).toBeVisible()
  await page.getByLabel('Nom', { exact: true }).fill('Applique de chevet')
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'LUD — Luminaire décoratif' })
  await page.getByLabel('Prix unitaire HT', { exact: true }).fill('450')
  await page.getByRole('region', { name: 'Implantation' }).getByLabel('Localisation').selectOption({ label: 'CHA — Chambre typo A (×12)' })
  await page.getByRole('button', { name: "Créer l'article" }).click()
  // Back on the project: 450,00 € × 1 × 12 = 5 400,00 € HT, calculé par le serveur.
  await expect(page.getByRole('row', { name: 'CHA-LUD-01 dans CHA' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Synthèse budget' })).toContainText('5 400,00 €')
  await expect(page.getByRole('region', { name: 'Synthèse budget' })).toContainText('44 600,00 €')

  // « Fiches PDF »: the first official diffusion (ADR-0022), downloaded.
  await page.getByRole('button', { name: 'Fiches PDF' }).click()
  const dialog = page.getByRole('dialog', { name: 'Fiches PDF' })
  await dialog.getByLabel(/Diffusion officielle/).check()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Diffuser (diffusion 1)' }).click()
  expect((await download).suggestedFilename()).toMatch(/-fiches-diffusion1-\d{4}-\d{2}-\d{2}\.pdf$/)
  await expect(page.getByText('Diffusion 1', { exact: true }).first()).toBeVisible()

  // The article page shows the same server amount.
  await page.getByRole('row', { name: 'CHA-LUD-01 dans CHA' }).click()
  await expect(page.getByRole('heading', { name: 'Applique de chevet' })).toBeVisible()
  await expect(page.getByText('5 400,00 € HT')).toBeVisible()
})
