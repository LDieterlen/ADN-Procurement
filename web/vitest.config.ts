import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node', // component tests opt in to jsdom with `// @vitest-environment jsdom`
      include: ['tests/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
      // One worker per file costs ~7 s of start-up each on this machine; the tests install and restore
      // their own fake API, so sharing workers is safe.
      isolate: false,
    },
  }),
)
