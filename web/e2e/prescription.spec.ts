// Parcours 1 (ADR-0013) : type → client → projet avec budget → localisation ×12 → article libre 450 €
// → code CHA-LUD-01, montant et reste venus du serveur, fiches PDF émises.
import { expect, test } from '@playwright/test'

test('créer un projet, une localisation et un article : les totaux viennent du serveur', async ({ page }) => {
  await page.goto('/categories/new')
  await page.getByLabel('Nom').fill('Luminaire décoratif')
  await page.getByLabel('Code').fill('LUD')
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByRole('heading', { name: 'Types de produit' })).toBeVisible()

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

  await page.getByLabel('Désignation', { exact: true }).fill('Applique de chevet')
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'LUD — Luminaire décoratif' })
  await page.getByLabel('Localisation', { exact: true }).selectOption({ label: 'CHA — Chambre typo A (×12)' })
  await page.getByRole('button', { name: "Ajouter l'article" }).click()
  const articles = page.getByRole('table', { name: 'Articles du projet' })
  await expect(articles.getByRole('row', { name: 'CHA-LUD-01 dans CHA' })).toBeVisible()

  await articles.getByRole('row', { name: 'CHA-LUD-01 dans CHA' }).click()
  await expect(page.getByRole('heading', { name: 'Applique de chevet' })).toBeVisible()
  await page.getByLabel('Prix unitaire HT', { exact: true }).fill('450')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Article enregistré.')).toBeVisible()
  // 450,00 € × 1 × 12 = 5 400,00 € HT, calculé par le serveur.
  await expect(page.getByText('5 400,00 € HT')).toBeVisible()

  await page.getByRole('link', { name: 'Retour au projet' }).click()
  await expect(page.getByRole('region', { name: 'Synthèse budget' })).toContainText('5 400,00 €')
  await expect(page.getByRole('region', { name: 'Synthèse budget' })).toContainText('44 600,00 €')

  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Fiches PDF' }).click()
  expect((await download).suggestedFilename()).toMatch(/-fiches-A-\d{4}-\d{2}-\d{2}\.pdf$/)
})
