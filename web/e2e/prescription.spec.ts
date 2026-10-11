// Parcours 1 : catégorie → client → projet → zone ×12 → ligne libre 450 € → totaux serveur affichés.
import { expect, test } from '@playwright/test'

test('créer un projet, une zone et une ligne : les totaux viennent du serveur', async ({ page }) => {
  await page.goto('/categories/new')
  await page.getByLabel('Nom').fill('Luminaires')
  await page.getByLabel('Code').fill('LUM')
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByRole('heading', { name: 'Catégories' })).toBeVisible()

  await page.goto('/clients/new')
  await page.getByLabel('Nom').fill('Hôtel X SA')
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByRole('table', { name: 'Liste des clients' })).toContainText('Hôtel X SA')

  await page.goto('/projects/new')
  await page.getByLabel('Nom').fill('Rénovation')
  await page.getByLabel('Client').selectOption({ label: 'Hôtel X SA' })
  await page.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByText(/^2026-001$/)).toBeVisible()

  await page.getByRole('button', { name: 'Zones' }).click()
  await page.getByRole('button', { name: 'Ajouter une zone' }).click()
  await page.getByLabel('Code').fill('CHA')
  await page.getByLabel('Nom').fill('Chambre type A')
  await page.getByLabel('Multiplicateur').fill('12')
  await page.getByRole('button', { name: 'Ajouter' }).click()
  await expect(page.getByRole('table', { name: 'Zones du projet' })).toContainText('Chambre type A')

  await page.getByRole('button', { name: 'Lignes' }).click()
  await page.getByRole('button', { name: 'Ligne libre' }).click()
  await page.getByLabel('Désignation').fill('Applique de chevet')
  await page.getByLabel('Catégorie').selectOption({ label: 'LUM — Luminaires' })
  await page.getByLabel('Prix unitaire HT').fill('450')
  await page.getByLabel('Zone', { exact: true }).selectOption({ label: 'CHA — Chambre type A (×12)' })
  await page.getByRole('button', { name: 'Ajouter' }).click()
  const lines = page.getByRole('table', { name: 'Lignes du projet' })
  await expect(lines.getByRole('row', { name: 'LUM-001 dans CHA' })).toBeVisible()
  // 450,00 € × 1 par zone × 12 clés = 5 400,00 € HT ; TVA 20 % = 1 080,00 ; TTC 6 480,00.
  await expect(lines).toContainText('5 400,00')
  await expect(lines).toContainText('TVA 1 080,00 · TTC 6 480,00')
})
