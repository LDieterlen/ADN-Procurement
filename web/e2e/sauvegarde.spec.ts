// Parcours 2 : Réglages → « Sauvegarder maintenant » → date affichée, copie Windows faite ; Santé la montre aussi.
import { expect, test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { E2E_BACKUP_DIR } from '../playwright.config'

test('sauvegarder depuis les réglages : fichier local, copie vérifiée, date de dernière sauvegarde', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Nom').fill('Atelier X')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Réglages enregistrés.')).toBeVisible()

  const section = page.getByRole('region', { name: 'Sauvegardes' })
  await section.getByRole('button', { name: 'Sauvegarder maintenant' }).click()
  await expect(page.getByText('Sauvegarde faite et copiée.')).toBeVisible()
  await expect(section.getByText(/quick_check ok/)).toBeVisible()
  await expect(section.getByText(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)).toBeVisible()
  const copies = readdirSync(E2E_BACKUP_DIR).filter((name) => /^ffe-\d{8}-\d{6}\.sqlite$/.test(name))
  expect(copies.length).toBeGreaterThanOrEqual(1)

  await page.goto('/health')
  await expect(page.getByText('API OK')).toBeVisible()
  await expect(page.getByText(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)).toBeVisible()
})
