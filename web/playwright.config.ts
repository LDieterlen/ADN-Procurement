// Two end-to-end journeys (ARCHITECTURE §7, step 9) against a real API on a throwaway data dir.
// API on 8001 and Vite on 5181 so a developer's own servers (8000 / 5180) are never touched.
// Run: `npm run e2e` (browsers under ~/.persist/ms-playwright, see package.json).
import { defineConfig } from '@playwright/test'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const E2E_DATA_DIR = join(homedir(), '.persist', '.ffe-tests', 'e2e-data')
export const E2E_BACKUP_DIR = join(homedir(), '.persist', '.ffe-tests', 'e2e-backups')
const API_PORT = 8001
const WEB_PORT = 5181

const apiEnv = {
  UV_PROJECT_ENVIRONMENT: join(process.cwd(), '..', 'api', '.venv'),
  UV_FROZEN: '0',
  FFE_DATA_DIR: E2E_DATA_DIR,
  FFE_BACKUP_DIR: E2E_BACKUP_DIR,
  FFE_PORT: String(API_PORT),
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${WEB_PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node ../web/e2e/start-api.mjs',
      cwd: join(process.cwd(), '..', 'api'),
      url: `http://127.0.0.1:${API_PORT}/api/v1/health`,
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: `http://127.0.0.1:${WEB_PORT}`,
      env: { FFE_API_PORT: String(API_PORT), VITE_PORT: String(WEB_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
