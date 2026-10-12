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

  await page.getByRole('button', { name: 'Prescription' }).click()
  await page.getByRole('button', { name: 'Ajouter un produit' }).click()
  const drawer = page.getByRole('dialog', { name: 'Ajouter un produit' })
  await drawer.getByRole('button', { name: 'Ligne libre' }).click()
  await drawer.getByLabel('Désignation').fill('Applique de chevet')
  await drawer.getByLabel('Typologie').selectOption({ label: 'LUM — Luminaires' })
  await drawer.getByLabel('Localisation').selectOption('wall')
  await drawer.getByLabel('Prix unitaire HT').fill('450')
  await drawer.getByLabel('Zone', { exact: true }).selectOption({ label: 'CHA — Chambre type A (×12)' })
  await drawer.getByRole('button', { name: 'Ajouter', exact: true }).click()
  const lines = page.getByRole('table', { name: 'Lignes du projet' })
  await expect(lines.getByRole('row', { name: 'CHA-LUM-01 dans CHA' })).toBeVisible()
  // 450,00 € × 1 par zone × 12 clés = 5 400,00 € HT, lu dans le bandeau budget (synthèse serveur).
  await expect(lines).toContainText('Mur')
  await expect(page.getByRole('region', { name: 'Synthèse budget' })).toContainText('Prescrit HT 5 400,00 €')
})
