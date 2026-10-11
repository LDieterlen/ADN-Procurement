// Playwright webServer wrapper: fresh throwaway data (the two e2e directories are test fixtures,
// never real data: both names are checked), then the real API. Playwright starts the web servers
// before globalSetup, so the cleanup has to live here.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

for (const dir of [process.env.FFE_DATA_DIR, process.env.FFE_BACKUP_DIR]) {
  if (!dir || !dir.includes('/.ffe-tests/e2e-')) throw new Error(`Dossier e2e inattendu : ${dir}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}

const child = spawn('uv', ['run', 'ffe', 'serve'], { stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
